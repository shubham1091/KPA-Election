'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { BarChart3, Trophy, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'

type Election = {
  id: string
  name: string
  description: string | null
  status: string
}

type Position = {
  id: string
  election_id: string
  name: string
  description: string | null
  seats: number
}

type Candidate = {
  id: string
  election_id: string
  position_id: string
  display_name: string
  manifesto_link: string | null
  withdrawn: boolean
}

type ResultSummary = {
  winner?: string
  winners?: string[]
  totalBallots?: number
  quota?: number
  rounds?: number
  firstPreferences?: Record<string, number>
  [key: string]: unknown
}

type Round = {
  round: number
  eliminated?: string
  elected?: string
  votes: Record<string, number>
  [key: string]: unknown
}

type CountJob = {
  id: string
  election_id: string
  position_id: string
  started_by: string | null
  method: string
  status: string
  started_at: string
  finished_at: string | null
  result_summary: ResultSummary | null
}

type PositionResult = {
  position: Position
  candidates: Candidate[]
  job: CountJob | null
  rounds?: Round[]
}

export default function ElectionResults() {
  const params = useParams()
  const router = useRouter()
  const [election, setElection] = useState<Election | null>(null)
  const [results, setResults] = useState<PositionResult[]>([])
  const [loading, setLoading] = useState(true)
  const [counting, setCounting] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<PositionResult | null>(null)
  const [showRoundDetails, setShowRoundDetails] = useState(false)

  useEffect(() => {
    loadResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadResults = async () => {
    try {
      // Fetch election data
      const electionsRes = await fetch('/api/elections')
      if (electionsRes.ok) {
        const elections = await electionsRes.json()
        const found = elections.find((e: Election) => e.id === params.electionId)
        if (found) setElection(found)
      }

      // Fetch results data
      const resultsRes = await fetch(`/api/admin/results?electionId=${params.electionId}`)
      if (resultsRes.ok) {
        const data = await resultsRes.json()

        // Combine positions with their jobs and candidates
        const positionResults: PositionResult[] = data.positions.map((position: Position) => {
          const job = data.jobs.find((j: CountJob) => j.position_id === position.id)
          const positionCandidates = data.candidates.filter(
            (c: Candidate) => c.position_id === position.id
          )

          return {
            position,
            candidates: positionCandidates,
            job: job || null,
          }
        })

        // Load detailed round data for completed jobs
        for (const result of positionResults) {
          if (result.job?.status === 'completed') {
            try {
              const roundsRes = await fetch(`/api/admin/results/${result.job.id}/rounds`)
              if (roundsRes.ok) {
                result.rounds = await roundsRes.json()
              }
            } catch (err) {
              console.error(`Failed to load rounds for position ${result.position.id}:`, err)
            }
          }
        }

        setResults(positionResults)
      }
    } catch (err) {
      console.error('Failed to load results:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewRoundDetails = (result: PositionResult) => {
    setSelectedPosition(result)
    setShowRoundDetails(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStartCount = async () => {
    if (!confirm('Start counting votes for this election? This will calculate results for all positions.')) {
      return
    }

    setCounting(true)
    try {
      const response = await fetch('/api/admin/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          election_id: params.electionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start count')
      }

      // Trigger the actual counting
      const runResponse = await fetch('/api/admin/run-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: params.electionId,
        }),
      })

      if (!runResponse.ok) {
        throw new Error('Failed to run count')
      }

      alert('Count started successfully!')
      // Reload results
      await loadResults()
    } catch (err) {
      console.error('Failed to start count:', err)
      alert('Failed to start count: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setCounting(false)
    }
  }

  const getCandidateName = (candidateId: string) => {
    for (const result of results) {
      const candidate = result.candidates.find((c) => c.id === candidateId)
      if (candidate) return candidate.display_name
    }
    return 'Unknown Candidate'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!election) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Election not found</h2>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Election Results</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-lg font-medium text-gray-900">{election.name}</span>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  {election.status}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                {results.filter((r) => r.job?.status === 'completed').length} of {results.length}{' '}
                positions counted
              </div>
              {results.length > 0 && results.every((r) => !r.job) && (
                <button
                  onClick={handleStartCount}
                  disabled={counting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {counting ? 'Starting Count...' : 'Start Count'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Election Summary */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Election Summary</h3>
                {election.description && (
                  <p className="mt-1 text-sm text-gray-600">{election.description}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{results.length}</div>
                  <div className="text-sm text-gray-500">Positions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {results.reduce((sum, r) => sum + r.candidates.length, 0)}
                  </div>
                  <div className="text-sm text-gray-500">Candidates</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {results.filter((r) => r.job?.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-500">Results Ready</div>
                </div>
              </div>
            </div>
          </div>

          {/* Position Results */}
          {results.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Results Available</h3>
              <p className="mt-1 text-sm text-gray-500">
                This election has no positions or results haven&apos;t been calculated yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {results.map((result) => (
                <div key={result.position.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{result.position.name}</h3>
                      {result.position.description && (
                        <p className="mt-1 text-sm text-gray-600">{result.position.description}</p>
                      )}
                    </div>
                    {result.job && (
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(result.job.status)}
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            result.job.status
                          )}`}
                        >
                          {result.job.status}
                        </span>
                      </div>
                    )}
                  </div>

                  {!result.job && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <h4 className="font-medium text-gray-900">Count Not Started</h4>
                          <p className="text-gray-600 text-sm">
                            Results will be available after the election is closed and counting is
                            complete.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.job?.status === 'completed' && result.job.result_summary && (
                    <div className="space-y-4">
                      {/* Winner */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <Trophy className="h-5 w-5 text-green-600 mr-2" />
                          <div>
                            <h4 className="font-medium text-green-900">Winner</h4>
                            <p className="text-green-700">
                              {result.job.result_summary.winner
                                ? getCandidateName(result.job.result_summary.winner)
                                : 'No winner determined'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Result Details */}
                      {result.job.result_summary.totalBallots !== undefined && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Total Ballots</div>
                            <div className="text-2xl font-bold text-gray-900">
                              {result.job.result_summary.totalBallots}
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Quota</div>
                            <div className="text-2xl font-bold text-gray-900">
                              {result.job.result_summary.quota || 'N/A'}
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Rounds</div>
                            <div className="text-2xl font-bold text-gray-900">
                              {result.job.result_summary.rounds || 'N/A'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Detailed Vote Counts */}
                      {result.job.result_summary.firstPreferences && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">First Preference Votes</h4>
                          <div className="space-y-3">
                            {Object.entries(result.job.result_summary.firstPreferences)
                              .sort(([, a], [, b]) => (b as number) - (a as number))
                              .map(([candidateId, votes]) => {
                                const candidate = result.candidates.find(c => c.id === candidateId)
                                if (!candidate) return null

                                const voteCount = votes as number
                                const percentage = result.job!.result_summary.totalBallots && result.job!.result_summary.totalBallots > 0
                                  ? ((voteCount / result.job!.result_summary.totalBallots) * 100).toFixed(1)
                                  : 0

                                const isWinner = candidateId === result.job!.result_summary.winner

                                return (
                                  <div key={candidateId} className="relative">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center space-x-2">
                                        {isWinner && (
                                          <Trophy className="h-4 w-4 text-yellow-500" />
                                        )}
                                        <span className={`text-sm ${isWinner ? 'font-semibold text-green-900' : 'text-gray-900'}`}>
                                          {candidate.display_name}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-3">
                                        <span className="text-sm text-gray-500">{percentage}%</span>
                                        <span className="text-sm font-medium text-gray-900">{voteCount} votes</span>
                                      </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full ${isWinner ? 'bg-green-500' : 'bg-blue-500'
                                          }`}
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {/* Method Note */}
                      {result.job.result_summary.note && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800">
                            <strong>Method:</strong> {result.job.result_summary.note}
                          </p>
                        </div>
                      )}

                      {/* Round Details Button */}
                      {result.rounds && result.rounds.length > 0 && (
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => handleViewRoundDetails(result)}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                          >
                            <BarChart3 className="h-4 w-4" />
                            <span>View Round Details</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {result.job?.status === 'running' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-blue-600 mr-2 animate-spin" />
                        <div>
                          <h4 className="font-medium text-blue-900">Counting in Progress</h4>
                          <p className="text-blue-700">STV calculation is running...</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.job?.status === 'failed' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                        <div>
                          <h4 className="font-medium text-red-900">Count Failed</h4>
                          <p className="text-red-700">
                            There was an error during the counting process.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Candidate List */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Candidates:</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.candidates.map((candidate) => (
                        <span
                          key={candidate.id}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${candidate.withdrawn
                              ? 'bg-gray-100 text-gray-600 line-through'
                              : 'bg-indigo-100 text-indigo-800'
                            }`}
                        >
                          {candidate.display_name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Round Details Modal */}
      {showRoundDetails && selectedPosition && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Round Details - {selectedPosition.position.name}
                </h3>
                <button
                  onClick={() => setShowRoundDetails(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedPosition.rounds?.map((round, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Round {round.round}</h4>

                    {/* Tallies */}
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Vote Counts</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(round.tallies || {}).map(([candidateId, votes]) => (
                          <div key={candidateId} className="bg-gray-50 rounded p-2">
                            <div className="text-sm font-medium text-gray-900">
                              {getCandidateName(candidateId)}
                            </div>
                            <div className="text-lg font-bold text-indigo-600">{String(votes)}</div>
                          </div>
                        ))}
                      </div>
                      {round.exhausted > 0 && (
                        <div className="mt-2 text-sm text-gray-500">
                          Exhausted ballots: {round.exhausted}
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    {round.action && (
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm font-medium text-gray-700">
                          {round.action.type === 'elect' ? (
                            <>
                              <span className="text-green-600">✓ Elected:</span>{' '}
                              {getCandidateName(round.action.winner)}
                            </>
                          ) : (
                            <>
                              <span className="text-red-600">✗ Eliminated:</span>{' '}
                              {getCandidateName(round.action.eliminated)}
                            </>
                          )}
                        </div>
                        {round.action.transfers && round.action.transfers.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            {round.action.transfers.length} ballot(s) transferred
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowRoundDetails(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

