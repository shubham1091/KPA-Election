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
        .where(eq(positions.election_id, id));

      const jobs = [];
      for (const position of electionPositions) {
        const jobData = {
          id: uuidv4(),
          election_id: id,
          position_id: position.id,
          method: 'STV',
          status: 'running',
        };
        
        if (adminId && adminId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          jobData.started_by = adminId;
        }
        
        const [job] = await db.insert(count_jobs).values(jobData).returning();

        if (job) {
          jobs.push(job);
          
          // Run STV in background (don't await to avoid timeout)
          runStvForPosition(job.id, id, position.id, new Date().toISOString())
            .catch((e) => {
              console.error(`Background STV job error for position ${position.id}:`, e);
            });
        }
      }

      return NextResponse.json({ 
        ...updated,
        jobsCreated: jobs.length,
        jobs 
      });
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

