import Link from 'next/link'

async function getElections() {
  try {
    // Use a relative API path when running in the Next.js server environment.
    // Absolute URLs can be fragile on Vercel (missing NEXT_PUBLIC_APP_URL); a
    // relative fetch to `/api/elections` works both locally and in production
    // when executed on the server.
    const response = await fetch(`/api/elections`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching elections:', error)
    return []
  }
}

type Election = {
  id: string
  name: string
  description: string | null
  status: string
  startDate?: Date | null
  endDate?: Date | null
}

export default async function Home() {
  const allElections = await getElections()
  // Filter to only show OPEN elections for voters
  const elections = allElections.filter((e: Election) => e.status === 'open')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                KPA Election System
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Secure voting platform with STV counting
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                System Online
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Elections List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Open Elections
          </h2>

          {elections.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Open Elections
              </h3>
              <p className="text-gray-600 mb-6">
                There are currently no open elections. Check back later when voting opens.
              </p>
              <div className="text-sm text-gray-500">
                <p>Are you an admin? Access the admin dashboard at <code className="bg-gray-100 px-2 py-1 rounded">/admin</code></p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {elections.map((election: Election) => (
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
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Starts: {new Date(election.startDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {election.endDate && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                      <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Secure Voting</h3>
            </div>
            <p className="text-sm text-gray-600">
              Your vote is encrypted and anonymous. Each voter gets a unique token.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">STV Counting</h3>
            </div>
            <p className="text-sm text-gray-600">
              Single Transferable Vote system ensures fair and proportional results.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Real-time Results</h3>
            </div>
            <p className="text-sm text-gray-600">
              View live results as votes are counted. Transparent and instant.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              © 2024 KPA Election System. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>Powered by Next.js & Vercel</span>
              <span>•</span>
              <span>Secure & Anonymous</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
