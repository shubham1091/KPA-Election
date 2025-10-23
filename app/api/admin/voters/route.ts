import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { voters } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import Papa from 'papaparse';
import { 
  generateToken, 
  hashToken, 
  generateFingerprint, 
  generatePrefilledUrl 
} from '@/lib/tokenUtils';

// GET all voters for an election (with pagination or CSV download)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');
    const download = searchParams.get('download') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!electionId) {
      return NextResponse.json({ error: 'Election ID required' }, { status: 400 });
    }

    // Handle CSV download request
    if (download) {
      const allVoters = await db
        .select()
        .from(voters)
        .where(eq(voters.election_id, electionId));

      // Prepare CSV data with all necessary fields
      const csvData = allVoters.map(voter => ({
        'Name': voter.full_name || 'N/A',
        'Student ID': voter.student_id || 'N/A',
        'Email': voter.email || 'N/A',
        'Token': voter.real_token || 'N/A',
        'Voting Link': voter.prefilled_url || 'N/A',
        'Voted': voter.token_used_at ? 'Yes' : 'No',
        'Voted At': voter.token_used_at ? new Date(voter.token_used_at).toLocaleString() : 'N/A',
      }));

      // Convert to CSV using PapaParse
      const csv = Papa.unparse(csvData);

      // Return CSV file
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="voters-${electionId}-${Date.now()}.csv"`,
        },
      });
    }

    // Handle regular paginated request
    const offset = (page - 1) * limit;

    const votersList = await db
      .select()
      .from(voters)
      .where(eq(voters.election_id, electionId))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCountResult = await db
      .select()
      .from(voters)
      .where(eq(voters.election_id, electionId));
    
    const totalCount = totalCountResult.length;
    const totalPages = Math.ceil(totalCount / limit);

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
    });
  } catch (error) {
    console.error('Get voters error:', error);
    return NextResponse.json(
      { error: 'Failed to get voters' },
      { status: 500 }
    );
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

    const rows = parseResult.data as Array<Record<string, unknown>>;
    
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found in CSV file' },
        { status: 400 }
      );
    }

    // Get base URL for prefilled URLs from request headers
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;

    // Import voters with proper token generation
    const importedVoters: Array<{
      id: string
      election_id: string
      full_name: string | null
      student_id: string | null
      email: string | null
      real_token: string
      prefilled_url: string | null
    }> = [];
    const tokens: { name: string; token: string; url: string }[] = [];

    for (const row of rows) {
      // Extract voter data (support multiple column name formats)
      const fullName = row.name || row.full_name || row.fullname || null;
      const studentId = row.student_id || row.studentid || row.id || null;
      const email = row.email || null;

      // Generate secure token
      const token = generateToken();
      const tokenHash = await hashToken(token);
      const tokenFingerprint = generateFingerprint(token);
      const prefilledUrl = generatePrefilledUrl(baseUrl, electionId, token);

      // Insert voter into database
      const [voter] = await db.insert(voters).values({
        election_id: electionId,
        full_name: fullName,
        student_id: studentId,
        email: email,
        token_hash: tokenHash,
        token_fingerprint: tokenFingerprint,
        real_token: token,
        prefilled_url: prefilledUrl,
      } as typeof voters.$inferInsert).returning();

      importedVoters.push(voter);
      tokens.push({
        name: (fullName as string | null) || 'Unknown',
        token,
        url: prefilledUrl,
      });
    }

    return NextResponse.json({
      success: true,
      count: importedVoters.length,
      voters: importedVoters,
      tokens, // Include tokens for admin to distribute
    }, { status: 201 });

  } catch (error) {
    console.error('Import voters error:', error);
    return NextResponse.json(
      { error: 'Failed to import voters', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

