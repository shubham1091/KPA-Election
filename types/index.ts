/**
 * Shared TypeScript types for the application
 */

// ============================================================================
// DATABASE TYPES (from schema)
// ============================================================================

export interface Admin {
  id: string
  username: string
  password: string
  createdAt: Date
}

export interface Election {
  id: string
  name: string
  description: string | null
  startDate: Date | null
  endDate: Date | null
  status: 'draft' | 'open' | 'paused' | 'closed'
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  config: Record<string, unknown> | null
}

export interface Position {
  id: string
  election_id: string
  name: string
  description: string | null
  seats: number
  sort_order: number
  created_at: Date
}

export interface Candidate {
  id: string
  election_id: string
  position_id: string
  display_name: string
  manifesto_link: string | null
  nominated_at: Date
  withdrawn: boolean
}

export interface Voter {
  id: string
  election_id: string
  full_name: string | null
  student_id: string | null
  email: string | null
  token_hash: string
  token_fingerprint: string | null
  real_token: string
  prefilled_url: string | null
  token_used_at: Date | null
  created_at: Date
}

export interface Ballot {
  id: string
  election_id: string
  submitted_at: Date
  meta: Record<string, unknown> | null
}

export interface BallotRanking {
  id: string
  ballot_id: string
  position_id: string
  candidate_id: string
  rank: number
}

export interface CountJob {
  id: string
  election_id: string
  position_id: string
  started_by: string | null
  method: string
  seed: string | null
  started_at: Date
  finished_at: Date | null
  status: 'running' | 'completed' | 'failed'
  result_summary: Record<string, unknown> | null
}

export interface CountEvent {
  id: string
  job_id: string
  round_number: number
  payload: Record<string, unknown>
  created_at: Date
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ErrorResponse {
  error: string
  code?: string
  details?: unknown
}

// ============================================================================
// FRONTEND TYPES
// ============================================================================

export interface VoterWithStatus extends Voter {
  hasVoted: boolean
}

export interface PositionWithCandidates extends Position {
  candidates: Candidate[]
}

export interface ElectionWithDetails extends Election {
  positions: PositionWithCandidates[]
  voterCount: number
  ballotCount: number
}

export interface CountJobWithResults extends CountJob {
  winner?: string
  quota?: number
  totalBallots?: number
  rounds?: number
}

export interface CandidateVoteCount {
  candidate: Candidate
  votes: number
  percentage: number
  isWinner: boolean
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface ElectionFormData {
  name: string
  description?: string
  startDate?: string
  endDate?: string
}

export interface PositionFormData {
  name: string
  description?: string
  seats: number
  sort_order: number
}

export interface CandidateFormData {
  display_name: string
  manifesto_link?: string
}

export interface VoterFormData {
  full_name?: string
  student_id?: string
  email?: string
}

// ============================================================================
// BALLOT TYPES
// ============================================================================

export type BallotRankings = Record<string, string[]> // positionId -> candidateIds in order

export interface BallotSubmission {
  electionId: string
  token: string
  rankings: BallotRankings
  meta?: Record<string, unknown>
}

// ============================================================================
// STV COUNTING TYPES
// ============================================================================

export interface STVRoundAction {
  type: 'elect' | 'eliminate'
  winner?: string
  eliminated?: string
  transfers?: {
    from: string
    to: string | null
    ballotId: string
  }[]
}

export interface STVRound {
  round: number
  tallies: Record<string, number>
  exhausted: number
  action: STVRoundAction
}

export interface STVResult {
  winner: string | null
  quota: number
  totalBallots: number
  rounds: number
  seed: string
  roundDetails?: STVRound[]
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ElectionStatus = 'draft' | 'open' | 'paused' | 'closed'
export type CountJobStatus = 'running' | 'completed' | 'failed'

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

