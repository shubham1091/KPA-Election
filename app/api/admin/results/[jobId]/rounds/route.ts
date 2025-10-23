import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { count_events } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId' },
        { status: 400 }
      )
    }

    const events = await db
      .select()
      .from(count_events)
      .where(eq(count_events.job_id, jobId))
      .orderBy(count_events.round_number)

    // Return array of round payloads
    const rounds = events.map((e) => e.payload)

    return NextResponse.json(rounds)
  } catch (error) {
    console.error('get-rounds error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch count rounds' },
      { status: 500 }
    )
  }
}

