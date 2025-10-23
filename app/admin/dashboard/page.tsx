'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, Users, BarChart3, LogOut, Trash2 } from 'lucide-react'

type Election = {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
}

export default function AdminDashboard() {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newElection, setNewElection] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if admin is logged in
    const adminData = localStorage.getItem('admin')
    if (!adminData) {
      router.push('/admin')
      return
    }
    loadElections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadElections = async () => {
    try {
      const response = await fetch('/api/elections')
      if (response.ok) {
        const data = await response.json()
        setElections(data)
      }
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
      const adminData = localStorage.getItem('admin')
      if (!adminData) throw new Error('Not logged in')
      
      const admin = JSON.parse(adminData)

      const response = await fetch('/api/admin/elections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newElection.name,
          description: newElection.description,
          createdBy: admin.id,
        }),
      })

      if (response.ok) {
        const election = await response.json()
        setElections([election, ...elections])
        setShowCreateForm(false)
        setNewElection({ name: '', description: '' })
        router.push(`/admin/elections/${election.id}`)
      } else {
        alert('Failed to create election')
      }
    } catch (err) {
      console.error('Failed to create election:', err)
      alert(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteElection = async (electionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const election = elections.find(el => el.id === electionId)
    const isClosed = election?.status === 'closed'
    
    const message = isClosed 
      ? 'Delete this closed election?\n\nThis will permanently delete:\n• All positions and candidates\n• All voter records and tokens\n• All ballots and votes cast\n• All count results\n\nThis cannot be undone!'
      : 'Delete this election? This cannot be undone.'
    
    if (!confirm(message)) return

    try {
      const response = await fetch(`/api/admin/elections?id=${electionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setElections(elections.filter(el => el.id !== electionId))
        alert(isClosed ? 'Election and all related data deleted successfully' : 'Election deleted successfully')
      } else {
        const error = await response.json()
        alert(`Failed to delete election: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to delete election:', err)
      alert('Failed to delete election')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin')
    router.push('/')
  }

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      closed: 'bg-red-100 text-red-800',
      archived: 'bg-blue-100 text-blue-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Manage elections and results</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Election
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
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
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Elections</p>
                  <p className="text-2xl font-bold text-gray-900">{elections.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {elections.filter(e => e.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {elections.filter(e => e.status === 'closed').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-gray-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Draft</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {elections.filter(e => e.status === 'draft').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Elections Grid */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Elections</h3>
            </div>
            <div className="p-6">
              {elections.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No elections</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new election.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
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
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer relative group"
                      onClick={() => router.push(`/admin/elections/${election.id}`)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900 truncate pr-8">
                          {election.name}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(election.status)}`}>
                            {election.status}
                          </span>
                          <button
                            onClick={(e) => handleDeleteElection(election.id, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {election.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {election.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Created {new Date(election.createdAt).toLocaleDateString()}</span>
                        {election.status === 'closed' ? (
                          <span 
                            className="text-indigo-600 hover:text-indigo-500 flex items-center"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/admin/results/${election.id}`)
                            }}
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            View results →
                          </span>
                        ) : (
                          <span className="text-indigo-600 hover:text-indigo-500">
                            Manage →
                          </span>
                        )}
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowCreateForm(false)}>
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Election</h3>
              <form onSubmit={handleCreateElection}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Election Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white placeholder-gray-400"
                    value={newElection.name}
                    onChange={(e) => setNewElection({ ...newElection, name: e.target.value })}
                    required
                    placeholder="Enter election name"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white placeholder-gray-400"
                    rows={3}
                    value={newElection.description}
                    onChange={(e) => setNewElection({ ...newElection, description: e.target.value })}
                    placeholder="Enter election description"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
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

