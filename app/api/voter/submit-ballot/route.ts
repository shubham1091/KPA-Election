import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { voters, ballots, ballot_rankings, elections } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/tokenUtils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { electionId, token, rankings, meta } = body;

    if (!electionId || !token || !rankings) {
      return NextResponse.json(
        { error: 'Election ID, token, and rankings required' },
        { status: 400 }
      );
    }

    // Verify election is open
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1);

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    if (election.status !== 'open') {
      return NextResponse.json(
        { error: `Election is ${election.status}, not open for voting` },
        { status: 400 }
      );
    }

    // Find and verify voter token
    const votersList = await db
      .select()
      .from(voters)
      .where(eq(voters.election_id, electionId));

    let matchedVoter = null;
    for (const voter of votersList) {
      if (voter.real_token === token) {
        matchedVoter = voter;
        break;
      }
      
      const isValid = await verifyToken(token, voter.token_hash);
      if (isValid) {
        matchedVoter = voter;
        break;
      }
    }

    if (!matchedVoter) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if already voted
    if (matchedVoter.token_used_at) {
      return NextResponse.json(
        { error: 'This token has already been used to vote' },
        { status: 400 }
      );
    }

    // Create ballot (anonymous - not linked to voter)
    const [ballot] = await db
      .insert(ballots)
      .values({
        election_id: electionId,
        meta: meta || {},
      })
      .returning();

    // Create ballot rankings for each position
    const rankingInserts: Array<{
      ballot_id: string
      position_id: string
      candidate_id: string
      rank: number
    }> = [];
    
    for (const [positionId, candidateIds] of Object.entries(rankings)) {
      if (Array.isArray(candidateIds)) {
        candidateIds.forEach((candidateId, index) => {
          rankingInserts.push({
            ballot_id: ballot.id,
            position_id: positionId,
            candidate_id: candidateId,
            rank: index + 1, // 1-indexed ranks
          });
        });
      }
    }

    if (rankingInserts.length > 0) {
      await db.insert(ballot_rankings).values(rankingInserts);
    }

    // Mark token as used
    await db
      .update(voters)
      .set({ token_used_at: new Date() })
      .where(eq(voters.id, matchedVoter.id));

    return NextResponse.json({
      success: true,
      ballotId: ballot.id,
      message: 'Vote successfully recorded',
    });

  } catch (error) {
    console.error('Submit ballot error:', error);
    return NextResponse.json(
      { error: 'Failed to submit ballot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

