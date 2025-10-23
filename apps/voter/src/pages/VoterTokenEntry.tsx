import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Vote } from 'lucide-react'
import { apiClient, Election } from '@stv-election/shared'

export function VoterTokenEntry() {
  const { electionId } = useParams<{ electionId: string }>()
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [election, setElection] = useState<Election | null>(null)

  useEffect(() => {
    if (electionId) {
      loadElection()
    }
  }, [electionId])

  const loadElection = async () => {
    try {
      const electionData = await apiClient.getElection(electionId!)
      setElection(electionData)
    } catch (err) {
      console.error('Failed to load election:', err)
      setError('Failed to load election details')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      setError('Please enter your voting token')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      // Check if token is valid before navigating
      const tokenCheck = await apiClient.checkToken(electionId!, token)
      
      if (!tokenCheck.valid) {
        setError('Invalid voting token')
        return
      }
      
      if (tokenCheck.used) {
        setError('This voting token has already been used')
        return
      }

      // Navigate to ballot if token is valid
      navigate(`/ballot/${electionId}/${token}`)
    } catch (err: any) {
      setError(err.message || 'Failed to verify token')
    } finally {
      setLoading(false)
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
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-lg rounded-lg p-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Elections
          </button>

          {/* Election Info */}
          {election && (
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{election.title}</h2>
              {election.description && (
                <p className="text-gray-600">{election.description}</p>
              )}
              <div className="mt-4">
                <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                  Voting Open
                </span>
              </div>
            </div>
          )}

          {/* Token Entry Form */}
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Enter Your Voting Token</h3>
              <p className="text-sm text-gray-600">
                Please enter the voting token you received to access your ballot.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                  Voting Token
                </label>
                <input
                  id="token"
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your voting token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token.trim()}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>Access Ballot</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                If you don't have a voting token, please contact the election administrator.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
