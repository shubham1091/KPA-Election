import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Vote, Calendar, Clock } from 'lucide-react'
import { apiClient, Election } from '@stv-election/shared'

export function VoterLanding() {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadElections()
  }, [])

  const loadElections = async () => {
    try {
      const data = await apiClient.getElections()
      // Only show open elections (exclude paused elections)
      const openElections = data.filter(election => election.status === 'open')
      setElections(openElections)
    } catch (err) {
      console.error('Failed to load elections:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleElectionSelect = (election: Election) => {
    navigate(`/vote/${election.id}`)
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-red-100 text-red-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <div className="flex items-center space-x-2">
              <Vote className="h-8 w-8 text-primary-600" />
              <h1 className="text-xl font-bold text-gray-900">STV Election System</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : elections.length === 0 ? (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white shadow-lg rounded-lg p-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Active Elections</h3>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Elections List */}
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {elections.map((election) => (
                  <div
                    key={election.id}
                    className="border border-gray-200 rounded-lg p-6 cursor-pointer transition-all hover:shadow-md hover:border-gray-300"
                    onClick={() => handleElectionSelect(election)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {election.title}
                      </h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(election.status)}`}>
                        {election.status}
                      </span>
                    </div>
                    {election.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {election.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        {election.starts_at && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>Starts {new Date(election.starts_at).toLocaleDateString()}</span>
                          </div>
                        )}
                        {election.ends_at && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>Ends {new Date(election.ends_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
