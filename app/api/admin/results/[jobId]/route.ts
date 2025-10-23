import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { count_jobs } from '@/lib/schema'
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

    const jobs = await db
      .select()
      .from(count_jobs)
      .where(eq(count_jobs.id, jobId))

    if (!jobs.length) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const job = jobs[0]

    // Return the result_summary (may be null if job not completed)
    return NextResponse.json(job.result_summary ?? null)
  } catch (error) {
    console.error('get-result-summary error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch result summary' },
      { status: 500 }
    )
  }
}

