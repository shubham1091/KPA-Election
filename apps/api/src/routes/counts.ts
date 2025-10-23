// server/src/routes/counts.ts (updated snippet)
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { count_jobs } from "../schema";
import { runStvForPosition } from "../stv"; // <-- import our STV runner

const router = express.Router();

router.post("/start", async (req, res) => {
  try {
    const { electionId, positionId, startedBy, method } = req.body;
    if (!electionId || !positionId || !startedBy) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // create job row
    const [job] = await db.insert(count_jobs).values({
      id: uuidv4(),
      election_id: electionId,
      position_id: positionId,
      started_by: startedBy,
      method: method ?? "STV",
    }).returning();

    if (!job) {
      console.error("Failed to create count job");
      return res.status(500).json({ error: "Failed to create job" });
    }

    // run STV in background (non-blocking)
    (async () => {
      try {
        await runStvForPosition(job.id, electionId, positionId, (new Date()).toISOString());
      } catch (e) {
        console.error("Background STV job error:", e);
      }
    })();

    res.json({ success: true, job });
  } catch (err: any) {
    console.error("start-count error:", err);
    res.status(500).json({ error: err.message || "Failed to start count" });
  }
});

export default router;
