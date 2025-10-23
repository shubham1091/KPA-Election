import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { elections } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

// Create election
export async function POST(request: Request) {
  try {
    const { name, description, createdBy } = await request.json()

    if (!name || !createdBy) {
      return NextResponse.json(
        { error: 'Name and createdBy are required' },
        { status: 400 }
      )
    }

    const newElection = {
      id: uuidv4(),
      name,
      description: description || null,
      status: 'draft',
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.insert(elections).values(newElection)

    return NextResponse.json(newElection)
  } catch (error) {
    console.error('Error creating election:', error)
    return NextResponse.json(
      { error: 'Failed to create election' },
      { status: 500 }
    )
  }
}

// Delete election (with cascading delete of all related data)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 }
      )
    }

    // Import all schema tables needed for cascading delete
    const { 
      positions, 
      candidates, 
      voters, 
      ballots, 
      ballot_rankings, 
      count_jobs, 
      count_events 
    } = await import('@/lib/schema')

    // Delete in correct order to respect foreign key constraints
    // 1. Get all ballots for this election
    const electionBallots = await db
      .select()
      .from(ballots)
      .where(eq(ballots.election_id, id))

    const ballotIds = electionBallots.map(b => b.id)

    // 3. Get all count jobs for this election
    const electionJobs = await db
      .select()
      .from(count_jobs)
      .where(eq(count_jobs.election_id, id))

    const jobIds = electionJobs.map(j => j.id)

    // Delete count_events first (references count_jobs)
    if (jobIds.length > 0) {
      for (const jobId of jobIds) {
        await db.delete(count_events).where(eq(count_events.job_id, jobId))
      }
    }

    // Delete ballot_rankings (references ballots and positions)
    if (ballotIds.length > 0) {
      for (const ballotId of ballotIds) {
        await db.delete(ballot_rankings).where(eq(ballot_rankings.ballot_id, ballotId))
      }
    }

    // Delete ballots
    await db.delete(ballots).where(eq(ballots.election_id, id))

    // Delete count_jobs
    await db.delete(count_jobs).where(eq(count_jobs.election_id, id))

    // Delete voters
    await db.delete(voters).where(eq(voters.election_id, id))

    // Delete candidates
    await db.delete(candidates).where(eq(candidates.election_id, id))

    // Delete positions
    await db.delete(positions).where(eq(positions.election_id, id))

    // Finally, delete the election itself
    await db.delete(elections).where(eq(elections.id, id))

    return NextResponse.json({ 
      success: true,
      message: 'Election and all related data deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting election:', error)
    return NextResponse.json(
      { error: 'Failed to delete election', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Update election
export async function PATCH(request: Request) {
  try {
    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 }
      )
    }

    const updatedElection = {
      ...updates,
      updatedAt: new Date(),
    }

    await db
      .update(elections)
      .set(updatedElection)
      .where(eq(elections.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating election:', error)
    return NextResponse.json(
      { error: 'Failed to update election' },
      { status: 500 }
    )
  }
}

