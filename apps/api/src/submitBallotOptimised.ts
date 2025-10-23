// server/src/submitBallotOptimized.ts
import 'dotenv/config';
import { Pool } from "pg";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { voters, ballots, ballot_rankings, candidates } from "./schema";
import { DB as db } from "./db";

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
 * Submit ballot using token fingerprint lookup for performance.
 * rankings: Record<positionId, candidateId[]>
 */
export async function submitBallotOptimized(electionId: string, token: string, rankings: Record<string, string[]>, meta?: any) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // compute token fingerprint
    const fingerprint = crypto.createHash("sha256").update(token).digest("hex");

    // find voter by election_id + fingerprint, lock row for update
    const voterRes = await client.query(
      `SELECT id, token_hash, token_used_at FROM voters WHERE election_id = $1 AND token_fingerprint = $2 FOR UPDATE`,
      [electionId, fingerprint]
    );

    if (voterRes.rowCount === 0) {
      await client.query("ROLLBACK");
      throw new Error("Invalid token");
    }

    // there might be multiple rows with same fingerprint in theory if collisions (extremely unlikely)
    // check bcrypt on each and pick the one that matches
    let matchedVoter: any = null;
    for (const row of voterRes.rows) {
      const isOk = await bcrypt.compare(token, row.token_hash);
      if (isOk) {
        matchedVoter = row;
        break;
      }
    }

    if (!matchedVoter) {
      await client.query("ROLLBACK");
      throw new Error("Invalid token");
    }

    if (matchedVoter.token_used_at) {
      await client.query("ROLLBACK");
      throw new Error("Token already used");
    }

    // Validate completeness: ensure each position's candidate count matches supplied ranking length, and candidates belong to position/election
    for (const [positionId, candidateList] of Object.entries(rankings)) {
      const cRes = await client.query(
        `SELECT id FROM candidates WHERE position_id = $1 AND election_id = $2 AND withdrawn = false`,
        [positionId, electionId]
      );
      const actual = cRes.rows.map((r: any) => r.id);
      if (candidateList.length !== actual.length) {
        await client.query("ROLLBACK");
        throw new Error(`Incomplete ranking for position ${positionId}`);
      }
      const missing = candidateList.filter((cid) => !actual.includes(cid));
      if (missing.length) {
        await client.query("ROLLBACK");
        throw new Error(`Invalid candidate ids in ranking for position ${positionId}`);
      }
      if (new Set(candidateList).size !== candidateList.length) {
        await client.query("ROLLBACK");
        throw new Error(`Duplicate candidate in ranking for position ${positionId}`);
      }
    }

    // create ballot
    const ballotId = uuidv4();
    await client.query(
      `INSERT INTO ballots (id, election_id, submitted_at, meta) VALUES ($1, $2, NOW(), $3)`,
      [ballotId, electionId, meta ?? null]
    );

    // insert rankings (batch)
    const insertText = `INSERT INTO ballot_rankings (id, ballot_id, position_id, candidate_id, rank) VALUES ($1, $2, $3, $4, $5)`;
    for (const [positionId, candidateList] of Object.entries(rankings)) {
      for (let i = 0; i < candidateList.length; i++) {
        await client.query(insertText, [uuidv4(), ballotId, positionId, candidateList[i], i + 1]);
      }
    }

    // mark token used
    await client.query(`UPDATE voters SET token_used_at = NOW() WHERE id = $1`, [matchedVoter.id]);

    await client.query("COMMIT");
    return { success: true, ballotId };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}
