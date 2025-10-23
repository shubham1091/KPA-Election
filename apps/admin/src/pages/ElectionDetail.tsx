import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, ArrowLeft, Users, Play, Pause, BarChart3, Download, Upload, ChevronLeft, ChevronRight, Copy, CheckCircle, Link as LinkIcon } from 'lucide-react'
import { apiClient, Election, Position, Candidate, Voter, VotersResponse, PaginationInfo } from '@stv-election/shared'

export function ElectionDetail() {
  const { electionId } = useParams<{ electionId: string }>()
  const navigate = useNavigate()
  const [election, setElection] = useState<Election | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [voters, setVoters] = useState<Voter[]>([])
  const [votersPagination, setVotersPagination] = useState<PaginationInfo | null>(null)
  const [votersPage, setVotersPage] = useState(1)
  const [votersLimit, setVotersLimit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [showPositionForm, setShowPositionForm] = useState(false)
  const [showVoterImport, setShowVoterImport] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [newPosition, setNewPosition] = useState({
    name: '',
    description: '',
    seats: 1,
  })
  const [editElection, setEditElection] = useState({
    title: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (electionId) {
      loadElectionData()
    }
  }, [electionId])

  const loadElectionData = async () => {
    try {
      const [electionData, positionsData, candidatesData] = await Promise.all([
        apiClient.getElection(electionId!),
        apiClient.getElectionPositions(electionId!),
        apiClient.getElectionCandidates(electionId!)
      ])
      
      setElection(electionData)
      setPositions(positionsData)
      setCandidates(candidatesData)
      
      // Load voters with pagination
      await loadVoters()
    } catch (err) {
      console.error('Failed to load election data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadVoters = async (page: number = votersPage, limit: number = votersLimit) => {
    try {
      const votersResponse = await apiClient.getElectionVoters(electionId!, page, limit)
      setVoters(votersResponse.voters)
      setVotersPagination(votersResponse.pagination)
      setVotersPage(page)
    } catch (err) {
      console.error('Failed to load voters:', err)
    }
  }

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const position = await apiClient.createPosition({
        ...newPosition,
        election_id: electionId!,
        sort_order: positions.length,
      })
      setPositions([...positions, position])
      setShowPositionForm(false)
      setNewPosition({ name: '', description: '', seats: 1 })
    } catch (err) {
      console.error('Failed to create position:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePosition = async (positionId: string) => {
    if (!confirm('Are you sure you want to delete this position? This will also delete all candidates.')) {
      return
    }

    try {
      await apiClient.deletePosition(positionId)
      setPositions(positions.filter(p => p.id !== positionId))
      setCandidates(candidates.filter(c => c.position_id !== positionId))
    } catch (err) {
      console.error('Failed to delete position:', err)
    }
  }

  const handleImportVoters = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importFile) return

    setImporting(true)
    try {
      const result = await apiClient.importVoters(electionId!, importFile)
      if (result.success) {
        // Reload voters with pagination
        await loadVoters(1, votersLimit) // Go to first page after import
        setShowVoterImport(false)
        setImportFile(null)
        alert(`Successfully imported ${result.tokens.length} voters`)
      }
    } catch (err: any) {
      console.error('Failed to import voters:', err)
      alert(`Failed to import voters: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const handleOpenElection = async () => {
    if (!confirm('Are you sure you want to open this election for voting? This action cannot be undone.')) {
      return
    }

    try {
      await apiClient.updateElection(electionId!, { status: 'open' })
      setElection({ ...election!, status: 'open' })
    } catch (err) {
      console.error('Failed to open election:', err)
    }
  }

  const handleCloseElection = async () => {
    if (!confirm('Are you sure you want to close this election? This will start the counting process.')) {
      return
    }

    try {
      const adminData = localStorage.getItem('admin')
      if (!adminData) {
        throw new Error('Admin not logged in')
      }
      const admin = JSON.parse(adminData)
      
      const result = await apiClient.closeElection(electionId!, admin.id)
      if (result.success) {
        setElection({ ...election!, status: 'closed' })
        alert('Election closed and counting started')
      }
    } catch (err: any) {
      console.error('Failed to close election:', err)
      alert(`Failed to close election: ${err.message}`)
    }
  }

  const handlePauseElection = async () => {
    if (!confirm('Are you sure you want to pause this election? Voters will not be able to vote until it is resumed.')) {
      return
    }

    try {
      await apiClient.updateElection(electionId!, { status: 'paused' })
      setElection({ ...election!, status: 'paused' })
      alert('Election paused successfully')
    } catch (err: any) {
      console.error('Failed to pause election:', err)
      alert(`Failed to pause election: ${err.message}`)
    }
  }

  const handleResumeElection = async () => {
    if (!confirm('Are you sure you want to resume this election? Voters will be able to vote again.')) {
      return
    }

    try {
      await apiClient.updateElection(electionId!, { status: 'open' })
      setElection({ ...election!, status: 'open' })
      alert('Election resumed successfully')
    } catch (err: any) {
      console.error('Failed to resume election:', err)
      alert(`Failed to resume election: ${err.message}`)
    }
  }

  const handleEditElection = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const updatedElection = await apiClient.updateElection(electionId!, editElection)
      setElection(updatedElection)
      setShowEditForm(false)
      alert('Election updated successfully')
    } catch (err: any) {
      console.error('Failed to update election:', err)
      alert(`Failed to update election: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const openEditForm = () => {
    setEditElection({
      title: election?.title || '',
      description: election?.description || '',
    })
    setShowEditForm(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'open': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'closed': return 'bg-red-100 text-red-800'
      case 'archived': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const generatePrefilledUrl = (voter: Voter) => {
    // Use stored prefilled URL if available, otherwise generate one
    if (voter.prefilled_url) {
      return voter.prefilled_url
    }
    // Fallback: generate URL if not stored (for backwards compatibility)
    const baseUrl = window.location.origin
    return `${baseUrl}/direct/${electionId}/${voter.real_token}`
  }

  const copyUrlToClipboard = async (voter: Voter) => {
    try {
      const url = generatePrefilledUrl(voter)
      await navigator.clipboard.writeText(url)
      setCopiedUrl(voter.real_token)
      // Clear the copied state after 2 seconds
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = generatePrefilledUrl(voter)
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedUrl(voter.real_token)
      setTimeout(() => setCopiedUrl(null), 2000)
    }
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
            onClick={() => navigate('/admin/dashboard')}
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
                onClick={() => navigate('/admin/dashboard')}
                className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{election.title}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(election.status)}`}>
                  {election.status}
                </span>
                <span className="text-sm text-gray-500">
                  {positions.length} positions
                </span>
                <span className="text-sm text-gray-500">
                  {candidates.length} candidates
                </span>
                <span className="text-sm text-gray-500">
                  {votersPagination?.totalCount || voters.length} voters
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {election.status === 'draft' && (
                <>
                  <button
                    onClick={() => setShowPositionForm(true)}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Position</span>
                  </button>
                  <button
                    onClick={() => setShowVoterImport(true)}
                    className="btn btn-secondary flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Import Voters</span>
                  </button>
                  <button
                    onClick={handleOpenElection}
                    className="btn btn-success flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>Open Election</span>
                  </button>
                </>
              )}
              {election.status === 'open' && (
                <>
                  <button
                    onClick={handlePauseElection}
                    className="btn btn-warning flex items-center space-x-2"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pause Election</span>
                  </button>
                  <button
                    onClick={handleCloseElection}
                    className="btn btn-danger flex items-center space-x-2"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Close Election</span>
                  </button>
                </>
              )}
              {election.status === 'paused' && (
                <>
                  <button
                    onClick={handleResumeElection}
                    className="btn btn-success flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>Resume Election</span>
                  </button>
                  <button
                    onClick={handleCloseElection}
                    className="btn btn-danger flex items-center space-x-2"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Close Election</span>
                  </button>
                </>
              )}
              {election.status === 'closed' && (
                <button
                  onClick={() => navigate(`/admin/results/${electionId}`)}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>View Results</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Election Info */}
          <div className="card mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Election Details</h3>
                {election.description && (
                  <p className="mt-2 text-gray-600">{election.description}</p>
                )}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Status:</span>
                    <span className="ml-2 text-gray-900">{election.status}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Positions:</span>
                    <span className="ml-2 text-gray-900">{positions.length}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Candidates:</span>
                    <span className="ml-2 text-gray-900">{candidates.length}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Voters:</span>
                    <span className="ml-2 text-gray-900">{votersPagination?.totalCount || voters.length}</span>
                  </div>
                </div>
              </div>
              {election.status === 'draft' && (
                <div className="flex space-x-2">
                  <button 
                    onClick={openEditForm}
                    className="btn btn-secondary flex items-center space-x-1"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Election</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Positions */}
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Positions</h3>
              {election.status === 'draft' && (
                <button
                  onClick={() => setShowPositionForm(true)}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Position</span>
                </button>
              )}
            </div>

            {positions.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No positions</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding positions to this election.</p>
                {election.status === 'draft' && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowPositionForm(true)}
                      className="btn btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Position
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {positions.map((position) => {
                  const positionCandidates = candidates.filter(c => c.position_id === position.id)
                  return (
                    <div
                      key={position.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            {position.name}
                          </h4>
                          {position.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {position.description}
                            </p>
                          )}
                        </div>
                        {election.status === 'draft' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => navigate(`/admin/elections/${electionId}/positions/${position.id}`)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePosition(position.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>{position.seats} seat{position.seats !== 1 ? 's' : ''}</span>
                          <span>{positionCandidates.length} candidates</span>
                        </div>
                        <button
                          onClick={() => navigate(`/admin/elections/${electionId}/positions/${position.id}`)}
                          className="text-primary-600 hover:text-primary-500"
                        >
                          Manage →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Voters */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-medium text-gray-900">Voters</h3>
                {votersPagination && (
                  <span className="text-sm text-gray-500">
                    {votersPagination.totalCount} total
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {/* Page size selector */}
                <div className="flex items-center space-x-2">
                  <label htmlFor="page-size" className="text-sm text-gray-500">
                    Show:
                  </label>
                  <select
                    id="page-size"
                    value={votersLimit}
                    onChange={(e) => {
                      const newLimit = parseInt(e.target.value)
                      setVotersLimit(newLimit)
                      loadVoters(1, newLimit) // Go to first page when changing limit
                    }}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                {election.status === 'draft' && (
                  <button
                    onClick={() => setShowVoterImport(true)}
                    className="btn btn-secondary flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Import Voters</span>
                  </button>
                )}
                <button
                  onClick={() => apiClient.downloadVoters(electionId!)}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {voters.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No voters</h3>
                <p className="mt-1 text-sm text-gray-500">Import voters to enable voting in this election.</p>
                {election.status === 'draft' && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowVoterImport(true)}
                      className="btn btn-primary"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import Voters
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Help Section */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <LinkIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Prefilled Voting URLs</h4>
                      <p className="mt-1 text-sm text-blue-700">
                        Generate direct voting links for each voter. Click "Copy Link" to copy individual URLs. 
                        Voters can click these links to go directly to their ballot without selecting elections or entering tokens.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Token
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Voting Link
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vote Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {voters.map((voter) => (
                      <tr key={voter.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {voter.full_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {voter.student_id || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {voter.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          <span 
                            className="truncate block max-w-[120px]" 
                            title={voter.real_token}
                          >
                            {voter.real_token}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => copyUrlToClipboard(voter)}
                            className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                              copiedUrl === voter.real_token
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                            disabled={!!voter.token_used_at}
                          >
                            {copiedUrl === voter.real_token ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copy Link
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            voter.token_used_at 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {voter.token_used_at ? 'Voted' : 'Not Voted'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {votersPagination && votersPagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => loadVoters(votersPage - 1, votersLimit)}
                      disabled={!votersPagination.hasPrev}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => loadVoters(votersPage + 1, votersLimit)}
                      disabled={!votersPagination.hasNext}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">
                          {((votersPage - 1) * votersLimit) + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(votersPage * votersLimit, votersPagination.totalCount)}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">{votersPagination.totalCount}</span>{' '}
                        results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => loadVoters(votersPage - 1, votersLimit)}
                          disabled={!votersPagination.hasPrev}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        
                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, votersPagination.totalPages) }, (_, i) => {
                          const startPage = Math.max(1, votersPage - 2)
                          const pageNum = startPage + i
                          if (pageNum > votersPagination.totalPages) return null
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => loadVoters(pageNum, votersLimit)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === votersPage
                                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                        
                        <button
                          onClick={() => loadVoters(votersPage + 1, votersLimit)}
                          disabled={!votersPagination.hasNext}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Position Form Modal */}
      {showPositionForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Position</h3>
              <form onSubmit={handleCreatePosition}>
                <div className="mb-4">
                  <label className="label">Position Name</label>
                  <input
                    type="text"
                    className="input"
                    value={newPosition.name}
                    onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={newPosition.description}
                    onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                    placeholder="Optional description for the position"
                  />
                </div>
                <div className="mb-6">
                  <label className="label">Number of Seats</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={newPosition.seats}
                    onChange={(e) => setNewPosition({ ...newPosition, seats: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPositionForm(false)}
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
                    {saving ? 'Creating...' : 'Create Position'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Voter Import Modal */}
      {showVoterImport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Voters</h3>
              <form onSubmit={handleImportVoters}>
                <div className="mb-4">
                  <label className="label">CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    className="input"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Upload a CSV file with columns: name (or full_name), student_id, email
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowVoterImport(false)}
                    className="btn btn-secondary"
                    disabled={importing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={importing || !importFile}
                  >
                    {importing ? 'Importing...' : 'Import Voters'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Election Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Election</h3>
              <form onSubmit={handleEditElection}>
                <div className="mb-4">
                  <label className="label">Election Title</label>
                  <input
                    type="text"
                    className="input"
                    value={editElection.title}
                    onChange={(e) => setEditElection({ ...editElection, title: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={editElection.description}
                    onChange={(e) => setEditElection({ ...editElection, description: e.target.value })}
                    placeholder="Optional description for the election"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
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
                    {saving ? 'Saving...' : 'Save Changes'}
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