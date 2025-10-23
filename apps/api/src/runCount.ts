// server/src/runCount.ts
// Script to manually trigger STV count for an election
import 'dotenv/config';
import { db } from './db';
import { elections, positions, count_jobs } from './schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { runStvForPosition } from './stv';

async function runCountForElection(electionId: string) {
  try {
    console.log(`Starting count for election: ${electionId}`);

    // Get election details
    const [election] = await db.select().from(elections).where(eq(elections.id, electionId));
    if (!election) {
      console.error('Election not found');
      process.exit(1);
    }

    console.log(`Election: ${election.title} (${election.status})`);

    // Get all positions for this election
    const electionPositions = await db.select().from(positions).where(eq(positions.election_id, electionId));
    
    if (electionPositions.length === 0) {
      console.error('No positions found for this election');
      process.exit(1);
    }

    console.log(`Found ${electionPositions.length} position(s)`);

    // Create count jobs for each position and trigger STV calculation
    for (const position of electionPositions) {
      console.log(`\nProcessing position: ${position.name}`);
      
      // Check if a completed job already exists
      const existingJobs = await db
        .select()
        .from(count_jobs)
        .where(eq(count_jobs.position_id, position.id));
      
      if (existingJobs.length > 0) {
        console.log(`  Found ${existingJobs.length} existing job(s)`);
        existingJobs.forEach((job: any) => {
          console.log(`    - Job ${job.id}: ${job.status}`);
        });
      }

      // Create new count job
      const [job] = await db.insert(count_jobs).values({
        id: uuidv4(),
        election_id: electionId,
        position_id: position.id,
        started_by: null,
        method: "STV",
      }).returning();

      if (job) {
        console.log(`  Created new job: ${job.id}`);
        console.log(`  Running STV calculation...`);
        
        try {
          const result = await runStvForPosition(job.id, electionId, position.id, new Date().toISOString());
          console.log(`  ✓ STV completed successfully`);
          if (result) {
            console.log(`    Winner: ${result.winner}`);
            console.log(`    Total Ballots: ${result.totalBallots}`);
            console.log(`    Quota: ${result.quota}`);
            console.log(`    Rounds: ${result.rounds}`);
          }
        } catch (e: any) {
          console.error(`  ✗ STV failed: ${e.message}`);
        }
      }
    }

    console.log('\n✓ Count completed for all positions');
    process.exit(0);
  } catch (err: any) {
    console.error('Error running count:', err);
    process.exit(1);
  }
}

// Get election ID from command line argument
const electionId = process.argv[2];

if (!electionId) {
  console.error('Usage: npm run count <electionId>');
  console.error('Example: npm run count d93f6aa2-65ce-4fc9-bb69-0cb53f3840bb');
  process.exit(1);
}

runCountForElection(electionId);
