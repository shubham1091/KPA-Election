// server/src/submitBallot.ts
import 'dotenv/config';
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { DB as drizzleDb } from "./db"; // if you need drizzle for inserts; not required
import {
  ballots,
  ballot_rankings,
  voters,
  positions,
  candidates,
} from "./schema";
import { sql } from "drizzle-orm";

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
 * submitBallotAtomic
 * @param electionId string
 * @param token string - plaintext token from the voter's link
 * @param rankings Record<positionId, candidateId[]>
 */
export async function submitBallotAtomic(
  electionId: string,
  token: string,
  rankings: Record<string, string[]>,
  meta?: any
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) fetch candidate voters rows for this election
    // We fetch all voters for the election and compare tokens in app memory.
    // (Optimization: you can store token_fingerprint to query directly later.)
    const res = await client.query(
      `SELECT id, token_hash, token_used_at FROM voters WHERE election_id = $1`,
      [electionId]
    );

    if (res.rowCount === 0) {
      throw new Error("No voters for this election");
    }

    let matchedVoter: { id: string; token_hash: string; token_used_at: Date | null } | null = null;
    for (const row of res.rows) {
      const ok = await bcrypt.compare(token, row.token_hash);
      if (ok) {
        matchedVoter = { id: row.id, token_hash: row.token_hash, token_used_at: row.token_used_at };
        break;
      }
    }

    if (!matchedVoter) {
      await client.query("ROLLBACK");
      throw new Error("Invalid token");
    }

    // 2) lock the matched voter row for update (prevents race)
    const lockRes = await client.query(
      `SELECT token_used_at FROM voters WHERE id = $1 FOR UPDATE`,
      [matchedVoter.id]
    );

    const currentUsedAt = lockRes.rows[0]?.token_used_at;
    if (currentUsedAt) {
      await client.query("ROLLBACK");
      throw new Error("Token already used");
    }

    // 3) Validate rankings completeness server-side:
    //    - ensure every position for the election is present
    //    - ensure each candidate list length matches actual candidates count for that position
    // You can do basic checks here:
    for (const [positionId, candidateList] of Object.entries(rankings)) {
      // fetch candidate ids for this position
      const cRes = await client.query(
        `SELECT id FROM candidates WHERE position_id = $1 AND election_id = $2 AND withdrawn = false`,
        [positionId, electionId]
      );
      const actualCandidateIds = cRes.rows.map((r: any) => r.id);

      // quick checks: same length and every provided id exists exactly once
      if (candidateList.length !== actualCandidateIds.length) {
        await client.query("ROLLBACK");
        throw new Error(`Incomplete ranking for position ${positionId}`);
      }
      // ensure each provided candidate id belongs to the position
      const missing = candidateList.filter((cid) => !actualCandidateIds.includes(cid));
      if (missing.length) {
        await client.query("ROLLBACK");
        throw new Error(`Invalid candidate ids in ranking for position ${positionId}`);
      }
      // ensure no duplicates
      const uniq = new Set(candidateList);
      if (uniq.size !== candidateList.length) {
        await client.query("ROLLBACK");
        throw new Error(`Duplicate candidate in ranking for position ${positionId}`);
      }
    }

    // 4) Create ballot row
    const ballotId = uuidv4();
    await client.query(
      `INSERT INTO ballots (id, election_id, submitted_at, meta) VALUES ($1, $2, NOW(), $3)`,
      [ballotId, electionId, meta ?? null]
    );

    // 5) Insert rankings
    // Use a single prepared statement per ranking insert
    const insertRankingText = `INSERT INTO ballot_rankings (id, ballot_id, position_id, candidate_id, rank)
                               VALUES ($1, $2, $3, $4, $5)`;
    for (const [positionId, candidateList] of Object.entries(rankings)) {
      for (let i = 0; i < candidateList.length; i++) {
        const candidateId = candidateList[i];
        await client.query(insertRankingText, [uuidv4(), ballotId, positionId, candidateId, i + 1]);
      }
    }

    // 6) mark token as used (atomic because we hold the lock)
    await client.query(`UPDATE voters SET token_used_at = NOW() WHERE id = $1`, [matchedVoter.id]);

    // 7) commit transaction
    await client.query("COMMIT");
    return { success: true, ballotId };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (e) {
      // ignore
    }
    throw err;
  } finally {
    client.release();
  }
}
