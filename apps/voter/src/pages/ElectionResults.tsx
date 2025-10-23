import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BarChart3, Trophy, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { apiClient, Election, Position, Candidate, CountJob, STVResult } from '@stv-election/shared'

interface PositionResult {
  position: Position
  candidates: Candidate[]
  job: CountJob
  result?: STVResult
  rounds?: any[]
}

export function ElectionResults() {
  const { electionId } = useParams<{ electionId: string }>()
  const navigate = useNavigate()
  const [election, setElection] = useState<Election | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [results, setResults] = useState<PositionResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState<PositionResult | null>(null)
  const [showRoundDetails, setShowRoundDetails] = useState(false)

  useEffect(() => {
    if (electionId) {
      loadResults()
    }
  }, [electionId])

  const loadResults = async () => {
    try {
      const [electionData, positionsData, candidatesData, jobsData] = await Promise.all([
        apiClient.getElection(electionId!),
        apiClient.getElectionPositions(electionId!),
        apiClient.getElectionCandidates(electionId!),
        apiClient.getElectionResults(electionId!)
      ])
      
      setElection(electionData)
      setPositions(positionsData)
      setCandidates(candidatesData)
      
      // Combine results with positions
      const positionResults: PositionResult[] = positionsData.map(position => {
        const job = jobsData.find(j => j.position_id === position.id)
        const positionCandidates = candidatesData.filter(c => c.position_id === position.id)
        return {
          position,
          candidates: positionCandidates,
          job: job!,
        }
      })
      
      setResults(positionResults)
      
      // Load detailed results for completed jobs
      for (const result of positionResults) {
        if (result.job.status === 'completed') {
          try {
            const [resultSummary, rounds] = await Promise.all([
              apiClient.getResultSummary(result.job.id),
              apiClient.getResultRounds(result.job.id)
            ])
            result.result = resultSummary
            result.rounds = rounds
          } catch (err) {
            console.error(`Failed to load results for position ${result.position.id}:`, err)
          }
        }
      }
      
      setResults([...positionResults])
    } catch (err) {
      console.error('Failed to load results:', err)
    } finally {
      setLoading(false)
    }
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

  const getCandidateName = (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId)
    return candidate?.display_name || 'Unknown Candidate'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!election) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Election not found</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 btn btn-primary"
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
                onClick={() => navigate('/')}
                className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Election Results</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-lg font-medium text-gray-900">{election.title}</span>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  Closed
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                {results.filter(r => r.job.status === 'completed').length} of {results.length} positions counted
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Election Summary */}
          <div className="card mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Election Summary</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {election.description}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{positions.length}</div>
                  <div className="text-sm text-gray-500">Positions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{candidates.length}</div>
                  <div className="text-sm text-gray-500">Candidates</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {results.filter(r => r.job.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-500">Results Ready</div>
                </div>
              </div>
            </div>
          </div>

          {/* Position Results */}
          <div className="space-y-6">
            {results.map((result) => (
              <div key={result.position.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{result.position.name}</h3>
                    {result.position.description && (
                      <p className="mt-1 text-sm text-gray-600">{result.position.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.job.status)}
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(result.job.status)}`}>
                      {result.job.status}
                    </span>
                  </div>
                </div>

                {result.job.status === 'completed' && result.result && (
                  <div className="space-y-4">
                    {/* Winner */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Trophy className="h-5 w-5 text-green-600 mr-2" />
                        <div>
                          <h4 className="font-medium text-green-900">Winner</h4>
                          <p className="text-green-700">
                            {getCandidateName(result.result.winner || '')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Result Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500">Total Ballots</div>
                        <div className="text-2xl font-bold text-gray-900">{result.result.totalBallots}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500">Quota</div>
                        <div className="text-2xl font-bold text-gray-900">{result.result.quota}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500">Rounds</div>
                        <div className="text-2xl font-bold text-gray-900">{result.result.rounds}</div>
                      </div>
                    </div>

                    {/* Round Details Button */}
                    {result.rounds && result.rounds.length > 0 && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setSelectedPosition(result)
                            setShowRoundDetails(true)
                          }}
                          className="btn btn-secondary flex items-center space-x-2"
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>View Round Details</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {result.job.status === 'running' && (
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

                {result.job.status === 'failed' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      <div>
                        <h4 className="font-medium text-red-900">Count Failed</h4>
                        <p className="text-red-700">There was an error during the counting process.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
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
                  className="text-gray-400 hover:text-gray-600"
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
                            <div className="text-lg font-bold text-primary-600">{String(votes)}</div>
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
                          {round.action.type === 'elect' ? 'Elected' : 'Eliminated'}: {getCandidateName(round.action.winner || round.action.eliminated)}
                        </div>
                        {round.action.transfers && round.action.transfers.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            {round.action.transfers.length} ballots transferred
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
                  className="btn btn-secondary"
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
