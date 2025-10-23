// server/src/routes/admin.ts
import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { voters, elections, positions, count_jobs } from "../schema";
import { sql, eq } from "drizzle-orm";
import { runStvForPosition } from "../stv";

const router = express.Router();
const upload = multer({ dest: path.join(process.cwd(), "tmp") });

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

router.post("/import-voters/:electionId", upload.single("file"), async (req, res) => {
  try {
    const electionId = req.params.electionId;
    if (!electionId) return res.status(400).json({ error: "Missing electionId in params" });
    if (!req.file) return res.status(400).json({ error: "CSV file required (form field name: file)" });

    const filePath = req.file.path;
    const raw = await fs.readFile(filePath, "utf8");
    type VoterCsvRow = {
      name?: string;
      full_name?: string;
      student_id?: string;
      studentNumber?: string;
      email?: string;
    };

    // Remove BOM if present
    const cleanRaw = raw.replace(/^\uFEFF/, '');
    const rows = parse(cleanRaw, { columns: true, skip_empty_lines: true }) as VoterCsvRow[];

    const tokensForAdmin: { email?: string; student_id?: string; token: string; prefilled_url: string }[] = [];

    // Get the base URL for generating prefilled URLs
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    for (const r of rows) {
      const token = uuidv4();
      const fingerprint = crypto.createHash("sha256").update(token).digest("hex");
      const tokenHash = await bcrypt.hash(token, SALT_ROUNDS);
      
      // Generate the prefilled URL
      const prefilledUrl = `${baseUrl}/direct/${electionId}/${token}`;

      await db.insert(voters).values({
        id: uuidv4(),
        election_id: electionId,
        full_name: r.name ?? r.full_name ?? null,
        student_id: r.student_id ?? r.studentNumber ?? null,
        email: r.email ?? null,
        token_hash: tokenHash,
        token_fingerprint: fingerprint,
        real_token: token,
        prefilled_url: prefilledUrl,
      }).returning();

      const pushItem: { email?: string; student_id?: string; token: string; prefilled_url: string } = { 
        token, 
        prefilled_url: prefilledUrl 
      };
      if (r.email) pushItem.email = r.email;
      const studentId = r.student_id ?? r.studentNumber;
      if (studentId) pushItem.student_id = studentId;
      tokensForAdmin.push(pushItem);
    }

    await fs.unlink(filePath);
    return res.json({ success: true, tokens: tokensForAdmin });
  } catch (err: any) {
    console.error("import-voters error:", err);
    return res.status(500).json({ error: err.message || "Failed to import voters" });
  }
});

router.post("/elections/:electionId/close", async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const { adminId } = req.body;
    
    if (!electionId) {
      return res.status(400).json({ error: "Missing electionId" });
    }

    const [updatedElection] = await db
      .update(elections)
      .set({ status: 'closed' })
      .where(eq(elections.id, electionId))
      .returning();

    if (!updatedElection) {
      return res.status(404).json({ error: "Election not found" });
    }

    const electionPositions = await db
      .select()
      .from(positions)
      .where(eq(positions.election_id, electionId));

    const jobs = [];
    for (const position of electionPositions) {
      const jobData: any = {
        id: uuidv4(),
        election_id: electionId,
        position_id: position.id,
        method: "STV",
      };
      
      if (adminId && adminId !== 'admin' && adminId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        jobData.started_by = adminId;
      }
      
      const [job] = await db.insert(count_jobs).values(jobData).returning();

      if (job) {
        jobs.push(job);
        
        (async () => {
          try {
            await runStvForPosition(job.id, electionId, position.id, new Date().toISOString());
          } catch (e) {
            console.error(`Background STV job error for position ${position.id}:`, e);
          }
        })();
      }
    }

    res.json({ 
      success: true, 
      election: updatedElection,
      jobsCreated: jobs.length,
      jobs 
    });
  } catch (err: any) {
    console.error("close-election error:", err);
    res.status(500).json({ error: err.message || "Failed to close election" });
  }
});

router.get("/elections/:electionId/voters", async (req, res) => {
  try {
    const electionId = req.params.electionId;
    if (!electionId) return res.status(400).json({ error: "Missing electionId" });

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(voters)
      .where(eq(voters.election_id, electionId));

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get paginated voters
    const votersList = await db
      .select({
        id: voters.id,
        full_name: voters.full_name,
        student_id: voters.student_id,
        email: voters.email,
        token_used_at: voters.token_used_at,
        created_at: voters.created_at,
        token_fingerprint: voters.token_fingerprint,
        real_token: voters.real_token,
        prefilled_url: voters.prefilled_url
      })
      .from(voters)
      .where(eq(voters.election_id, electionId))
      .orderBy(voters.created_at)
      .limit(limit)
      .offset(offset);

    res.json({ 
      voters: votersList,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err: any) {
    console.error("get-voters error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch voters" });
  }
});

router.get("/elections/:electionId/voters/download", async (req, res) => {
  try {
    const electionId = req.params.electionId;
    if (!electionId) return res.status(400).json({ error: "Missing electionId" });

    const votersList = await db
      .select({
        full_name: voters.full_name,
        student_id: voters.student_id,
        email: voters.email,
        token_used_at: voters.token_used_at,
        created_at: voters.created_at,
        token_fingerprint: voters.token_fingerprint,
        real_token: voters.real_token,
        prefilled_url: voters.prefilled_url
      })
      .from(voters)
      .where(eq(voters.election_id, electionId))
      .orderBy(voters.created_at);

    const headers = ['name', 'student_id', 'email', 'token', 'prefilled_url', 'voted', 'voted_at', 'created_at'];
    const csvRows = votersList.map((voter: any) => [
      voter.full_name || '',
      voter.student_id || '',
      voter.email || '',
      voter.real_token || '',
      voter.prefilled_url || '',
      voter.token_used_at ? 'Yes' : 'No',
      voter.token_used_at ? new Date(voter.token_used_at).toISOString() : '',
      new Date(voter.created_at).toISOString()
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map((row: any) => row.map((field: any) => `"${field}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="voters-${electionId}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    console.error("download-voters error:", err);
    res.status(500).json({ error: err.message || "Failed to download voters" });
  }
});

export default router;
