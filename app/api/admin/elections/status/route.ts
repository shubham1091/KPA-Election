import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { elections, positions, count_jobs } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { runStvForPosition } from '@/lib/stv';
import { v4 as uuidv4 } from 'uuid';

// Configure maximum function duration for vote counting when closing elections
// With Fluid Compute enabled (default): Hobby 300s, Pro/Enterprise up to 800s
// Learn more: https://vercel.com/docs/functions/configuring-functions/duration
export const maxDuration = 300; // 5 minutes - works for all plans with Fluid Compute

// PATCH - Update election status
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, adminId } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Election ID and status required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['draft', 'open', 'paused', 'closed', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(elections)
      .set({ 
        status,
        updatedAt: new Date(),
      })
      .where(eq(elections.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    // If closing election, automatically trigger vote counting
    if (status === 'closed') {
      const electionPositions = await db
        .select()
        .from(positions)
        .where(eq(positions.election_id, id))

      const jobs = []
      const results: { position: string; success: boolean; error?: string }[] = []
      
      // Create and run count jobs for each position
      // With maxDuration=300, this can handle multiple positions within the timeout
      for (const position of electionPositions) {
        const jobData = {
          id: uuidv4(),
          election_id: id,
          position_id: position.id,
          method: 'STV',
          status: 'running',
          started_by:
            adminId &&
            adminId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
              ? adminId
              : null,
        }

        const [job] = await db.insert(count_jobs).values(jobData).returning()

        if (job) {
          jobs.push(job)
          
          // Run STV counting synchronously for this position
          try {
            console.log(`🔄 Starting STV count for position ${position.name} (job ${job.id})`)
            await runStvForPosition(job.id, id, position.id, new Date().toISOString())
            console.log(`✅ STV count completed for position ${position.name} (job ${job.id})`)
            results.push({ position: position.name, success: true })
          } catch (stvError) {
            console.error(`❌ STV counting error for position ${position.name} (job ${job.id}):`, stvError)
            results.push({ 
              position: position.name, 
              success: false, 
              error: stvError instanceof Error ? stvError.message : 'Unknown error' 
            })
          }
        }
      }

      const successCount = results.filter(r => r.success).length
      const failedCount = results.filter(r => !r.success).length

      return NextResponse.json({
        ...updated,
        jobsCreated: jobs.length,
        jobsCompleted: successCount,
        jobsFailed: failedCount,
        jobs,
        results,
        note: `Vote counting completed: ${successCount} successful, ${failedCount} failed.`,
      })
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update election status error:', error);
    return NextResponse.json(
      { error: 'Failed to update election status' },
      { status: 500 }
    );
  }
}

