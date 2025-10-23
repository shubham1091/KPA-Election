/**
 * Centralized error handling for API routes
 * 
 * Usage:
 * 
 * import { AppError, handleError, ValidationError, UnauthorizedError } from '@/lib/errors'
 * 
 * try {
 *   if (!user) {
 *     throw new UnauthorizedError('Please login')
 *   }
 *   // ... your code
 * } catch (error) {
 *   return handleError(error)
 * }
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 400 - Bad Request
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

/**
 * 401 - Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

/**
 * 403 - Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

/**
 * 404 - Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

/**
 * 409 - Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT')
  }
}

/**
 * 429 - Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

/**
 * 500 - Internal Server Error
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', details?: unknown) {
    super(message, 500, 'INTERNAL_ERROR', details)
  }
}

/**
 * Handle errors and return appropriate NextResponse
 */
export function handleError(error: unknown): NextResponse {
  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error)
  } else {
    // In production, log to external service (e.g., Sentry, LogRocket)
    console.error('API Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.flatten().fieldErrors
      },
      { status: 400 }
    )
  }

  // Handle our custom AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details && { details: error.details })
      },
      { status: error.statusCode }
    )
  }

  // Handle database errors
  if (error instanceof Error && error.message.includes('unique constraint')) {
    return NextResponse.json(
      {
        error: 'A resource with this information already exists',
        code: 'DUPLICATE_RESOURCE'
      },
      { status: 409 }
    )
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      error: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error instanceof Error 
          ? error.message 
          : 'Unknown error',
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  )
}

/**
 * Assert condition and throw error if false
 */
export function assert(condition: unknown, error: AppError): asserts condition {
  if (!condition) {
    throw error
  }
}

/**
 * Example usage in API route:
 * 
 * export async function POST(request: NextRequest) {
 *   try {
 *     const body = await request.json()
 *     
 *     // Validate
 *     const validation = loginSchema.safeParse(body)
 *     if (!validation.success) {
 *       throw new ValidationError('Invalid input', validation.error.flatten())
 *     }
 *     
 *     const { username, password } = validation.data
 *     
 *     // Find admin
 *     const admin = await db.select().from(admins).where(eq(admins.username, username)).limit(1)
 *     assert(admin.length > 0, new UnauthorizedError('Invalid credentials'))
 *     
 *     // Verify password
 *     const isValid = await verifyPassword(password, admin[0].password)
 *     assert(isValid, new UnauthorizedError('Invalid credentials'))
 *     
 *     return createAdminLoginResponse(admin[0].id, admin[0].username)
 *   } catch (error) {
 *     return handleError(error)
 *   }
 * }
 */

