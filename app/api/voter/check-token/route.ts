import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { voters } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/tokenUtils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { electionId, token } = body;

    if (!electionId || !token) {
      return NextResponse.json(
        { error: 'Election ID and token required' },
        { status: 400 }
      );
    }

    // Get all voters for this election
    const votersList = await db
      .select()
      .from(voters)
      .where(eq(voters.election_id, electionId));

    // Find voter with matching token
    let matchedVoter = null;
    for (const voter of votersList) {
      // Try to match against real_token (plaintext) first for quick lookup
      if (voter.real_token === token) {
        matchedVoter = voter;
        break;
      }
      
      // Try to verify against hashed token
      const isValid = await verifyToken(token, voter.token_hash);
      if (isValid) {
        matchedVoter = voter;
        break;
      }
    }

    if (!matchedVoter) {
      return NextResponse.json({
        valid: false,
        used: false,
        message: 'Invalid token',
      });
    }

    // Check if token already used
    if (matchedVoter.token_used_at) {
      return NextResponse.json({
        valid: true,
        used: true,
        message: 'Token already used',
        usedAt: matchedVoter.token_used_at,
      });
    }

    // Token is valid and not used
    return NextResponse.json({
      valid: true,
      used: false,
      voterId: matchedVoter.id,
      voterName: matchedVoter.full_name,
    });

  } catch (error) {
    console.error('Check token error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}

