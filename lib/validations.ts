/**
 * Zod validation schemas for API requests
 * 
 * Use these schemas to validate incoming data in API routes.
 * Example:
 * 
 * const result = createElectionSchema.safeParse(requestBody)
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
 * }
 */

import { z } from 'zod'

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

// ============================================================================
// ELECTION SCHEMAS
// ============================================================================

export const createElectionSchema = z.object({
  name: z.string().min(1, 'Election name is required').max(300),
  description: z.string().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable()
})

export const updateElectionSchema = z.object({
  id: z.string().uuid('Invalid election ID'),
  name: z.string().min(1).max(300).optional(),
  description: z.string().optional().nullable()
})

export const deleteElectionSchema = z.object({
  id: z.string().uuid('Invalid election ID')
})

export const electionStatusSchema = z.object({
  id: z.string().uuid('Invalid election ID'),
  status: z.enum(['draft', 'open', 'paused', 'closed'], {
    message: 'Status must be: draft, open, paused, or closed'
  })
})

// ============================================================================
// POSITION SCHEMAS
// ============================================================================

export const createPositionSchema = z.object({
  election_id: z.string().uuid('Invalid election ID'),
  name: z.string().min(1, 'Position name is required').max(200),
  description: z.string().optional().nullable(),
  seats: z.number().int().min(1, 'Seats must be at least 1').default(1),
  sort_order: z.number().int().min(0).default(0)
})

export const updatePositionSchema = z.object({
  id: z.string().uuid('Invalid position ID'),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  seats: z.number().int().min(1).optional(),
  sort_order: z.number().int().min(0).optional()
})

export const deletePositionSchema = z.object({
  id: z.string().uuid('Invalid position ID')
})

// ============================================================================
// CANDIDATE SCHEMAS
// ============================================================================

export const createCandidateSchema = z.object({
  election_id: z.string().uuid('Invalid election ID'),
  position_id: z.string().uuid('Invalid position ID'),
  display_name: z.string().min(1, 'Candidate name is required').max(200),
  manifesto_link: z.string().url('Invalid URL').optional().nullable()
})

export const updateCandidateSchema = z.object({
  id: z.string().uuid('Invalid candidate ID'),
  display_name: z.string().min(1).max(200).optional(),
  manifesto_link: z.string().url('Invalid URL').optional().nullable(),
  withdrawn: z.boolean().optional()
})

export const deleteCandidateSchema = z.object({
  id: z.string().uuid('Invalid candidate ID')
})

// ============================================================================
// VOTER SCHEMAS
// ============================================================================

const voterRowSchema = z.object({
  full_name: z.string().optional().nullable(),
  student_id: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable()
})

export const importVotersSchema = z.object({
  electionId: z.string().uuid('Invalid election ID'),
  voters: z.array(voterRowSchema)
    .min(1, 'At least one voter is required')
    .max(10000, 'Maximum 10,000 voters per import')
})

export const voterPaginationSchema = z.object({
  electionId: z.string().uuid('Invalid election ID'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10)
})

// ============================================================================
// BALLOT/VOTING SCHEMAS
// ============================================================================

export const checkTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  electionId: z.string().uuid('Invalid election ID')
})

export const submitBallotSchema = z.object({
  electionId: z.string().uuid('Invalid election ID'),
  token: z.string().min(1, 'Token is required'),
  rankings: z.record(
    z.string().uuid(), // position_id
    z.array(z.string().uuid()) // candidate_ids in order
  ),
  meta: z.record(z.string(), z.any()).optional()
})

// ============================================================================
// RESULTS SCHEMAS
// ============================================================================

export const createCountJobSchema = z.object({
  election_id: z.string().uuid('Invalid election ID'),
  position_id: z.string().uuid('Invalid position ID').optional(),
  seed: z.string().optional()
})

export const runCountSchema = z.object({
  electionId: z.string().uuid('Invalid election ID')
})

// ============================================================================
// QUERY PARAMETER HELPERS
// ============================================================================

/**
 * Parse and validate query parameters
 * 
 * Example:
 * const params = parseQuery(request.nextUrl.searchParams, {
 *   page: z.coerce.number().int().min(1).default(1),
 *   limit: z.coerce.number().int().min(1).max(100).default(10)
 * })
 */
export function parseQuery<T extends z.ZodRawShape>(
  searchParams: URLSearchParams,
  shape: T
): z.infer<z.ZodObject<T>> {
  const schema = z.object(shape)
  const params = Object.fromEntries(searchParams.entries())
  return schema.parse(params)
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>
export type CreateElectionInput = z.infer<typeof createElectionSchema>
export type UpdateElectionInput = z.infer<typeof updateElectionSchema>
export type CreatePositionInput = z.infer<typeof createPositionSchema>
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>
export type ImportVotersInput = z.infer<typeof importVotersSchema>
export type SubmitBallotInput = z.infer<typeof submitBallotSchema>

