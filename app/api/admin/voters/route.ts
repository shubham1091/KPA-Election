import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { voters } from '@/lib/schema';
import { sql } from 'drizzle-orm'
import Papa from 'papaparse'
import {
  generateToken,
  hashToken,
  generateFingerprint,
  generatePrefilledUrl,
} from '@/lib/tokenUtils'

// GET all voters for an election (with pagination or CSV download)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const electionId = searchParams.get('electionId')
    const download = searchParams.get('download') === 'true'
    const q = searchParams.get('q') || undefined
    const status = searchParams.get('status') || undefined // 'voted' | 'not_voted' | undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!electionId) {
      return NextResponse.json({ error: 'Election ID required' }, { status: 400 })
    }

    // Handle CSV download request (honor optional q/status filters)
    if (download) {
      // build same where fragment as below
      let whereSql = sql`${voters.election_id} = ${electionId}`
      if (q) {
        const like = `%${q}%`
        whereSql = sql`${whereSql} AND (
          ${voters.full_name} ILIKE ${like} OR
          ${voters.student_id} ILIKE ${like} OR
          ${voters.email} ILIKE ${like} OR
          ${voters.real_token} ILIKE ${like}
        )`
      }
      if (status === 'voted') {
        whereSql = sql`${whereSql} AND ${voters.token_used_at} IS NOT NULL`
      } else if (status === 'not_voted') {
        whereSql = sql`${whereSql} AND ${voters.token_used_at} IS NULL`
      }

      const allVoters = await db.select().from(voters).where(whereSql).orderBy(voters.created_at)

      // Prepare CSV data with all necessary fields
      const csvData = allVoters.map(voter => ({
        Name: voter.full_name || 'N/A',
        'Student ID': voter.student_id || 'N/A',
        Email: voter.email || 'N/A',
        Token: voter.real_token || 'N/A',
        'Voting Link': voter.prefilled_url || 'N/A',
        Voted: voter.token_used_at ? 'Yes' : 'No',
        'Voted At': voter.token_used_at ? new Date(voter.token_used_at).toLocaleString() : 'N/A',
      }))

      // Convert to CSV using PapaParse
      const csv = Papa.unparse(csvData)

      // Return CSV file
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="voters-${electionId}-${Date.now()}.csv"`,
        },
      })
    }

    // Handle regular paginated request with optional filters
    const offset = (page - 1) * limit

    // Build a single SQL WHERE fragment with optional filters
    let whereSql = sql`${voters.election_id} = ${electionId}`

    if (q) {
      const like = `%${q}%`
      whereSql = sql`${whereSql} AND (
        ${voters.full_name} ILIKE ${like} OR
        ${voters.student_id} ILIKE ${like} OR
        ${voters.email} ILIKE ${like} OR
        ${voters.real_token} ILIKE ${like}
      )`
    }

    if (status === 'voted') {
      whereSql = sql`${whereSql} AND ${voters.token_used_at} IS NOT NULL`
    } else if (status === 'not_voted') {
      whereSql = sql`${whereSql} AND ${voters.token_used_at} IS NULL`
    }

    const votersList = await db.select().from(voters).where(whereSql).limit(limit).offset(offset)

    // Get total count
    const totalCountResult = await db.select().from(voters).where(whereSql)

    const totalCount = totalCountResult.length
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      voters: votersList,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    })
  } catch (error) {
    console.error('Get voters error:', error)
    return NextResponse.json({ error: 'Failed to get voters' }, { status: 500 })
  }
}

// POST - Import voters from CSV
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const electionId = formData.get('electionId') as string;

    if (!file || !electionId) {
      return NextResponse.json(
        { error: 'File and election ID required' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();

    // Parse CSV
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase(),
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing failed', details: parseResult.errors },
        { status: 400 }
      );
    }

  const rows = parseResult.data as Array<Record<string, string>>

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No data found in CSV file' }, { status: 400 })
  }

  // Get base URL for prefilled URLs
  // Priority: 1. NEXT_PUBLIC_APP_URL, 2. Request headers, 3. Vercel URL, 4. localhost
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!baseUrl) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    if (host) {
      const protocol =
        request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
      baseUrl = `${protocol}://${host}`
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    } else {
      baseUrl = 'http://localhost:3000'
    }
  }

  console.log('🔗 Generating voter URLs with base:', baseUrl)

  // Import voters with proper token generation
  // Optimization notes:
  // - Hashing (bcrypt) is CPU-bound; we limit concurrency to avoid blocking the event loop.
  // - Insert voters in batches to reduce DB round-trips.
  const importedVoters: Array<Record<string, unknown>> = []
  const tokens: { name: string; token: string; url: string }[] = []

  const BATCH_SIZE = 500 // number of rows to insert per DB call
  const HASH_CONCURRENCY = 8 // number of concurrent bcrypt operations

  async function mapWithConcurrency<T, R>(
    items: T[],
    fn: (item: T, idx: number) => Promise<R>,
    concurrency: number
  ) {
    const results: R[] = new Array(items.length)
    let i = 0
    const workers = Array.from({ length: concurrency }).map(async () => {
      while (true) {
        const idx = i++
        if (idx >= items.length) break
        results[idx] = await fn(items[idx], idx)
      }
    })
    await Promise.all(workers)
    return results
  }

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE)

    // For each row in the batch, generate token/hash in parallel with limited concurrency
    const prepared = await mapWithConcurrency(
      batch,
      async row => {
        const r = row as Record<string, string>
        const fullName = r.name || r.full_name || r.fullname || null
        const studentId = r.student_id || r.studentid || r.id || null
        const email = r.email || null

        const token = generateToken()
        const tokenHash = await hashToken(token)
        const tokenFingerprint = generateFingerprint(token)
        const prefilledUrl = generatePrefilledUrl(baseUrl, electionId, token)

        tokens.push({ name: (fullName as string) || 'Unknown', token, url: prefilledUrl })

        return {
          election_id: electionId,
          full_name: fullName,
          student_id: studentId,
          email: email,
          token_hash: tokenHash,
          token_fingerprint: tokenFingerprint,
          real_token: token,
          prefilled_url: prefilledUrl,
        } as typeof voters.$inferInsert
      },
      HASH_CONCURRENCY
    )

    // Bulk insert this batch
    const inserted = await db.insert(voters).values(prepared).returning()
    importedVoters.push(...inserted)
  }

    return NextResponse.json(
      { success: true, count: importedVoters.length, voters: importedVoters, tokens },
      { status: 201 }
    )

  } catch (error) {
    console.error('Import voters error:', error);
    return NextResponse.json(
      { error: 'Failed to import voters', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

