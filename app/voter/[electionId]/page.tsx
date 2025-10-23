'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react'

type Election = {
  id: string
  name: string
  description: string | null
  status: string
}

type Position = {
  id: string
  name: string
  description: string | null
  seats: number
}

type Candidate = {
  id: string
  position_id: string
  display_name: string
  manifesto_link: string | null
  withdrawn: boolean
}

export default function VoterElectionPage({ params }: { params: Promise<{ electionId: string }> }) {
  const resolvedParams = React.use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [election, setElection] = useState<Election | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [rankings, setRankings] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [showTokenEntry, setShowTokenEntry] = useState(false)
  const [enteredToken, setEnteredToken] = useState('')
  const [verifyingToken, setVerifyingToken] = useState(false)

  useEffect(() => {
    if (token) {
      // Token provided in URL
      checkTokenAndLoadData()
    } else {
      // No token, show entry form
      setShowTokenEntry(true)
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, resolvedParams.electionId])

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enteredToken.trim()) {
      setError('Please enter your voting token')
      return
    }

    setVerifyingToken(true)
    setError('')

    // Use entered token and reload
    const urlWithToken = `/voter/${resolvedParams.electionId}?token=${enteredToken.trim()}`
    router.push(urlWithToken)
  }

  const checkTokenAndLoadData = async (tokenToUse?: string) => {
    const currentToken = tokenToUse || token
    if (!currentToken) return

    try {
      // Load election data
      const electionRes = await fetch('/api/elections')
      if (!electionRes.ok) throw new Error('Failed to load elections')
      
      const elections = await electionRes.json()
      const foundElection = elections.find((e: Election) => e.id === resolvedParams.electionId)
      
      if (!foundElection) {
        setError('Election not found')
        setLoading(false)
        return
      }

      setElection(foundElection)

      // Check election status
      if (foundElection.status !== 'open') {
        if (foundElection.status === 'draft') {
          setError('Voting has not started yet. Please wait for the election to open.')
        } else if (foundElection.status === 'closed') {
          setError('Voting has ended. This election is now closed.')
        } else {
          setError('This election is not currently open for voting.')
        }
        setLoading(false)
        return
      }

      // Verify token
      const tokenRes = await fetch('/api/voter/check-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ electionId: resolvedParams.electionId, token: currentToken }),
      })

      if (!tokenRes.ok) {
        setError('Failed to verify token')
        setLoading(false)
        return
      }

      const tokenData = await tokenRes.json()
      
      if (!tokenData.valid) {
        setError('Invalid voting token')
        setTokenValid(false)
        setLoading(false)
        return
      }

      if (tokenData.used) {
        setError('This voting token has already been used')
        setTokenValid(false)
        setLoading(false)
        return
      }

      setTokenValid(true)

      // Load positions and candidates
      const [positionsRes, candidatesRes] = await Promise.all([
        fetch(`/api/admin/positions?electionId=${resolvedParams.electionId}`),
        fetch(`/api/admin/candidates?electionId=${resolvedParams.electionId}`),
      ])

      if (positionsRes.ok && candidatesRes.ok) {
        const positionsData = await positionsRes.json()
        const candidatesData = await candidatesRes.json()

        setPositions(positionsData)
        setCandidates(candidatesData)

        // Initialize rankings
        const initialRankings: Record<string, string[]> = {}
        positionsData.forEach((position: Position) => {
          const positionCandidates = candidatesData
            .filter((c: Candidate) => c.position_id === position.id && !c.withdrawn)
            .map((c: Candidate) => c.id)
          initialRankings[position.id] = positionCandidates
        })
        setRankings(initialRankings)
      }
    } catch (err) {
      console.error('Failed to load ballot data:', err)
      setError('Failed to load ballot: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const moveCandidateUp = (positionId: string, candidateIndex: number) => {
    if (candidateIndex === 0) return
    
    setRankings(prev => {
      const newRanking = [...prev[positionId]]
      ;[newRanking[candidateIndex - 1], newRanking[candidateIndex]] = 
       [newRanking[candidateIndex], newRanking[candidateIndex - 1]]
      return { ...prev, [positionId]: newRanking }
    })
  }

  const moveCandidateDown = (positionId: string, candidateIndex: number) => {
    if (candidateIndex === rankings[positionId].length - 1) return
    
    setRankings(prev => {
      const newRanking = [...prev[positionId]]
      ;[newRanking[candidateIndex], newRanking[candidateIndex + 1]] = 
       [newRanking[candidateIndex + 1], newRanking[candidateIndex]]
      return { ...prev, [positionId]: newRanking }
    })
  }

  const handleSubmit = async () => {
    if (!confirm('Are you sure you want to submit your vote? This action cannot be undone.')) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/voter/submit-ballot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: resolvedParams.electionId,
          token,
          rankings,
          meta: {
            submitted_at: new Date().toISOString(),
            user_agent: navigator.userAgent,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit ballot')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ballot')
    } finally {
      setSubmitting(false)
    }
  }

  const isRankingComplete = () => {
    return Object.values(rankings).every(ranking => ranking.length > 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (showTokenEntry && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-indigo-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Voting Token</h3>
            <p className="text-sm text-gray-600">
              Please enter the unique token you received from the election administrator
            </p>
          </div>

          <form onSubmit={handleTokenSubmit}>
            <div className="mb-4">
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                Voting Token
              </label>
              <input
                type="text"
                id="token"
                value={enteredToken}
                onChange={(e) => setEnteredToken(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm text-gray-900 bg-white placeholder-gray-400"
                placeholder="Enter your token here..."
                disabled={verifyingToken}
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={verifyingToken}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={verifyingToken || !enteredToken.trim()}
              >
                {verifyingToken ? 'Verifying...' : 'Continue'}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Your voting token is unique to you. Do not share it with anyone.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (tokenValid === false || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">Voting Error</h3>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">Vote Submitted Successfully!</h3>
            <p className="mt-2 text-sm text-gray-600">
              Thank you for participating in this election. Your vote has been recorded anonymously.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!election) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Election not found</h2>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">{election.name}</h1>
            {election.description && (
              <p className="mt-2 text-gray-600">{election.description}</p>
            )}
            <div className="mt-4">
              <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                Voting Open
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Rank Your Preferences</h2>
            <p className="mt-1 text-sm text-gray-600">
              Use the arrow buttons to rank candidates in order of preference (1 = first choice).
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {positions.map((position) => {
                const positionCandidates = rankings[position.id]?.map(id => 
                  candidates.find(c => c.id === id)!
                ).filter(Boolean) || []

                return (
                  <div key={position.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{position.name}</h3>
                      {position.description && (
                        <p className="mt-1 text-sm text-gray-600">{position.description}</p>
                      )}
                      <p className="mt-2 text-sm text-gray-500">
                        Rank all {positionCandidates.length} candidates
                      </p>
                    </div>

                    <div className="space-y-3">
                      {positionCandidates.map((candidate, index) => (
                        <div
                          key={candidate.id}
                          className="p-4 border rounded-lg bg-white shadow-sm"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900">{candidate.display_name}</h4>
                              {candidate.manifesto_link && (
                                <a
                                  href={candidate.manifesto_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-indigo-600 hover:text-indigo-500"
                                >
                                  View Manifesto →
                                </a>
                              )}
                            </div>
                            <div className="flex flex-col space-y-1">
                              <button
                                onClick={() => moveCandidateUp(position.id, index)}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => moveCandidateDown(position.id, index)}
                                disabled={index === positionCandidates.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="px-6 py-4 bg-red-50 border-t border-red-200">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {isRankingComplete() ? (
                  <span className="text-green-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    All positions ranked
                  </span>
                ) : (
                  <span className="text-red-600">Please rank all positions</span>
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!isRankingComplete() || submitting}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Vote'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
