'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Election = {
  id: string
  name: string
  description: string | null
  status: string
  startDate?: string | null
  endDate?: string | null
}

export default function Home() {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function fetchElections() {
      try {
        // Always request fresh data from the API
        const res = await fetch('/api/elections', { cache: 'no-store' })
        if (!res.ok) {
          console.error('Failed to fetch elections, status:', res.status)
          if (mounted) setElections([])
          return
        }
        const data = await res.json()
        if (mounted) setElections(data)
      } catch (err) {
        console.error('Error fetching elections:', err)
        if (mounted) setElections([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchElections()

    return () => {
      mounted = false
    }
  }, [])

  const openElections = elections.filter(e => e.status === 'open')

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">KPA Election System</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                System Online
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Elections List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Open Elections</h2>

          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading elections...</p>
            </div>
          ) : openElections.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Open Elections</h3>
              <p className="text-gray-600 mb-6">
                There are currently no open elections. Check back later when voting opens.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {openElections.map(election => (
                <Link
                  key={election.id}
                  href={`/voter/${election.id}`}
                  className="group block bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-blue-500"
                >
                  <div className="p-6">
                    {/* Election Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Voting Open
                      </span>
                    </div>

                    {/* Election Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {election.name}
                    </h3>

                    {/* Election Description */}
                    {election.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {election.description}
                      </p>
                    )}

                    {/* Election Dates */}
                    <div className="space-y-2 text-sm text-gray-500">
                      {election.startDate && (
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Starts: {new Date(election.startDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {election.endDate && (
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Ends: {new Date(election.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Arrow */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                        Click to Vote
                      </span>
                      <svg
                        className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              © 2024 KPA Election System. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>Secure & Anonymous</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
