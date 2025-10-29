/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  positions,
  candidates,
  voters,
  ballots,
  ballot_rankings,
  count_jobs,
  count_events,
} from '@/lib/schema'
import { eq, sql } from 'drizzle-orm'

function toCSV(rows: string[][]) {
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const electionId = searchParams.get('electionId')
    const format = searchParams.get('format') || 'json'

    if (!electionId) {
      return NextResponse.json({ error: 'Election ID required' }, { status: 400 })
    }

    // Fetch base entities in parallel (we'll compute ballots separately to exclude blank ballots)
    const [positionsList, candidatesList, votersList, jobsList] = await Promise.all([
      db.select().from(positions).where(eq(positions.election_id, electionId)),
      db.select().from(candidates).where(eq(candidates.election_id, electionId)),
      db.select().from(voters).where(eq(voters.election_id, electionId)),
      db.select().from(count_jobs).where(eq(count_jobs.election_id, electionId)),
    ])

    // Count only ballots that have at least one ranking (exclude blank/orphan ballots)
    const brRows = await db
      .select({ ballot_id: ballot_rankings.ballot_id })
      .from(ballot_rankings)
      .where(sql`${ballot_rankings.ballot_id} IN (SELECT ${ballots.id} FROM ${ballots} WHERE ${ballots.election_id} = ${electionId})`)

    const ballotsCount = new Set((brRows as Array<{ ballot_id: string }>).map(r => r.ballot_id)).size
    const votersCount = votersList.length

    const positionsReport: any[] = []

    for (const pos of positionsList) {
      const posCandidates = candidatesList.filter((c: any) => c.position_id === pos.id)

      // Fetch all rankings for this position
      const rankings = await db.select().from(ballot_rankings).where(eq(ballot_rankings.position_id, pos.id))

      // Count first preferences and track ballots present
      const firstPrefCounts: Record<string, number> = {}
      const ballotsWithRanking = new Set<string>()
      for (const r of rankings) {
        ballotsWithRanking.add(r.ballot_id)
        if (r.rank === 1) {
          firstPrefCounts[r.candidate_id] = (firstPrefCounts[r.candidate_id] || 0) + 1
        }
      }

      const ballotsForPosition = ballotsWithRanking.size
      const blankBallots = Math.max(0, ballotsCount - ballotsForPosition)

      const job = jobsList.find((j: any) => j.position_id === pos.id) || null

      // Load rounds if a job exists
      let rounds: any[] | null = null
      if (job) {
        const events = await db.select().from(count_events).where(eq(count_events.job_id, job.id)).orderBy(count_events.round_number)
        rounds = events.map((e: any) => e.payload)
      }

      positionsReport.push({
        position: pos,
        candidates: posCandidates,
        firstPreferences: firstPrefCounts,
        ballotsForPosition,
        blankBallots,
        job,
        rounds,
      })
    }

    const report = {
      electionId,
      voters: votersCount,
      ballots: Number(ballotsCount) || 0,
      positions: positionsReport,
    }

    if (format === 'csv') {
      const rows: string[][] = []
      // header
      rows.push([
        'position_id',
        'position_name',
        'candidate_id',
        'candidate_name',
        'first_preferences',
        'first_pref_percent',
        'ballots_for_position',
        'blank_ballots',
        'ballots_submitted',
        'voters_total',
        'turnout_percent',
        'job_id',
        'job_status',
        'winner',
        'quota',
        'rounds',
      ])

      for (const pos of positionsReport) {
        const ballotsForPosition = pos.ballotsForPosition || 0
        for (const cand of pos.candidates) {
          const fp = pos.firstPreferences?.[cand.id] || 0
          const fpPercent = ballotsForPosition > 0 ? ((fp / ballotsForPosition) * 100).toFixed(1) : '0.0'
          const jobSummary = pos.job?.result_summary || {}
          rows.push([
            pos.position.id,
            pos.position.name,
            cand.id,
            cand.display_name,
            String(fp),
            String(fpPercent),
            String(ballotsForPosition),
            String(pos.blankBallots || 0),
            String(report.ballots),
            String(report.voters),
            String(report.voters > 0 ? ((report.ballots / report.voters) * 100).toFixed(1) : '0.0'),
            pos.job?.id || '',
            pos.job?.status || '',
            jobSummary.winner || '',
            jobSummary.quota || '',
            jobSummary.rounds || '',
          ])
        }
        // If no candidates, still include a row for the position
        if (pos.candidates.length === 0) {
          rows.push([
            pos.position.id,
            pos.position.name,
            '',
            '',
            '0',
            '0.0',
            String(pos.ballotsForPosition || 0),
            String(pos.blankBallots || 0),
            String(report.ballots),
            String(report.voters),
            String(report.voters > 0 ? ((report.ballots / report.voters) * 100).toFixed(1) : '0.0'),
            pos.job?.id || '',
            pos.job?.status || '',
            pos.job?.result_summary?.winner || '',
            pos.job?.result_summary?.quota || '',
            pos.job?.result_summary?.rounds || '',
          ])
        }
      }

      const csv = toCSV(rows)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="election_${electionId}_stats.csv"`,
        },
      })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Get stats report error:', error)
    return NextResponse.json({ error: 'Failed to get stats report' }, { status: 500 })
  }
}
