import { Election, Position, Candidate, Admin, TokenCheck, VoterImportResult, BallotSubmission, CountJob, VotersResponse } from '../types'

const API_BASE = '/api'

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    console.log('API Request:', { url, options })
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    console.log('API Response:', { status: response.status, statusText: response.statusText })

    if (!response.ok) {
      let errorMessage = 'Request failed'
      try {
        const error = await response.json()
        console.error('API Error Response:', error)
        errorMessage = error.error || error.message || `HTTP ${response.status}: ${response.statusText}`
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    console.log('API Success:', data)
    return data
  }

  // Elections
  async getElections(): Promise<Election[]> {
    return this.request<Election[]>('/elections')
  }

  async getElection(electionId: string): Promise<Election> {
    return this.request<Election>(`/elections/${electionId}`)
  }

  async getElectionPositions(electionId: string): Promise<Position[]> {
    return this.request<Position[]>(`/elections/${electionId}/positions`)
  }

  async getElectionCandidates(electionId: string): Promise<Candidate[]> {
    return this.request<Candidate[]>(`/elections/${electionId}/candidates`)
  }

  async createElection(election: Partial<Election>): Promise<Election> {
    return this.request<Election>('/elections', {
      method: 'POST',
      body: JSON.stringify(election),
    })
  }

  async updateElection(electionId: string, election: Partial<Election>): Promise<Election> {
    return this.request<Election>(`/elections/${electionId}`, {
      method: 'PUT',
      body: JSON.stringify(election),
    })
  }

  async deleteElection(electionId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/elections/${electionId}`, {
      method: 'DELETE',
    })
  }

  async closeElection(electionId: string, adminId: string): Promise<{ success: boolean; jobs: CountJob[] }> {
    return this.request<{ success: boolean; jobs: CountJob[] }>(`/elections/${electionId}/close`, {
      method: 'POST',
      body: JSON.stringify({ adminId }),
    })
  }

  // Positions
  async getPositionCandidates(positionId: string): Promise<Candidate[]> {
    return this.request<Candidate[]>(`/positions/${positionId}/candidates`)
  }

  async createPosition(position: Partial<Position>): Promise<Position> {
    return this.request<Position>('/positions', {
      method: 'POST',
      body: JSON.stringify(position),
    })
  }

  async updatePosition(positionId: string, position: Partial<Position>): Promise<Position> {
    return this.request<Position>(`/positions/${positionId}`, {
      method: 'PUT',
      body: JSON.stringify(position),
    })
  }

  async deletePosition(positionId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/positions/${positionId}`, {
      method: 'DELETE',
    })
  }

  // Candidates
  async createCandidate(candidate: Partial<Candidate>): Promise<Candidate> {
    return this.request<Candidate>('/candidates', {
      method: 'POST',
      body: JSON.stringify(candidate),
    })
  }

  async updateCandidate(candidateId: string, candidate: Partial<Candidate>): Promise<Candidate> {
    return this.request<Candidate>(`/candidates/${candidateId}`, {
      method: 'PUT',
      body: JSON.stringify(candidate),
    })
  }

  async deleteCandidate(candidateId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/candidates/${candidateId}`, {
      method: 'DELETE',
    })
  }

  // Authentication
  async adminLogin(email: string, password: string): Promise<{ success: boolean; admin: Admin }> {
    return this.request<{ success: boolean; admin: Admin }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async checkToken(electionId: string, token: string): Promise<TokenCheck> {
    return this.request<TokenCheck>('/voter/check-token', {
      method: 'POST',
      body: JSON.stringify({ electionId, token }),
    })
  }

  // Ballot submission
  async submitBallot(ballot: BallotSubmission): Promise<{ success: boolean; ballotId: string }> {
    return this.request<{ success: boolean; ballotId: string }>('/submit-ballot', {
      method: 'POST',
      body: JSON.stringify(ballot),
    })
  }

  // Voter import
  async importVoters(electionId: string, file: File): Promise<VoterImportResult> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/import-voters/${electionId}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Import failed' }))
      throw new Error(error.error || 'Import failed')
    }

    return response.json()
  }

  // Voters
  async getElectionVoters(electionId: string, page: number = 1, limit: number = 10): Promise<VotersResponse> {
    const response = await this.request<VotersResponse>(`/elections/${electionId}/voters?page=${page}&limit=${limit}`)
    return response
  }

  async downloadVoters(electionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/elections/${electionId}/voters/download`)
    if (!response.ok) {
      throw new Error('Failed to download voters')
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voters-${electionId}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // Results
  async getElectionResults(electionId: string): Promise<CountJob[]> {
    return this.request<CountJob[]>(`/elections/${electionId}/results`)
  }

  async getResultSummary(jobId: string): Promise<any> {
    return this.request<any>(`/results/${jobId}`)
  }

  async getResultRounds(jobId: string): Promise<any[]> {
    return this.request<any[]>(`/results/${jobId}/rounds`)
  }
}

export const apiClient = new ApiClient()
