// server/src/routes/adminCrud.ts
import express from "express";
import { db } from "../db";
import { elections, positions, candidates, voters, ballots, ballot_rankings, count_jobs, count_events } from "../schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Create election
router.post("/elections", async (req, res) => {
  const { title, description, starts_at, ends_at, status, created_by, config } = req.body;
  
  console.log('Creating election with data:', { title, description, starts_at, ends_at, status, created_by, config });
  
  try {
    // Convert date strings to proper Date objects or null
    const startsAt = starts_at ? new Date(starts_at) : null;
    const endsAt = ends_at ? new Date(ends_at) : null;
    
    console.log('Processed dates:', { startsAt, endsAt });
    
    const [row] = await db.insert(elections).values({
      id: uuidv4(), 
      title, 
      description, 
      starts_at: startsAt, 
      ends_at: endsAt, 
      status, 
      created_by, 
      config
    }).returning();
    
    console.log('Election created successfully:', row);
    res.json(row);
  } catch (err: any) {
    console.error('Failed to create election:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      constraint: err.constraint
    });
    res.status(500).json({ 
      error: "Failed to create election",
      details: err.message,
      code: err.code
    });
  }
});

// Update election
router.put("/elections/:electionId", async (req, res) => {
  const electionId = req.params.electionId;
  try {
    const [row] = await db.update(elections).set(req.body).where(eq(elections.id, electionId)).returning();
    res.json(row);
  } catch (_err) {
    res.status(500).json({ error: "Failed to update election" });
  }
});

// Delete election
router.delete("/elections/:electionId", async (req, res) => {
  const electionId = req.params.electionId;
  try {
    // Delete in reverse dependency order to avoid foreign key constraints
    
    // First delete count events (references count_jobs)
    const electionCountJobs = await db.select({id: count_jobs.id}).from(count_jobs).where(eq(count_jobs.election_id, electionId));
    for (const job of electionCountJobs) {
      await db.delete(count_events).where(eq(count_events.job_id, job.id));
    }
    
    // Delete count jobs (references elections)
    await db.delete(count_jobs).where(eq(count_jobs.election_id, electionId));
    
    // Get all ballots for this election
    const electionBallots = await db.select({id: ballots.id}).from(ballots).where(eq(ballots.election_id, electionId));
    
    // Delete ballot_rankings for these ballots
    for (const ballot of electionBallots) {
      await db.delete(ballot_rankings).where(eq(ballot_rankings.ballot_id, ballot.id));
    }
    
    // Delete ballots
    await db.delete(ballots).where(eq(ballots.election_id, electionId));
    
    // Delete voters
    await db.delete(voters).where(eq(voters.election_id, electionId));
    
    // Delete candidates
    await db.delete(candidates).where(eq(candidates.election_id, electionId));
    
    // Delete positions
    await db.delete(positions).where(eq(positions.election_id, electionId));
    
    // Finally delete the election
    await db.delete(elections).where(eq(elections.id, electionId));
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete election:', err);
    res.status(500).json({ error: "Failed to delete election", details: err.message });
  }
});

// Create position
router.post("/positions", async (req, res) => {
  const { election_id, name, description, seats, sort_order } = req.body;
  try {
    const [row] = await db.insert(positions).values({
      id: uuidv4(), election_id, name, description, seats, sort_order
    }).returning();
    res.json(row);
  } catch (_err) {
    res.status(500).json({ error: "Failed to create position" });
  }
});

// Update position
router.put("/positions/:positionId", async (req, res) => {
  const positionId = req.params.positionId;
  try {
    const [row] = await db.update(positions).set(req.body).where(eq(positions.id, positionId)).returning();
    res.json(row);
  } catch (_err) {
    res.status(500).json({ error: "Failed to update position" });
  }
});

// Delete position
router.delete("/positions/:positionId", async (req, res) => {
  const positionId = req.params.positionId;
  try {
    await db.delete(positions).where(eq(positions.id, positionId));
    res.json({ success: true });
  } catch (_err) {
    res.status(500).json({ error: "Failed to delete position" });
  }
});

// Create candidate
router.post("/candidates", async (req, res) => {
  const { election_id, position_id, display_name, manifesto_link, withdrawn } = req.body;
  try {
    const [row] = await db.insert(candidates).values({
      id: uuidv4(), election_id, position_id, display_name, manifesto_link, withdrawn
    }).returning();
    res.json(row);
  } catch (_err) {
    res.status(500).json({ error: "Failed to create candidate" });
  }
});

// Update candidate
router.put("/candidates/:candidateId", async (req, res) => {
  const candidateId = req.params.candidateId;
  try {
    const [row] = await db.update(candidates).set(req.body).where(eq(candidates.id, candidateId)).returning();
    res.json(row);
  } catch (_err) {
    res.status(500).json({ error: "Failed to update candidate" });
  }
});

// Delete candidate
router.delete("/candidates/:candidateId", async (req, res) => {
  const candidateId = req.params.candidateId;
  try {
    await db.delete(candidates).where(eq(candidates.id, candidateId));
    res.json({ success: true });
  } catch (_err) {
    res.status(500).json({ error: "Failed to delete candidate" });
  }
});

export default router;
