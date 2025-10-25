import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { positions, candidates, voters, ballots, count_jobs } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const electionId = searchParams.get('electionId')

    if (!electionId) {
      return NextResponse.json({ error: 'Election ID required' }, { status: 400 })
    }

    const [positionsList, candidatesList, votersList, ballotsList, jobsList] = await Promise.all([
      db.select().from(positions).where(eq(positions.election_id, electionId)),
      db.select().from(candidates).where(eq(candidates.election_id, electionId)),
      db.select().from(voters).where(eq(voters.election_id, electionId)),
      db.select().from(ballots).where(eq(ballots.election_id, electionId)),
      db.select().from(count_jobs).where(eq(count_jobs.election_id, electionId)),
    ])

    const jobsSummary = jobsList.reduce(
      (acc: { total: number; queued: number; running: number; completed: number; failed: number }, j) => {
        const status = (j as { status?: string }).status || ''
        acc.total += 1
        if (status === 'queued' || status === 'pending') acc.queued += 1
        else if (status === 'running') acc.running += 1
        else if (status === 'completed') acc.completed += 1
        else if (status === 'failed') acc.failed += 1
        return acc
      },
      { total: 0, queued: 0, running: 0, completed: 0, failed: 0 }
    )

    const stats = {
      positions: positionsList.length,
      candidates: candidatesList.length,
      voters: votersList.length,
      ballots: ballotsList.length,
      jobs: jobsSummary,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
  }
}
