/**
 * Authentication and Authorization Utilities
 * 
 * This module provides JWT-based authentication for admin users.
 * Use verifyAdmin() in all protected API routes.
 */

import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-this-immediately'
)

export interface AdminPayload {
  adminId: string
  username: string
  iat?: number
  exp?: number
}

/**
 * Generate a JWT token for an admin user
 */
export async function generateAdminToken(adminId: string, username: string): Promise<string> {
  const token = await new SignJWT({ adminId, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify and decode a JWT token
 */
export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AdminPayload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Verify admin authentication from request
 * Returns admin payload if authenticated, null otherwise
 */
export async function verifyAdmin(request: NextRequest): Promise<AdminPayload | null> {
  const token = request.cookies.get('admin_token')?.value

  if (!token) {
    return null
  }

  return verifyAdminToken(token)
}

/**
 * Middleware wrapper to protect API routes
 * Usage:
 * 
 * export const POST = withAuth(async (request, admin) => {
 *   // admin is guaranteed to be authenticated
 *   const { adminId, username } = admin
 *   // ... your handler code
 * })
 */
export function withAuth(
  handler: (request: NextRequest, admin: AdminPayload) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const admin = await verifyAdmin(request)

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login as admin.' },
        { status: 401 }
      )
    }

    return handler(request, admin)
  }
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Create an admin login response with JWT cookie
 */
export function createAdminLoginResponse(adminId: string, username: string) {
  return generateAdminToken(adminId, username).then(token => {
    const response = NextResponse.json({
      success: true,
      admin: { id: adminId, username }
    })

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400, // 24 hours
      path: '/'
    })

    return response
  })
}

/**
 * Create an admin logout response (clears cookie)
 */
export function createAdminLogoutResponse() {
  const response = NextResponse.json({ success: true })
  
  response.cookies.delete('admin_token')
  
  return response
}

