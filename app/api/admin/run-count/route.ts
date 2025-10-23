import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { count_jobs } from '@/lib/schema'
import { runStvForPosition } from '@/lib/stv'
import { v4 as uuidv4 } from 'uuid'

// Use Fluid Compute for better performance and extended durations
// Free: up to 1 minute, Paid: up to 14 minutes
// Enable in Vercel Dashboard: Settings > Functions > Fluid Compute
export const maxDuration = 300 // 5 minutes (enough for most elections)

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

    // Run STV counting synchronously
    // With Fluid Compute enabled, this can run up to 5 minutes (maxDuration)
    try {
      console.log(`🔄 Starting STV count for job ${job.id}`)
      await runStvForPosition(job.id, electionId, positionId, new Date().toISOString())
      console.log(`✅ STV count completed for job ${job.id}`)
      
      return NextResponse.json({
        success: true,
        job,
        message: 'Count completed successfully'
      })
    } catch (stvError) {
      console.error(`❌ STV counting error for job ${job.id}:`, stvError)
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
