"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BarChart3, ArrowLeft } from 'lucide-react'

type Round = { tallies?: Record<string, number>; round?: string }

type JobSummary = { winner?: string; quota?: number; rounds?: unknown }

type Job = { id?: string; status?: string; position_id?: string; result_summary?: JobSummary }

type Report = {
  electionId: string
  voters: number
  ballots: number
  positions: Array<{
    position: {
      id: string
      name: string
      description?: string | null
    }
    candidates: Array<{ id: string; display_name: string }>
    firstPreferences: Record<string, number>
    ballotsForPosition: number
    blankBallots: number
    job: Job | null
    rounds: Round[] | null
  }>
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#06b6d4', '#f97316']

function HorizontalBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center space-x-3">
          <div className="w-48 text-sm text-gray-700">{d.label}</div>
          <div className="flex-1">
            <div className="bg-gray-200 rounded h-4 relative overflow-hidden">
              <div
                className="h-4 rounded"
                style={{ width: `${(d.value / max) * 100}%`, background: d.color || COLORS[i % COLORS.length] }}
              />
            </div>
          </div>
          <div className="w-24 text-right text-sm font-medium text-gray-800">{d.value}</div>
        </div>
      ))}
    </div>
  )
}

function Donut({ value, total }: { value: number; total: number }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const pct = total > 0 ? value / total : 0
  const dash = pct * circumference
  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      <g transform="translate(60,60)">
        <circle r={radius} fill="#f3f4f6" />
        <circle
          r={radius}
          fill="transparent"
          stroke="#e5e7eb"
          strokeWidth={18}
          strokeDasharray={`${circumference} ${circumference}`}
          transform="rotate(-90)"
        />
        <circle
          r={radius}
          fill="transparent"
          stroke="#2563eb"
          strokeWidth={18}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform="rotate(-90)"
        />
        <text x={0} y={6} textAnchor="middle" fontSize={14} fontWeight={700} fill="#111827">
          {total > 0 ? `${Math.round(pct * 100)}%` : '0%'}
        </text>
      </g>
    </svg>
  )
}

function RoundsLineChart({ rounds, candidates }: { rounds: Round[]; candidates: { id: string; display_name: string }[] }) {
  if (!rounds || rounds.length === 0) return <div className="text-sm text-gray-500">No round data</div>

  // Build series: for each candidate, collect tallies by round (tallies in rounds[i].tallies)
  const series = candidates.map((c, idx) => ({ id: c.id, name: c.display_name, color: COLORS[idx % COLORS.length], values: rounds.map(r => (r.tallies?.[c.id] ?? 0)) }))
  const max = Math.max(...series.flatMap(s => s.values), 1)
  const width = 560
  const height = 200
  const padding = 30

  const pointsFor = (vals: number[]) =>
    vals
      .map((v, i) => {
        const x = padding + (i / Math.max(1, vals.length - 1)) * (width - padding * 2)
        const y = height - padding - (v / max) * (height - padding * 2)
        return `${x},${y}`
      })
      .join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={padding} x2={width - padding} y1={padding + g * (height - padding * 2)} y2={padding + g * (height - padding * 2)} stroke="#e5e7eb" />
      ))}

      {/* series */}
      {series.map((s) => {
        // compute point coords for markers
        const coords = s.values.map((v, i) => {
          const x = padding + (i / Math.max(1, s.values.length - 1)) * (width - padding * 2)
          const y = height - padding - (v / max) * (height - padding * 2)
          return { x, y, v }
        })
        return (
          <g key={s.id}>
            <polyline fill="none" stroke={s.color} strokeWidth={2} points={pointsFor(s.values)} />
            {coords.map((pt, idx) => (
              <circle key={idx} cx={pt.x} cy={pt.y} r={3} fill={s.color} stroke="#fff" strokeWidth={0.8}>
                <title>{`${s.name}: ${pt.v}`}</title>
              </circle>
            ))}
          </g>
        )
      })}

      {/* x labels */}
      {rounds.map((r, i) => {
        const x = padding + (i / Math.max(1, rounds.length - 1)) * (width - padding * 2)
        return (
          <text key={i} x={x} y={height - 6} fontSize={10} textAnchor="middle" fill="#6b7280">
            {r.round}
          </text>
        )
      })}
    </svg>
  )
}

