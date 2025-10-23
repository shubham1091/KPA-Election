export interface Election {
  id: string
  title: string
  description?: string
  starts_at?: string
  ends_at?: string
  status: 'draft' | 'open' | 'closed' | 'archived'
  created_by?: string
  created_at: string
  updated_at: string
  config?: any
  positions?: Position[]
}

export interface Position {
  id: string
  election_id: string
  name: string
  description?: string
  seats: number
  sort_order: number
  created_at: string
  candidates?: Candidate[]
}

export interface Candidate {
  id: string
  election_id: string
  position_id: string
  display_name: string
  manifesto_link?: string
  nominated_at: string
  withdrawn: boolean
}

export interface Voter {
  id: string
  election_id: string
  full_name?: string
  student_id?: string
  email?: string
  token_hash: string
  token_fingerprint?: string
  real_token: string
  prefilled_url?: string
  token_used_at?: string
  created_at: string
}

export interface Ballot {
  id: string
  election_id: string
  submitted_at: string
  meta?: any
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
  started_by?: string
  method: string
  seed?: string
  started_at: string
  finished_at?: string
  status: 'running' | 'completed' | 'failed'
  result_summary?: any
}

export interface CountEvent {
  id: string
  job_id: string
  round_number: number
  payload: any
  created_at: string
}

export interface Admin {
  id: string
  full_name: string
  email: string
  created_at: string
}

export interface TokenCheck {
  valid: boolean
  used: boolean
}

export interface VoterImportResult {
  success: boolean
  tokens: Array<{
    email?: string
    student_id?: string
    token: string
    prefilled_url: string
  }>
}

export interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface VotersResponse {
  voters: Voter[]
  pagination: PaginationInfo
}

export interface BallotSubmission {
  electionId: string
  token: string
  rankings: Record<string, string[]>
  meta?: any
}

export interface STVResult {
  winner?: string
  quota: number
  totalBallots: number
  rounds: number
  seed: string
}

