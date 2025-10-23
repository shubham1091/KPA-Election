'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  Plus, Edit, Trash2, ArrowLeft, Users, Play, Pause, 
  Upload, Download, Copy, CheckCircle, BarChart3 
} from 'lucide-react'

type Election = {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
}

type Position = {
  id: string
  election_id: string
  name: string
  description: string | null
  seats: number
  sort_order: number
}

type Candidate = {
  id: string
  election_id: string
  position_id: string
  display_name: string
  manifesto_link: string | null
  withdrawn: boolean
}

type Voter = {
  id: string
  election_id: string
  full_name: string | null
  student_id: string | null
  email: string | null
  real_token: string
  token_used_at: string | null
  prefilled_url: string | null
}

export default function ElectionDetail() {
  const params = useParams()
  const router = useRouter()
  const [election, setElection] = useState<Election | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [voters, setVoters] = useState<Voter[]>([])
  const [votersPage, setVotersPage] = useState(1)
  const [votersLimit, setVotersLimit] = useState(10)
  const [votersPagination, setVotersPagination] = useState<{
    totalCount: number
    totalPages: number
    currentPage: number
    hasPrev: boolean
    hasNext: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPositionForm, setShowPositionForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showVoterImport, setShowVoterImport] = useState(false)
  const [newPosition, setNewPosition] = useState({ name: '', description: '', seats: 1 })
  const [editElection, setEditElection] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    loadElectionData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadElectionData = async () => {
    try {
      const [electionsRes, positionsRes, candidatesRes] = await Promise.all([
        fetch('/api/elections'),
        fetch(`/api/admin/positions?electionId=${params.electionId}`),
        fetch(`/api/admin/candidates?electionId=${params.electionId}`),
      ])

      if (electionsRes.ok) {
        const elections = await electionsRes.json()
        const found = elections.find((e: Election) => e.id === params.electionId)
        if (found) {
          setElection(found)
          setEditElection({ name: found.name, description: found.description || '' })
        }
      }

      if (positionsRes.ok) {
        const positionsData = await positionsRes.json()
        setPositions(positionsData)
      }

      if (candidatesRes.ok) {
        const candidatesData = await candidatesRes.json()
        setCandidates(candidatesData)
      }

      await loadVoters()
    } catch (err) {
      console.error('Failed to load election data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadVoters = async (page = votersPage, limit = votersLimit) => {
    try {
      const response = await fetch(
        `/api/admin/voters?electionId=${params.electionId}&page=${page}&limit=${limit}`
      )
      if (response.ok) {
        const data = await response.json()
        setVoters(data.voters)
        setVotersPagination(data.pagination)
        setVotersPage(page)
      }
    } catch (err) {
      console.error('Failed to load voters:', err)
    }
  }

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          election_id: params.electionId,
          name: newPosition.name,
          description: newPosition.description,
          seats: newPosition.seats,
          sort_order: positions.length,
        }),
      })

      if (response.ok) {
        const position = await response.json()
        setPositions([...positions, position])
        setShowPositionForm(false)
        setNewPosition({ name: '', description: '', seats: 1 })
      }
    } catch (err) {
      console.error('Failed to create position:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePosition = async (positionId: string) => {
    if (!confirm('Are you sure? This will also delete all candidates.')) return

    try {
      const response = await fetch(`/api/admin/positions?id=${positionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPositions(positions.filter((p) => p.id !== positionId))
        setCandidates(candidates.filter((c) => c.position_id !== positionId))
      }
    } catch (err) {
      console.error('Failed to delete position:', err)
    }
  }

  const handleEditElection = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/elections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: params.electionId,
          name: editElection.name,
          description: editElection.description,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        setElection(updated)
        setShowEditForm(false)
        alert('Election updated successfully')
      }
    } catch (err) {
      console.error('Failed to update election:', err)
      alert('Failed to update election')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenElection = async () => {
    if (!confirm('Open this election for voting?')) return

    try {
      const response = await fetch('/api/admin/elections/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: params.electionId, status: 'open' }),
      })

      if (response.ok) {
        const updated = await response.json()
        setElection(updated)
      }
    } catch (err) {
      console.error('Failed to open election:', err)
    }
  }

  const handleCloseElection = async () => {
    if (!confirm('Close this election?\n\nThis will:\n• Stop accepting new votes\n• Automatically count all votes\n• Calculate results using STV method\n\nThis may take a few moments...')) return

    try {
      // Close the election - this now automatically triggers vote counting!
      const response = await fetch('/api/admin/elections/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: params.electionId, status: 'closed' }),
      })

      if (!response.ok) {
        throw new Error('Failed to close election')
      }

      const updated = await response.json()
      setElection(updated)

      // Show success message with detailed results
      const jobsCreated = updated.jobsCreated || 0
      const jobsCompleted = updated.jobsCompleted || 0
      const jobsFailed = updated.jobsFailed || 0
      
      let message = `Election closed successfully!\n\n`
      message += `${jobsCreated} position(s) processed:\n`
      message += `✅ ${jobsCompleted} completed successfully\n`
      if (jobsFailed > 0) {
        message += `❌ ${jobsFailed} failed\n`
      }
      message += `\nRedirecting to results page...`
      
      alert(message)
      
      // Navigate to results page
      router.push(`/admin/results/${params.electionId}`)

    } catch (err) {
      console.error('Failed to close election:', err)
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}\n\nPlease try again or check the results page.`)
    }
  }

  const handlePauseElection = async () => {
    if (!confirm('Pause this election? Voters cannot vote while paused.')) return

    try {
      const response = await fetch('/api/admin/elections/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: params.electionId, status: 'paused' }),
      })

      if (response.ok) {
        const updated = await response.json()
        setElection(updated)
      }
    } catch (err) {
      console.error('Failed to pause election:', err)
    }
  }

  const handleImportVoters = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importFile) {
      alert('Please select a CSV file')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('electionId', params.electionId as string)

      const response = await fetch('/api/admin/voters', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Successfully imported ${result.count} voters!`)
        
        // Reload voters
        await loadVoters(1, votersLimit)
        
        // Close modal and reset
        setShowVoterImport(false)
        setImportFile(null)
      } else {
        const error = await response.json()
        alert(`Failed to import voters: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to import voters:', err)
      alert(`Failed to import voters: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadVoters = async () => {
    try {
      const response = await fetch(
        `/api/admin/voters?electionId=${params.electionId}&download=true`
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `voters-${election?.name || 'election'}-${Date.now()}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to download voters data')
      }
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download voters data')
    }
  }

  const copyUrlToClipboard = async (voter: Voter) => {
    try {
      const url = voter.prefilled_url || `${window.location.origin}/voter/${params.electionId}?token=${voter.real_token}`
      await navigator.clipboard.writeText(url)
      setCopiedUrl(voter.real_token)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'open': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'closed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
              <h1 className="text-3xl font-bold text-gray-900">{election.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(election.status)}`}>
                {election.status}
              </span>
                <span className="text-sm text-gray-500">{positions.length} positions</span>
                <span className="text-sm text-gray-500">{candidates.length} candidates</span>
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Position
                  </button>
                  <button
                    onClick={handleOpenElection}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Open Election
                  </button>
                </>
              )}
              {election.status === 'open' && (
                <>
                  <button
                    onClick={handlePauseElection}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </button>
                  <button
                    onClick={handleCloseElection}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Close
                  </button>
                </>
              )}
              {election.status === 'paused' && (
                <>
                  <button
                    onClick={handleOpenElection}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </button>
                  <button
                    onClick={handleCloseElection}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Close
                  </button>
                </>
              )}
              {election.status === 'closed' && (
                <button
                  onClick={() => router.push(`/admin/results/${params.electionId}`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Results
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
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Election Details</h3>
                {election.description && (
                  <p className="mt-2 text-gray-600">{election.description}</p>
                )}
              </div>
              {election.status === 'draft' && (
                <button
                  onClick={() => setShowEditForm(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Positions */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Positions</h3>
              {election.status === 'draft' && (
                <button
                  onClick={() => setShowPositionForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Position
                </button>
              )}
            </div>

            {positions.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No positions</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding positions.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {positions.map((position) => {
                  const positionCandidates = candidates.filter((c) => c.position_id === position.id)
                  return (
                    <div
                      key={position.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                <div>
                          <h4 className="text-lg font-medium text-gray-900">{position.name}</h4>
                          {position.description && (
                            <p className="text-sm text-gray-600 mt-1">{position.description}</p>
                          )}
                        </div>
                        {election.status === 'draft' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() =>
                                router.push(
                                  `/admin/elections/${params.electionId}/positions/${position.id}`
                                )
                              }
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
                          <span>{position.seats} seat(s)</span>
                          <span>{positionCandidates.length} candidates</span>
                        </div>
                        <button
                          onClick={() =>
                            router.push(
                              `/admin/elections/${params.electionId}/positions/${position.id}`
                            )
                          }
                          className="text-indigo-600 hover:text-indigo-500"
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
          <div className="bg-white shadow rounded-lg p-6">
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
                {voters.length > 0 && (
                  <button
                    onClick={handleDownloadVoters}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Voters
                  </button>
                )}
                {election.status === 'draft' && (
                  <button
                    onClick={() => setShowVoterImport(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Voters
                  </button>
                )}
              </div>
            </div>

            {voters.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No voters</h3>
                <p className="mt-1 text-sm text-gray-500">Import voters to enable voting.</p>
              </div>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Student ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Token
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Voting Link
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
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
                          <span className="truncate block max-w-[120px]" title={voter.real_token}>
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
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              voter.token_used_at
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
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
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      Showing {Math.min((votersPage - 1) * votersLimit + 1, votersPagination.totalCount)} to {Math.min(votersPage * votersLimit, votersPagination.totalCount)} of {votersPagination.totalCount} voters
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Items per page */}
                    <select
                      value={votersLimit}
                      onChange={(e) => {
                        setVotersLimit(parseInt(e.target.value))
                        setVotersPage(1)
                        loadVoters(1, parseInt(e.target.value))
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
                    >
                      <option value="10">10 per page</option>
                      <option value="25">25 per page</option>
                      <option value="50">50 per page</option>
                      <option value="100">100 per page</option>
                    </select>

                    {/* Previous button */}
                    <button
                      onClick={() => {
                        if (votersPagination.hasPrev) {
                          const newPage = votersPage - 1
                          setVotersPage(newPage)
                          loadVoters(newPage, votersLimit)
                        }
                      }}
                      disabled={!votersPagination.hasPrev}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, votersPagination.totalPages) }, (_, i) => {
                        const pageNum = votersPage <= 3 
                          ? i + 1 
                          : votersPage >= votersPagination.totalPages - 2
                            ? votersPagination.totalPages - 4 + i
                            : votersPage - 2 + i
                        
                        if (pageNum < 1 || pageNum > votersPagination.totalPages) return null
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => {
                              setVotersPage(pageNum)
                              loadVoters(pageNum, votersLimit)
                            }}
                            className={`px-3 py-1 rounded-md text-sm font-medium ${
                              pageNum === votersPage
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    {/* Next button */}
                    <button
                      onClick={() => {
                        if (votersPagination.hasNext) {
                          const newPage = votersPage + 1
                          setVotersPage(newPage)
                          loadVoters(newPage, votersLimit)
                        }
                      }}
                      disabled={!votersPagination.hasNext}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newPosition.name}
                    onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    value={newPosition.description}
                    onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Seats</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newPosition.seats}
                    onChange={(e) => setNewPosition({ ...newPosition, seats: parseInt(e.target.value) || 1 })}
                    required
                  />
              </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPositionForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
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

      {/* Edit Election Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Election</h3>
              <form onSubmit={handleEditElection}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Election Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={editElection.name}
                    onChange={(e) => setEditElection({ ...editElection, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    value={editElection.description}
                    onChange={(e) => setEditElection({ ...editElection, description: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
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

      {/* Voter Import Modal */}
      {showVoterImport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Voters</h3>
              <form onSubmit={handleImportVoters}>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Upload a CSV file with the following columns:
                  </p>
                  <ul className="text-xs text-gray-500 list-disc list-inside mb-4 space-y-1">
                    <li><code className="bg-gray-100 px-1 rounded">name</code> or <code className="bg-gray-100 px-1 rounded">full_name</code> (required)</li>
                    <li><code className="bg-gray-100 px-1 rounded">student_id</code> or <code className="bg-gray-100 px-1 rounded">id</code> (optional)</li>
                    <li><code className="bg-gray-100 px-1 rounded">email</code> (optional)</li>
                  </ul>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  {importFile && (
                    <p className="mt-2 text-sm text-green-600">
                      Selected: {importFile.name}
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVoterImport(false)
                      setImportFile(null)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    disabled={importing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  )
}