function PieChart({ data, size = 120 }: { data: { label: string; value: number; color?: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const startAngle = -Math.PI / 2
  const radius = size / 2 - 4

  const { arcs } = data.reduce(
    (acc, d, i) => {
      const portion = d.value / total
      const next = acc.angle + portion * Math.PI * 2
      const x1 = Math.cos(acc.angle) * radius
      const y1 = Math.sin(acc.angle) * radius
      const x2 = Math.cos(next) * radius
      const y2 = Math.sin(next) * radius
      const large = portion > 0.5 ? 1 : 0
      const path = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`
      acc.arcs.push({ path, color: d.color || COLORS[i % COLORS.length], label: d.label, value: d.value })
      acc.angle = next
      return acc
    },
    { angle: startAngle, arcs: [] as { path: string; color: string; label: string; value: number }[] }
  )

  return (
    <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}>
      {arcs.map((a, i) => (
        <path key={i} d={a.path} fill={a.color} stroke="#fff" strokeWidth={0.5} />
      ))}
      <circle cx={0} cy={0} r={radius / 2} fill="#fff" />
    </svg>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (!values || values.length === 0) return <div className="text-sm text-gray-500">—</div>
  const width = 200
  const height = 40
  const max = Math.max(...values, 1)
  const points = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * width},${height - (v / max) * height}`).join(' ')
  const coords = values.map((v, i) => ({
    x: (i / Math.max(1, values.length - 1)) * width,
    y: height - (v / max) * height,
    v,
  }))

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke="#2563eb" strokeWidth={2} points={points} />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={2.5} fill="#2563eb" stroke="#fff" strokeWidth={0.7}>
          <title>{String(c.v)}</title>
        </circle>
      ))}
    </svg>
  )
}

