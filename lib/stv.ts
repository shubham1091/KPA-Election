// server/src/stv.ts
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

// Use Neon serverless driver for better Vercel compatibility
const sql = neon(process.env.DATABASE_URL!);

/**
 * Deterministic RNG based on seed
 */
function seededRandom(seed?: string) {
  const s = seed ?? crypto.randomBytes(16).toString("hex");
  let h = crypto.createHash("sha256").update(s).digest();
  let idx = 0;
  return () => {
    // Sip out a 32-bit integer then convert to [0,1)
    if (idx + 4 > h.length) {
      h = crypto.createHash("sha256").update(h).digest();
      idx = 0;
    }
    const val = h.readUInt32BE(idx);
    idx += 4;
    // JS bitwise converts to signed 32 int; convert to unsigned
    const unsigned = val >>> 0;
    return unsigned / 2 ** 32;
  };
}

/**
 * Run STV (Droop quota) for a given job + position.
 *
 * This implementation is for single-seat elections ONLY.
 * Writes round snapshots to count_events and updates count_jobs with final summary.
 *
 * @param jobId string - id of count_jobs row
 * @param electionId string
 * @param positionId string
 * @param seed optional string - deterministic seed for tie-breaks
 */
export async function runStvForPosition(
  jobId: string,
  electionId: string,
  positionId: string,
  seed?: string
) {
  try {
    // 1) fetch candidates for position (not withdrawn)
    const candRes = await sql`SELECT id, display_name FROM candidates WHERE position_id = ${positionId} AND election_id = ${electionId} AND withdrawn = false`;
    const candidates = candRes.map((r) => ({ id: r.id as string, name: r.display_name as string }));
    if (candidates.length === 0) {
      // nothing to count
      await sql`UPDATE count_jobs SET status = 'failed', finished_at = NOW(), result_summary = ${JSON.stringify({ error: "no candidates" })} WHERE id = ${jobId}`;
      return;
    }

    // 2) fetch ballots and build preference arrays for this position
    // We want for each ballot: ordered candidate ids by rank for this position only
    const ballotsRes = await sql`SELECT b.id as ballot_id, br.candidate_id, br.rank
       FROM ballots b
       JOIN ballot_rankings br ON br.ballot_id = b.id
       WHERE b.election_id = ${electionId} AND br.position_id = ${positionId}
       ORDER BY b.id, br.rank`;

    // build map ballot_id -> ordered array of candidate ids
    const ballotMap = new Map<string, string[]>();
    for (const row of ballotsRes) {
      const bid = row.ballot_id as string;
      const cid = row.candidate_id as string | undefined;
      if (!cid) continue; // skip malformed row
      if (!ballotMap.has(bid)) ballotMap.set(bid, []);
      ballotMap.get(bid)!.push(cid);
    }

    // Only keep ballots which have at least one preference in this position
    const ballotsList = Array.from(ballotMap.entries()).map(([id, prefs]) => ({ id, prefs }));

    const totalBallots = ballotsList.length;
    if (totalBallots === 0) {
      await sql`UPDATE count_jobs SET status = 'failed', finished_at = NOW(), result_summary = ${JSON.stringify({ error: "no ballots" })} WHERE id = ${jobId}`;
      return;
    }

    // Droop quota: floor(total/2) + 1 for single-seat
    const quota = Math.floor(totalBallots / 2) + 1;

    // active candidates set
    const active = new Set(candidates.map((c) => c.id));
    let elected: string | null = null;
    const eliminated: string[] = [];

    // ballot state: for each ballot index, track pointer to current preference index
    const ballotPointers = new Map<string, number>(); // ballotId -> pointer idx
    for (const b of ballotsList) ballotPointers.set(b.id, 0);

    // prepare RNG for tie-breaks
    const rngSeed = seed ?? crypto.randomBytes(16).toString("hex");

    type RoundData = {
      round: number
      votes?: Record<string, number>
      tallies?: Record<string, number>
      eliminated?: string
      elected?: string
      transfers?: Array<{ from: string; to: string | null; ballotId: string }>
      quota?: number
      exhausted?: number
      action?: {
        type: 'elect' | 'eliminate'
        winner?: string
        eliminated?: string
        transfers?: Array<{ from: string; to: string | null; ballotId: string }>
      }
    }

    const rounds: RoundData[] = [];
    let roundNumber = 0;
    const MAX_ROUNDS = 1000; // Safety limit to prevent infinite loops

    // helper: compute current tallies
    const computeTallies = () => {
      const tallies = new Map<string, number>();
      for (const c of active) tallies.set(c, 0);
      let exhaustedCount = 0;
      for (const b of ballotsList) {
        const prefs = b.prefs;
        let ptr = ballotPointers.get(b.id) ?? 0;
        // advance pointer until we find an active candidate or exhaust
        while (ptr < prefs.length && !active.has(prefs[ptr])) ptr++;
        ballotPointers.set(b.id, ptr);
        if (ptr >= prefs.length) {
          exhaustedCount++;
        } else {
          const cid = prefs[ptr];
          if (cid) tallies.set(cid, (tallies.get(cid) ?? 0) + 1);
        }
      }
      return { tallies, exhaustedCount };
    };

    // main loop
    while (!elected && active.size > 0 && roundNumber < MAX_ROUNDS) {
      roundNumber++;
      const { tallies, exhaustedCount } = computeTallies();

      // convert tallies map to plain object
      const talliesObj: Record<string, number> = {};
      for (const [cid, v] of tallies.entries()) talliesObj[cid] = v;

      // check winner
      let winner: string | null = null;
      for (const [cid, v] of tallies.entries()) {
        if (v >= quota) {
          winner = cid;
          break;
        }
      }

      if (winner) {
        elected = winner;
        active.delete(winner);
        rounds.push({
          round: roundNumber,
          tallies: talliesObj,
          exhausted: exhaustedCount,
          action: { type: "elect", winner },
        });
        break;
      }

      // If only one candidate left, they win by default (prevents infinite loop)
      if (active.size === 1) {
        const lastCandidate = Array.from(active)[0];
        if (lastCandidate) {
          elected = lastCandidate;
          active.delete(lastCandidate);
          rounds.push({
            round: roundNumber,
            tallies: talliesObj,
            exhausted: exhaustedCount,
            action: { type: "elect", winner: lastCandidate },
          });
          break;
        }
      }

      // No winner: eliminate candidate(s) with min votes
      let minVotes = Infinity;
      for (const v of tallies.values()) if (v < minVotes) minVotes = v;

      // find all candidates with minVotes
      const minCandidates = Array.from(tallies.entries())
        .filter(([, v]) => v === minVotes)
        .map(([cid]) => cid);

      // tie-break if multiple
      let eliminatedThisRound: string;
      if (minCandidates.length === 0) {
        // nothing to eliminate (shouldn't happen) - break to avoid infinite loop
        break;
      }
      if (minCandidates.length === 1) {
        eliminatedThisRound = minCandidates[0]!;
      } else {
        // deterministic tie-break: sort candidate ids, then pick using RNG seeded by seed + roundNumber
        const s = rngSeed + ":" + roundNumber + ":" + positionId;
        const r = seededRandom(s);
        const idx = Math.floor(r() * minCandidates.length);
        eliminatedThisRound = minCandidates[idx]!;
      }

      // perform transfers from eliminated candidate
      const transfers: Array<{ from: string; to: string | null; ballotId: string }> = [];

      // For each ballot currently assigned to eliminated candidate, advance to next active preference
      for (const b of ballotsList) {
        const prefs = b.prefs;
        const ptr = ballotPointers.get(b.id) ?? 0;
        if (ptr < prefs.length && prefs[ptr] === eliminatedThisRound) {
          let newPtr = ptr + 1;
          while (newPtr < prefs.length && !active.has(prefs[newPtr]) && prefs[newPtr] !== eliminatedThisRound) {
            newPtr++;
          }
          ballotPointers.set(b.id, newPtr);
          if (newPtr >= prefs.length) {
            transfers.push({ from: eliminatedThisRound, to: null, ballotId: b.id });
          } else {
            const toCid = prefs[newPtr] ?? null;
            transfers.push({ from: eliminatedThisRound, to: toCid, ballotId: b.id });
          }
        }
      }

      // mark eliminated
      active.delete(eliminatedThisRound);
      eliminated.push(eliminatedThisRound);

      // Save round snapshot
      rounds.push({
        round: roundNumber,
        tallies: talliesObj,
        exhausted: exhaustedCount,
        action: { type: "eliminate", eliminated: eliminatedThisRound, transfers },
      });
    }

    // Safety check: if we hit max rounds without electing anyone
    if (roundNumber >= MAX_ROUNDS && !elected) {
      await sql`UPDATE count_jobs SET status = 'failed', finished_at = NOW(), result_summary = ${JSON.stringify({ error: "Maximum rounds exceeded - possible infinite loop prevented" })} WHERE id = ${jobId}`;
      return;
    }

    // If no one was elected but we exited the loop, elect the last remaining candidate
    if (!elected && active.size > 0) {
      elected = Array.from(active)[0] || null;
    }

    // build result summary
    const resultSummary = {
      winner: elected,
      quota,
      totalBallots,
      rounds: rounds.length,
      seed: rngSeed,
    };

    // store each round into count_events
    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      const roundId = uuidv4();
      await sql`INSERT INTO count_events (id, job_id, round_number, payload, created_at)
         VALUES (${roundId}, ${jobId}, ${r.round}, ${JSON.stringify(r)}, NOW())`;
    }

    // update job row
    await sql`UPDATE count_jobs SET status = 'completed', finished_at = NOW(), result_summary = ${JSON.stringify(resultSummary)} WHERE id = ${jobId}`;

    return resultSummary;
  } catch (err) {
    console.error("runStvForPosition error:", err);
    try {
      await sql`UPDATE count_jobs SET status = 'failed', finished_at = NOW(), result_summary = ${JSON.stringify({ error: String(err) })} WHERE id = ${jobId}`;
    } catch (e) {
      console.error("failed to update job status after error:", e);
    }
    throw err;
  }
}
