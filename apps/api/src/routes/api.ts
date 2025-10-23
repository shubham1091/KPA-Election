// server/src/routes/api.ts
import express from "express";
import { db } from "../db";
import { elections, positions, candidates } from "../schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// List all elections
router.get("/elections", async (req, res) => {
  try {
    const rows = await db.select().from(elections);
    res.json(rows);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch elections" });
  }
});

// Get a single election (with positions)
router.get("/elections/:electionId", async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const election = await db.select().from(elections).where(eq(elections.id, electionId));
    if (!election.length) return res.status(404).json({ error: "Election not found" });
    const pos = await db.select().from(positions).where(eq(positions.election_id, electionId));
    res.json({ ...election[0], positions: pos });
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch election" });
  }
});

// List positions for an election
router.get("/elections/:electionId/positions", async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const pos = await db.select().from(positions).where(eq(positions.election_id, electionId));
    res.json(pos);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

// List candidates for a position
router.get("/positions/:positionId/candidates", async (req, res) => {
  try {
    const positionId = req.params.positionId;
    const cands = await db.select().from(candidates).where(eq(candidates.position_id, positionId));
    res.json(cands);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});

// List candidates for an election (all positions)
router.get("/elections/:electionId/candidates", async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const cands = await db.select().from(candidates).where(eq(candidates.election_id, electionId));
    res.json(cands);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});

export default router;