export default function StatsPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'default' | 'ballots' | 'turnout'>('default')
  const [showRounds, setShowRounds] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/stats/report?electionId=${params.electionId}`)
        if (!res.ok) throw new Error('Failed to load report')
        const data = await res.json()
        setReport(data)
      } catch (err) {
        console.error('Failed to load stats report:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!report) return <div className="min-h-screen flex items-center justify-center">No report available</div>

  const downloadCSV = async () => {
    try {
      const res = await fetch(`/api/admin/stats/report?electionId=${params.electionId}&format=csv`)
      if (!res.ok) throw new Error('Failed to fetch CSV')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `election_${params.electionId}_stats.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download CSV failed:', err)
      alert('Failed to download CSV: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const positionsForSelect = report?.positions ?? []

  const sortedFilteredPositions = () => {
    if (!report) return []
    let list = report.positions.slice()
    if (selectedPosition !== 'all') {
      list = list.filter(p => p.position.id === selectedPosition)
    }
    if (sortBy === 'ballots') {
      list.sort((a, b) => (b.ballotsForPosition || 0) - (a.ballotsForPosition || 0))
    } else if (sortBy === 'turnout') {
      list.sort((a, b) => ((b.ballotsForPosition || 0) / Math.max(1, report.voters)) - ((a.ballotsForPosition || 0) / Math.max(1, report.voters)))
    }
    return list
  }

  // Aggregate top candidates across positions by first preferences
  const topCandidates = () => {
    if (!report) return []
    const map: Record<string, { id: string; name: string; total: number }> = {}
    for (const pos of report.positions) {
      for (const c of pos.candidates) {
        const fp = pos.firstPreferences?.[c.id] || 0
        if (!map[c.id]) map[c.id] = { id: c.id, name: c.display_name, total: 0 }
        map[c.id].total += fp
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.push('/admin/dashboard')} className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Election Analytics</h1>
              <p className="text-sm text-gray-500">In-depth results and charts</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={downloadCSV} className="inline-flex items-center px-3 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <BarChart3 className="w-4 h-4 mr-2" />
              Download CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900">Total Voters</h3>
            <div className="text-3xl font-bold mt-2">{report.voters}</div>
            <div className="text-sm text-gray-500 mt-1">Registered voters</div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900">Ballots Submitted</h3>
            <div className="text-3xl font-bold mt-2">{report.ballots}</div>
            <div className="text-sm text-gray-500 mt-1">Total ballots recorded</div>
          </div>
          <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Overall Turnout</h3>
            <Donut value={report.ballots} total={report.voters} />
            <div className="text-sm text-gray-500 mt-2">Ballots / Registered voters</div>
          </div>
        </div>

        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <label className="text-sm text-gray-600">Position:</label>
            <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)} className="border rounded px-2 py-1">
              <option value="all">All positions</option>
              {positionsForSelect.map((p) => (
                <option key={p.position.id} value={p.position.id}>{p.position.name}</option>
              ))}
            </select>

            <label className="text-sm text-gray-600">Sort:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'default' | 'ballots' | 'turnout')} className="border rounded px-2 py-1">
              <option value="default">Default</option>
              <option value="ballots">Ballots (desc)</option>
              <option value="turnout">Turnout (desc)</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input type="checkbox" checked={showRounds} onChange={(e) => setShowRounds(e.target.checked)} />
              <span>Show rounds</span>
            </label>
          </div>
        </div>

        {/* Top candidates summary */}
        <div className="mb-6">
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900">Top candidates (by first preferences)</h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {topCandidates().map((c) => (
                <div key={c.id} className="p-3 border rounded">
                  <div className="text-sm text-gray-600">{c.name}</div>
                  <div className="text-lg font-semibold">{c.total}</div>
                </div>
              ))}
              {topCandidates().length === 0 && <div className="text-sm text-gray-500">No candidate data</div>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {sortedFilteredPositions().map((pos) => {
            const totalFP = Object.values(pos.firstPreferences || {}).reduce((s, v) => s + v, 0)
            const candData = pos.candidates.map((c, i) => ({ label: c.display_name, value: pos.firstPreferences?.[c.id] || 0, color: COLORS[i % COLORS.length] }))
            const winnerId = pos.job?.result_summary?.winner
            const winnerName = pos.candidates.find(c => c.id === winnerId)?.display_name || '—'

            return (
              <div key={pos.position.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{pos.position.name}</h3>
                    {pos.position.description && <p className="text-sm text-gray-500">{pos.position.description}</p>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Winner</div>
                    <div className="text-xl font-semibold text-green-700">{winnerName}</div>
                    <div className="text-sm text-gray-500 mt-1">{pos.job?.status || 'no count'}</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">First Preference Votes</h4>
                    <div className="flex items-start gap-6">
                      <div className="w-36 shrink-0 flex items-center justify-center">
                        <PieChart data={candData} size={120} />
                      </div>
                      <div className="flex-1">
                        <HorizontalBarChart data={candData} />
                        <div className="mt-4 text-sm text-gray-500">Total first preferences: {totalFP} • Ballots for position: {pos.ballotsForPosition}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="text-sm text-gray-600 mb-2">Ballots vs Registered</div>
                    <Donut value={pos.ballotsForPosition} total={report.voters} />
                    <div className="text-sm text-gray-500 mt-2">Blank ballots for position: {pos.blankBallots}</div>
                  </div>
                </div>

                {showRounds && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Rounds (tallies per round)</h4>
                    {pos.rounds && pos.rounds.length > 0 ? (
                      <div>
                        {/* sparkline: total ballots present per round */}
                        <div className="mb-3">
                          {(() => {
                            const totals = pos.rounds.map((r: unknown) => {
                              const rObj = r as { tallies?: Record<string, number> }
                              const tallies = rObj.tallies ?? {}
                              return Object.values(tallies).reduce((s: number, v: number) => s + (Number(v) || 0), 0)
                            })
                            return <Sparkline values={totals} />
                          })()}
                        </div>
                        <RoundsLineChart rounds={pos.rounds} candidates={pos.candidates} />
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No round data available</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
