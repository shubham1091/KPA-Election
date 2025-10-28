import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { voters } from '@/lib/schema';
import { eq, and } from 'drizzle-orm'
import { verifyToken, generateFingerprint } from '@/lib/tokenUtils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { electionId, token } = body

    if (!electionId || !token) {
      return NextResponse.json({ error: 'Election ID and token required' }, { status: 400 })
    }

    // First try direct lookup by real_token (fast when present)
    console.time('db_lookup_real_token')
    const byReal = await db
      .select()
      .from(voters)
      .where(and(eq(voters.election_id, electionId), eq(voters.real_token, token)))
    console.timeEnd('db_lookup_real_token')

    let matchedVoter = null

    if (byReal && byReal.length > 0) {
      matchedVoter = byReal[0]
    } else {
      // If not found, try fingerprint lookup (SHA256) - fast indexed lookup if index exists
      const fingerprint = generateFingerprint(token)
      console.time('db_lookup_fingerprint')
      const byFingerprint = await db
        .select()
        .from(voters)
        .where(and(eq(voters.election_id, electionId), eq(voters.token_fingerprint, fingerprint)))
      console.timeEnd('db_lookup_fingerprint')

      if (byFingerprint && byFingerprint.length > 0) {
        matchedVoter = byFingerprint[0]
        // Verify hashed token against the stored bcrypt hash to be safe
        if (matchedVoter && matchedVoter.token_hash) {
          try {
            console.time('bcrypt_verify')
            const ok = await verifyToken(token, matchedVoter.token_hash)
            console.timeEnd('bcrypt_verify')
            if (!ok) {
              matchedVoter = null
            }
          } catch (err) {
            console.error('Token verification failed:', err instanceof Error ? err.message : err)
            // Treat as invalid rather than crashing the function
            matchedVoter = null
          }
        } else {
          // No token_hash available - cannot verify securely
          matchedVoter = null
        }
      }
    }

    if (!matchedVoter) {
      return NextResponse.json({
        valid: false,
        used: false,
        message: 'Invalid token',
      })
    }

    // Check if token already used
    if (matchedVoter.token_used_at) {
      return NextResponse.json({
        valid: true,
        used: true,
        message: 'Token already used',
        usedAt: matchedVoter.token_used_at,
      })
    }

    // Token is valid and not used
    return NextResponse.json({
      valid: true,
      used: false,
      voterId: matchedVoter.id,
      voterName: matchedVoter.full_name,
    })
  } catch (error) {
    console.error('Check token error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}

// export default async function handler(req, res) {