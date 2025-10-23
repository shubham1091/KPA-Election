// server/src/stv.ts
import 'dotenv/config';
import { Pool } from "pg";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

// Parse DATABASE_URL to ensure password is treated as a string
const parseDatabaseUrl = (url: string) => {
  const parsed = new URL(url);
  
  // Determine if SSL is needed (for cloud databases like Neon, Supabase, etc.)
  const needsSSL = parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
  
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 5432,
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password || '', // Ensure password is always a string, even if empty
    ssl: needsSSL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  };
};

const pool = new Pool(parseDatabaseUrl(process.env.DATABASE_URL!));

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
  const client = await pool.connect();
  try {
    // 1) fetch candidates for position (not withdrawn)
    const candRes = await client.query(
      `SELECT id, display_name FROM candidates WHERE position_id = $1 AND election_id = $2 AND withdrawn = false`,
      [positionId, electionId]
    );
    const candidates = candRes.rows.map((r: { id: string; display_name: string }) => ({ id: r.id, name: r.display_name }));
    if (candidates.length === 0) {
      // nothing to count
      await client.query(
        `UPDATE count_jobs SET status = 'failed', finished_at = NOW(), result_summary = $1 WHERE id = $2`,
        [JSON.stringify({ error: "no candidates" }), jobId]
      );
      return;
    }

    // 2) fetch ballots and build preference arrays for this position
    // We want for each ballot: ordered candidate ids by rank for this position only
    const ballotsRes = await client.query(
      `SELECT b.id as ballot_id, br.candidate_id, br.rank
       FROM ballots b
       JOIN ballot_rankings br ON br.ballot_id = b.id
       WHERE b.election_id = $1 AND br.position_id = $2
       ORDER BY b.id, br.rank`,
      [electionId, positionId]
    );

    // build map ballot_id -> ordered array of candidate ids
    const ballotMap = new Map<string, string[]>();
    for (const row of ballotsRes.rows) {
      const bid: string = row.ballot_id;
      const cid: string | undefined = row.candidate_id;
      if (!cid) continue; // skip malformed row
      if (!ballotMap.has(bid)) ballotMap.set(bid, []);
      ballotMap.get(bid)!.push(cid);
    }

    // Only keep ballots which have at least one preference in this position
    const ballotsList = Array.from(ballotMap.entries()).map(([id, prefs]) => ({ id, prefs }));

    const totalBallots = ballotsList.length;
    if (totalBallots === 0) {
      await client.query(
        `UPDATE count_jobs SET status = 'failed', finished_at = NOW(), result_summary = $1 WHERE id = $2`,
        [JSON.stringify({ error: "no ballots" }), jobId]
      );
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
      votes: Record<string, number>
      eliminated?: string
      elected?: string
      transfers?: Array<{ from: string; to: string | null; ballotId: string }>
      quota?: number
      exhausted?: number
    }

    const rounds: RoundData[] = [];
    let roundNumber = 0;

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
    while (!elected && active.size > 0) {
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
      await client.query(
        `INSERT INTO count_events (id, job_id, round_number, payload, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [uuidv4(), jobId, r.round, JSON.stringify(r)]
      );
    }

    // update job row
    await client.query(
      `UPDATE count_jobs SET status = 'completed', finished_at = NOW(), result_summary = $1 WHERE id = $2`,
      [JSON.stringify(resultSummary), jobId]
    );

    return resultSummary;
  } catch (err) {
    console.error("runStvForPosition error:", err);
    try {
      await client.query(`UPDATE count_jobs SET status = 'failed', finished_at = NOW(), result_summary = $1 WHERE id = $2`, [
        JSON.stringify({ error: String(err) }),
        jobId,
      ]);
    } catch (e) {
      console.error("failed to update job status after error:", e);
    }
    throw err;
  } finally {
    client.release();
  }
}
