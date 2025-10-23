import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { count_jobs } from '@/lib/schema'
import { runStvForPosition } from '@/lib/stv'
import { v4 as uuidv4 } from 'uuid'

// Increase timeout for Vercel - max 60 seconds for Pro, 10 seconds for Hobby
export const maxDuration = 60

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

    // Run STV synchronously (await it so Vercel doesn't kill the process)
    try {
      await runStvForPosition(job.id, electionId, positionId, new Date().toISOString())
      
      return NextResponse.json({
        success: true,
        job,
        message: 'Count completed successfully'
      })
    } catch (stvError) {
      console.error('STV counting error:', stvError)
      return NextResponse.json({
        success: false,
        job,
        error: stvError instanceof Error ? stvError.message : 'STV counting failed',
        message: 'Count job failed'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('run-count error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start count' },
      { status: 500 }
    )
  }
}
