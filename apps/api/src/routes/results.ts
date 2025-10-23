// server/src/routes/results.ts
import express from "express";
import { db } from "../db";
import { count_jobs, count_events } from "../schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get all count jobs for an election
router.get("/elections/:electionId/results", async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const jobs = await db.select().from(count_jobs).where(eq(count_jobs.election_id, electionId));
    res.json(jobs);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

// Get result summary for a count job
router.get("/results/:jobId", async (req, res) => {
  try {
    const jobId = req.params.jobId;
  const jobs = await db.select().from(count_jobs).where(eq(count_jobs.id, jobId));
  if (!jobs.length) return res.status(404).json({ error: "Job not found" });
  const job = jobs[0];
  if (!job) return res.status(404).json({ error: "Job not found" });
  // result_summary may be null/undefined in DB; return null explicitly when absent
  res.json(job.result_summary ?? null);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch result summary" });
  }
});

// Get all count events (rounds) for a count job
router.get("/results/:jobId/rounds", async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const events = await db.select().from(count_events).where(eq(count_events.job_id, jobId));
    res.json(events.map((e: any) => e.payload));
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch count rounds" });
  }
});

export default router;
