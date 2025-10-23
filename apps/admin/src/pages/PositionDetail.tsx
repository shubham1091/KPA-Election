import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, ArrowLeft, User } from 'lucide-react'
import { apiClient, Election, Position, Candidate } from '@stv-election/shared'

export function PositionDetail() {
  const { electionId, positionId } = useParams<{ electionId: string; positionId: string }>()
  const navigate = useNavigate()
  const [election, setElection] = useState<Election | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [showCandidateForm, setShowCandidateForm] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [newCandidate, setNewCandidate] = useState({
    display_name: '',
    manifesto_link: '',
    withdrawn: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (electionId && positionId) {
      loadData()
    }
  }, [electionId, positionId])

  const loadData = async () => {
    try {
      const [electionData, candidatesData] = await Promise.all([
        apiClient.getElection(electionId!),
        apiClient.getPositionCandidates(positionId!)
      ])
      setElection(electionData)
      setCandidates(candidatesData)
      
      // Find the position from election data
      const positions = await apiClient.getElectionPositions(electionId!)
      const positionData = positions.find(p => p.id === positionId)
      setPosition(positionData || null)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const candidate = await apiClient.createCandidate({
        ...newCandidate,
        election_id: electionId!,
        position_id: positionId!,
      })
      setCandidates([...candidates, candidate])
      setShowCandidateForm(false)
      setNewCandidate({ display_name: '', manifesto_link: '', withdrawn: false })
    } catch (err) {
      console.error('Failed to create candidate:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCandidate) return

    setSaving(true)
    try {
      const updated = await apiClient.updateCandidate(editingCandidate.id, {
        ...newCandidate,
      })
      setCandidates(candidates.map(c => c.id === editingCandidate.id ? updated : c))
      setShowCandidateForm(false)
      setEditingCandidate(null)
      setNewCandidate({ display_name: '', manifesto_link: '', withdrawn: false })
    } catch (err) {
      console.error('Failed to update candidate:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) {
      return
    }

    try {
      await apiClient.deleteCandidate(candidateId)
      setCandidates(candidates.filter(c => c.id !== candidateId))
    } catch (err) {
      console.error('Failed to delete candidate:', err)
    }
  }

  const handleEditCandidate = (candidate: Candidate) => {
    setEditingCandidate(candidate)
    setNewCandidate({
      display_name: candidate.display_name,
      manifesto_link: candidate.manifesto_link || '',
      withdrawn: candidate.withdrawn,
    })
    setShowCandidateForm(true)
  }

  const handleCloseForm = () => {
    setShowCandidateForm(false)
    setEditingCandidate(null)
    setNewCandidate({ display_name: '', manifesto_link: '', withdrawn: false })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!election || !position) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Position not found</h2>
          <button
            onClick={() => navigate(`/admin/elections/${electionId}`)}
            className="mt-4 btn btn-primary"
          >
            Back to Election
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
                onClick={() => navigate(`/admin/elections/${electionId}`)}
                className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to {election.title}
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{position.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-gray-500">
                  {candidates.length} candidates
                </span>
                <span className="text-sm text-gray-500">
                  Seats: {position.seats}
                </span>
              </div>
            </div>
            {election.status === 'draft' && (
              <button
                onClick={() => setShowCandidateForm(true)}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Candidate</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Position Info */}
          <div className="card mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Position Details</h3>
                {position.description && (
                  <p className="mt-2 text-gray-600">{position.description}</p>
                )}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Election:</span>
                    <span className="ml-2 text-gray-900">{election.title}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Seats Available:</span>
                    <span className="ml-2 text-gray-900">{position.seats}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Candidates:</span>
                    <span className="ml-2 text-gray-900">{candidates.length}</span>
                  </div>
                </div>
              </div>
              {election.status === 'draft' && (
                <div className="flex space-x-2">
                  <button className="btn btn-secondary flex items-center space-x-1">
                    <Edit className="h-4 w-4" />
                    <span>Edit Position</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Candidates */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Candidates</h3>
              {election.status === 'draft' && (
                <button
                  onClick={() => setShowCandidateForm(true)}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Candidate</span>
                </button>
              )}
            </div>

            {candidates.length === 0 ? (
              <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No candidates</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding candidates to this position.</p>
                {election.status === 'draft' && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCandidateForm(true)}
                      className="btn btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Candidate
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className={`border rounded-lg p-6 ${
                      candidate.withdrawn 
                        ? 'border-red-200 bg-red-50' 
                        : 'border-gray-200 hover:shadow-md'
                    } transition-shadow`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className={`text-lg font-medium ${
                          candidate.withdrawn ? 'text-red-800' : 'text-gray-900'
                        }`}>
                          {candidate.display_name}
                        </h4>
                        {candidate.withdrawn && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 mt-1">
                            Withdrawn
                          </span>
                        )}
                      </div>
                      {election.status === 'draft' && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditCandidate(candidate)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(candidate.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    {candidate.manifesto_link && (
                      <div className="mb-4">
                        <a
                          href={candidate.manifesto_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-500"
                        >
                          View Manifesto →
                        </a>
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      Nominated {new Date(candidate.nominated_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Candidate Form Modal */}
      {showCandidateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCandidate ? 'Edit Candidate' : 'Add Candidate'}
              </h3>
              <form onSubmit={editingCandidate ? handleUpdateCandidate : handleCreateCandidate}>
                <div className="mb-4">
                  <label className="label">Candidate Name</label>
                  <input
                    type="text"
                    className="input"
                    value={newCandidate.display_name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, display_name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="label">Manifesto Link (optional)</label>
                  <input
                    type="url"
                    className="input"
                    value={newCandidate.manifesto_link}
                    onChange={(e) => setNewCandidate({ ...newCandidate, manifesto_link: e.target.value })}
                    placeholder="https://example.com/manifesto"
                  />
                </div>
                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      checked={newCandidate.withdrawn}
                      onChange={(e) => setNewCandidate({ ...newCandidate, withdrawn: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Withdrawn</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="btn btn-secondary"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : (editingCandidate ? 'Update Candidate' : 'Add Candidate')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

