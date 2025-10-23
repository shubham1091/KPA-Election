import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Calendar, BarChart3, Settings, LogOut, Pause } from 'lucide-react'
import { apiClient, Election } from '@stv-election/shared'

export function AdminDashboard() {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newElection, setNewElection] = useState({
    title: '',
    description: '',
  })
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadElections()
  }, [])

  const loadElections = async () => {
    try {
      const data = await apiClient.getElections()
      setElections(data)
    } catch (err) {
      console.error('Failed to load elections:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      // Get admin ID from localStorage
      const adminData = localStorage.getItem('admin')
      if (!adminData) {
        throw new Error('Admin not logged in')
      }
      const admin = JSON.parse(adminData)
      
      if (!admin.id) {
        throw new Error('Admin ID is missing from stored data')
      }
      
      // Validate required fields
      if (!newElection.title || newElection.title.trim() === '') {
        throw new Error('Election title is required')
      }
      
      const electionData = {
        ...newElection,
        status: 'draft' as const,
        created_by: admin.id,
      }
      
      const election = await apiClient.createElection(electionData)
      setElections([election, ...elections])
      setShowCreateForm(false)
      setNewElection({ title: '', description: '' })
      navigate(`/admin/elections/${election.id}`)
    } catch (err: any) {
      console.error('Failed to create election:', err)
      alert(`Failed to create election: ${err.message || 'Unknown error'}`)
    } finally {
      setCreating(false)
    }
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

  const handleDeleteElection = async (electionId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent card click
    
    if (!confirm('Are you sure you want to delete this election? This action cannot be undone.')) {
      return
    }

    try {
      await apiClient.deleteElection(electionId)
      setElections(elections.filter(e => e.id !== electionId))
    } catch (err: any) {
      console.error('Failed to delete election:', err)
      alert(`Failed to delete election: ${err.message || 'Unknown error'}`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin')
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">Election Management</h1>
              <p className="mt-1 text-sm text-gray-500">Manage STV elections and results</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Election</span>
              </button>
              <button
                onClick={handleLogout}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Elections</dt>
                    <dd className="text-lg font-medium text-gray-900">{elections.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Elections</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {elections.filter(e => e.status === 'open').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Pause className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Paused Elections</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {elections.filter(e => e.status === 'paused').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {elections.filter(e => e.status === 'closed').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Settings className="h-8 w-8 text-gray-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Draft</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {elections.filter(e => e.status === 'draft').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Elections Grid */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Elections</h3>
              {elections.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No elections</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new election.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="btn btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Election
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {elections.map((election) => (
                    <div
                      key={election.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer relative group"
                      onClick={() => navigate(`/admin/elections/${election.id}`)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900 truncate">
                          {election.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(election.status)}`}>
                            {election.status}
                          </span>
                          <button
                            onClick={(e) => handleDeleteElection(election.id, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Delete election"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {election.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {election.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Created {new Date(election.created_at).toLocaleDateString()}</span>
                        <span className="text-primary-600 hover:text-primary-500">
                          Manage →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Election Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Election</h3>
              <form onSubmit={handleCreateElection}>
                <div className="mb-4">
                  <label className="label">Election Title</label>
                  <input
                    type="text"
                    className="input"
                    value={newElection.title}
                    onChange={(e) => setNewElection({ ...newElection, title: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={newElection.description}
                    onChange={(e) => setNewElection({ ...newElection, description: e.target.value })}
                    placeholder="Optional description for the election"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn btn-secondary"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Election'}
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
