import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { count_jobs } from '@/lib/schema'
import { runStvForPosition } from '@/lib/stv'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { electionId, positionId, startedBy } = body

    if (!electionId || !positionId) {
      return NextResponse.json(
        { error: 'Missing electionId or positionId' },
        { status: 400 }
      )
    }

    // Create count job
    const [job] = await db
      .insert(count_jobs)
      .values({
        id: uuidv4(),
        election_id: electionId,
        position_id: positionId,
        started_by: startedBy || null,
        method: 'STV',
        status: 'running',
      })
      .returning()

    if (!job) {
      return NextResponse.json(
        { error: 'Failed to create count job' },
        { status: 500 }
      )
    }

    // Run STV in background (don't await to avoid timeout)
    runStvForPosition(job.id, electionId, positionId, new Date().toISOString())
      .catch((err) => {
        console.error('Background STV job error:', err)
      })

    return NextResponse.json({
      success: true,
      job,
      message: 'Count job started successfully'
    })
  } catch (error) {
    console.error('run-count error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start count' },
      { status: 500 }
    )
  }
}
