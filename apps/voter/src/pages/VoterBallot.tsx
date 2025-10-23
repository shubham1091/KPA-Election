import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CheckCircle, AlertCircle, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import { apiClient, Election, Position, Candidate } from '@stv-election/shared'

interface SortableCandidateProps {
  candidate: Candidate
  rank: number
  isActive: boolean
}

function SortableCandidate({ candidate, rank, isActive }: SortableCandidateProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border rounded-lg bg-white ${
        isDragging ? 'shadow-lg' : 'shadow-sm'
      } ${isActive ? 'border-primary-300' : 'border-gray-200'}`}
    >
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="flex flex-col">
            <button
              className="p-1 text-gray-400 hover:text-gray-600"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-600 rounded-full text-sm font-medium">
            {rank}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{candidate.display_name}</h4>
          {candidate.manifesto_link && (
            <a
              href={candidate.manifesto_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              View Manifesto →
            </a>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="p-1 text-gray-400 hover:text-gray-600"
            onClick={() => {
              // Move up logic would be handled by parent
            }}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            className="p-1 text-gray-400 hover:text-gray-600"
            onClick={() => {
              // Move down logic would be handled by parent
            }}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function VoterBallot() {
  const { electionId, token } = useParams<{ electionId: string; token: string }>()
  const navigate = useNavigate()
  const [election, setElection] = useState<Election | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [rankings, setRankings] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  
  // Check if this is a direct link (from /direct route)
  // const isDirectLink = window.location.pathname.startsWith('/direct/')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (electionId && token) {
      checkTokenAndLoadData()
    }
  }, [electionId, token])

  const checkTokenAndLoadData = async () => {
    try {
      // Load election data first to check status
      const [electionData, positionsData, candidatesData] = await Promise.all([
        apiClient.getElection(electionId!),
        apiClient.getElectionPositions(electionId!),
        apiClient.getElectionCandidates(electionId!)
      ])
      
      setElection(electionData)
      
      // Check if election is open for voting
      if (electionData.status !== 'open') {
        if (electionData.status === 'draft') {
          setError('Voting has not started yet. Please wait for the election to open.')
        } else if (electionData.status === 'closed') {
          setError('Voting has ended. This election is now closed.')
        } else if (electionData.status === 'archived') {
          setError('This election has been archived and is no longer available.')
        } else {
          setError('This election is not currently open for voting.')
        }
        setLoading(false)
        return
      }

      // Check if token is valid and not already used
      const tokenCheck = await apiClient.checkToken(electionId!, token!)
      setTokenValid(tokenCheck.valid)
      
      if (!tokenCheck.valid) {
        setError('Invalid voting token')
        setLoading(false)
        return
      }
      
      if (tokenCheck.used) {
        setError('This voting token has already been used')
        setLoading(false)
        return
      }
      
      setPositions(positionsData)
      setCandidates(candidatesData)
      
      // Initialize rankings with all candidates for each position
      const initialRankings: Record<string, string[]> = {}
      positionsData.forEach(position => {
        const positionCandidates = candidatesData
          .filter(c => c.position_id === position.id && !c.withdrawn)
          .map(c => c.id)
        initialRankings[position.id] = positionCandidates
      })
      setRankings(initialRankings)
    } catch (err) {
      console.error('Failed to load ballot data:', err)
      setError('Failed to load ballot')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = (event: any, positionId: string) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = rankings[positionId].indexOf(active.id)
      const newIndex = rankings[positionId].indexOf(over.id)
      
      setRankings(prev => ({
        ...prev,
        [positionId]: arrayMove(prev[positionId], oldIndex, newIndex)
      }))
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    try {
      await apiClient.submitBallot({
        electionId: electionId!,
        token: token!,
        rankings,
        meta: {
          submitted_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
        }
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit ballot')
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
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
                onClick={() => navigate('/')}
                className="btn btn-primary"
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
              Thank you for participating in this election. Your vote has been recorded.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/')}
                className="btn btn-primary"
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
            onClick={() => navigate('/')}
            className="mt-4 btn btn-primary"
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
            <h1 className="text-3xl font-bold text-gray-900">{election.title}</h1>
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
              Drag and drop to rank candidates in order of preference. Your first choice will receive your vote.
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
              {positions.map((position) => {
                const positionCandidates = candidates
                  .filter(c => c.position_id === position.id && !c.withdrawn)
                  .map(c => ({ ...c, rank: rankings[position.id]?.indexOf(c.id) + 1 || 0 }))
                  .sort((a, b) => a.rank - b.rank)

                return (
                  <div key={position.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{position.name}</h3>
                      {position.description && (
                        <p className="mt-1 text-sm text-gray-600">{position.description}</p>
                      )}
                      <p className="mt-2 text-sm text-gray-500">
                        Rank all {positionCandidates.length} candidates in order of preference
                      </p>
                    </div>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event: any) => handleDragEnd(event, position.id)}
                    >
                      <SortableContext
                        items={rankings[position.id] || []}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {positionCandidates.map((candidate, index) => (
                            <SortableCandidate
                              key={candidate.id}
                              candidate={candidate}
                              rank={index + 1}
                              isActive={true}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
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
                  <span className="text-green-600">✓ All positions ranked</span>
                ) : (
                  <span className="text-red-600">Please rank all positions</span>
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!isRankingComplete() || submitting}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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

