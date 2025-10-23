import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { elections, positions, count_jobs } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { runStvForPosition } from '@/lib/stv';
import { v4 as uuidv4 } from 'uuid';

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
      // Instead of attempting to run STV work in the same serverless request (which
      // will be terminated on Vercel after the response is sent), create queued jobs
      // and return them. A separate worker/cron/queue should pick up queued jobs and
      // call the `/api/admin/run-count` endpoint or otherwise execute `runStvForPosition`.
      for (const position of electionPositions) {
        const jobData = {
          id: uuidv4(),
          election_id: id,
          position_id: position.id,
          method: 'STV',
          // mark as queued so the UI/worker can pick it up and run it reliably
          status: 'queued',
          started_by:
            adminId &&
            adminId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
              ? adminId
              : null,
        }

        const [job] = await db.insert(count_jobs).values(jobData).returning()

        if (job) {
          jobs.push(job)
        }
      }

      return NextResponse.json({
        ...updated,
        jobsCreated: jobs.length,
        jobs,
        note: 'Count jobs queued; please run them using a worker or the run-count endpoint.',
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

