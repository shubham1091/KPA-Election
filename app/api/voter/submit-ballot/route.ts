import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { voters, ballots, ballot_rankings, elections } from '@/lib/schema';
import { eq, and } from 'drizzle-orm'
import { verifyToken, generateFingerprint } from '@/lib/tokenUtils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { electionId, token, rankings, meta } = body

    if (!electionId || !token || !rankings) {
      return NextResponse.json(
        { error: 'Election ID, token, and rankings required' },
        { status: 400 }
      )
    }

    // Verify election is open
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1)

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 })
    }

    if (election.status !== 'open') {
      return NextResponse.json(
        { error: `Election is ${election.status}, not open for voting` },
        { status: 400 }
      )
    }

    // Find and verify voter token in a targeted way to avoid scanning all voters
    console.time('submit_db_lookup_real_token')
    const byReal = await db
      .select()
      .from(voters)
      .where(and(eq(voters.election_id, electionId), eq(voters.real_token, token)))
    console.timeEnd('submit_db_lookup_real_token')

    let matchedVoter = null
    if (byReal && byReal.length > 0) {
      matchedVoter = byReal[0]
    } else {
      const fingerprint = generateFingerprint(token)
      console.time('submit_db_lookup_fingerprint')
      const byFingerprint = await db
        .select()
        .from(voters)
        .where(and(eq(voters.election_id, electionId), eq(voters.token_fingerprint, fingerprint)))
      console.timeEnd('submit_db_lookup_fingerprint')

      if (byFingerprint && byFingerprint.length > 0) {
        matchedVoter = byFingerprint[0]
        if (matchedVoter && matchedVoter.token_hash) {
          try {
            console.time('submit_bcrypt_verify')
            const ok = await verifyToken(token, matchedVoter.token_hash)
            console.timeEnd('submit_bcrypt_verify')
            if (!ok) matchedVoter = null
          } catch (err) {
            console.error(
              'Submit token verification failed:',
              err instanceof Error ? err.message : err
            )
            matchedVoter = null
          }
        } else {
          matchedVoter = null
        }
      }
    }

    if (!matchedVoter) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if already voted
    if (matchedVoter.token_used_at) {
      return NextResponse.json(
        { error: 'This token has already been used to vote' },
        { status: 400 }
      )
    }

    // Create ballot (anonymous - not linked to voter)
    const [ballot] = await db
      .insert(ballots)
      .values({
        election_id: electionId,
        meta: meta || {},
      })
      .returning()

    // Create ballot rankings for each position
    const rankingInserts: Array<{
      ballot_id: string
      position_id: string
      candidate_id: string
      rank: number
    }> = []

    for (const [positionId, candidateIds] of Object.entries(rankings)) {
      if (Array.isArray(candidateIds)) {
        candidateIds.forEach((candidateId, index) => {
          rankingInserts.push({
            ballot_id: ballot.id,
            position_id: positionId,
            candidate_id: candidateId,
            rank: index + 1, // 1-indexed ranks
          })
        })
      }
    }

    if (rankingInserts.length > 0) {
      await db.insert(ballot_rankings).values(rankingInserts)
    }

    // Mark token as used
    await db.update(voters).set({ token_used_at: new Date() }).where(eq(voters.id, matchedVoter.id))

    return NextResponse.json({
      success: true,
      ballotId: ballot.id,
      message: 'Vote successfully recorded',
    })
  } catch (error) {
    console.error('Submit ballot error:', error);
    return NextResponse.json(
      { error: 'Failed to submit ballot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

