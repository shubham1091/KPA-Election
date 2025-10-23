'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Vote, Calendar, Clock, ArrowRight } from 'lucide-react'

type Election = {
  id: string
  name: string
  description: string | null
  status: string
  starts_at: string | null
  ends_at: string | null
}

export default function VoterPage() {
  const router = useRouter()
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadElections()
  }, [])

  const loadElections = async () => {
    try {
      const response = await fetch('/api/elections')
      if (response.ok) {
        const data = await response.json()
        // Only show open elections
        const openElections = data.filter((e: Election) => e.status === 'open')
        setElections(openElections)
      }
    } catch (err) {
      console.error('Failed to load elections:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleElectionSelect = (election: Election) => {
    router.push(`/voter/${election.id}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-red-100 text-red-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <div className="flex items-center space-x-3">
              <Vote className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">STV Election System</h1>
                <p className="text-sm text-gray-600">Cast your vote securely</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Active Elections</h2>
          <p className="text-lg text-gray-600">
            Select an election to participate in voting
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : elections.length === 0 ? (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white shadow-lg rounded-lg p-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Elections</h3>
              <p className="text-gray-600">
                There are currently no elections open for voting. Please check back later.
              </p>
              <div className="mt-6">
                <Link
                  href="/"
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {elections.map((election) => (
                <div
                  key={election.id}
                  onClick={() => handleElectionSelect(election)}
                  className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">
                      {election.name}
                    </h3>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        election.status
                      )}`}
                    >
                      {election.status}
                    </span>
                  </div>
                  
                  {election.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {election.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    {election.starts_at && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Starts: {new Date(election.starts_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {election.ends_at && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Ends: {new Date(election.ends_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-sm font-medium text-indigo-600">Vote Now</span>
                    <ArrowRight className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            Secure electronic voting powered by Single Transferable Vote (STV)
          </p>
        </div>
      </footer>
    </div>
  )
}

