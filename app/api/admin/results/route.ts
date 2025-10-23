import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { count_jobs, count_events, positions, candidates } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET results for an election
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');
    const jobId = searchParams.get('jobId');

    if (jobId) {
      // Get specific job details with events
      const [job] = await db
        .select()
        .from(count_jobs)
        .where(eq(count_jobs.id, jobId))
        .limit(1);

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      // Get count events (rounds) for this job
      const events = await db
        .select()
        .from(count_events)
        .where(eq(count_events.job_id, jobId))
        .orderBy(count_events.round_number);

      return NextResponse.json({
        job,
        events,
      });
    }

    if (electionId) {
      // Get all count jobs for this election
      const jobs = await db
        .select()
        .from(count_jobs)
        .where(eq(count_jobs.election_id, electionId));

      // Get positions and candidates for context
      const positionsList = await db
        .select()
        .from(positions)
        .where(eq(positions.election_id, electionId));

      const candidatesList = await db
        .select()
        .from(candidates)
        .where(eq(candidates.election_id, electionId));

      return NextResponse.json({
        jobs,
        positions: positionsList,
        candidates: candidatesList,
      });
    }

    return NextResponse.json({ error: 'Election ID or Job ID required' }, { status: 400 });
  } catch (error) {
    console.error('Get results error:', error);
    return NextResponse.json(
      { error: 'Failed to get results' },
      { status: 500 }
    );
  }
}

// POST - Trigger count for a closed election
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { election_id } = body;

    if (!election_id) {
      return NextResponse.json(
        { error: 'Election ID required' },
        { status: 400 }
      );
    }

    // Get all positions for this election
    const positionsList = await db
      .select()
      .from(positions)
      .where(eq(positions.election_id, election_id));

    // Create count jobs for each position
    const jobs = [];
    for (const position of positionsList) {
      const [job] = await db
        .insert(count_jobs)
        .values({
          election_id,
          position_id: position.id,
          started_by: null, // TODO: Get actual admin UUID from session
          method: 'STV',
          status: 'pending',
          result_summary: null,
        })
        .returning();

      jobs.push(job);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${jobs.length} count jobs`,
      jobs,
    });
  } catch (error) {
    console.error('Trigger count error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger count' },
      { status: 500 }
    );
  }
}

