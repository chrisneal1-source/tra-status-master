'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, STATUSES, type Workpaper, type Status, type Engagement } from '@/lib/supabase'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const STATUS_COLORS: Record<Status, string> = {
  'Not Started': '#e5e7eb',
  'In Progress': '#93c5fd',
  'Prepared': '#fde68a',
  'Review Points': '#dc2626',
  'Reviewed': '#c4b5fd',
  'Complete': '#6ee7b7',
  'On Hold': '#fdba74',
}

export default function DashboardPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [engagement, setEngagement] = useState<Engagement | null>(null)
  const [workpapers, setWorkpapers] = useState<Workpaper[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: eng } = await supabase.from('engagements').select('*').eq('slug', slug).single()
      if (!eng) { setLoading(false); return }
      setEngagement(eng)
      const { data } = await supabase.from('workpapers').select('*').eq('engagement_id', eng.id)
      if (data) setWorkpapers(data)
      setLoading(false)
    }
    fetchData()
  }, [slug])

  function goToTracker(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString()
    router.push(`/${slug}/tracker?${qs}`)
  }

  const total = workpapers.length
  const complete = workpapers.filter((w) => w.status === 'Complete').length
  const reviewPoints = workpapers.filter((w) => w.status === 'Review Points').length
  const onHold = workpapers.filter((w) => w.status === 'On Hold').length
  const pctComplete = total > 0 ? Math.round((complete / total) * 100) : 0

  const pieData = STATUSES.map((s) => ({
    name: s,
    value: workpapers.filter((w) => w.status === s).length,
  })).filter((d) => d.value > 0)

  const assigneeMap: Record<string, Record<Status, number>> = {}
  workpapers.filter((wp) => wp.assignee !== 'Completed').forEach((wp) => {
    const a = wp.assignee || 'Unassigned'
    if (!assigneeMap[a]) {
      assigneeMap[a] = {} as Record<Status, number>
      STATUSES.forEach((s) => (assigneeMap[a][s] = 0))
    }
    assigneeMap[a][wp.status]++
  })
  const barData = Object.entries(assigneeMap).map(([name, counts]) => ({ name, ...counts }))

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
  if (!engagement) return <div className="p-8 text-center text-gray-400 text-sm">Engagement not found.</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{engagement.name} — Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Click any chart or number to drill into the tracker</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Workpapers', value: total, sub: undefined, status: undefined },
          { label: 'Complete', value: complete, sub: `${pctComplete}% of total`, status: 'Complete' },
          { label: 'Review Points', value: reviewPoints, sub: 'needs attention', status: 'Review Points' },
          { label: 'On Hold', value: onHold, sub: undefined, status: 'On Hold' },
        ].map(({ label, value, sub, status }) => (
          <button
            key={label}
            onClick={() => status ? goToTracker({ status }) : router.push(`/${slug}/tracker`)}
            className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-red-300 hover:shadow-sm transition-all"
          >
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-semibold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          No workpapers yet. Add some in the Status Tracker.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Status Breakdown</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  cursor="pointer"
                  onClick={(entry) => entry.name && goToTracker({ status: entry.name })}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name as Status]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Workpapers by Assignee</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                {STATUSES.map((s) => (
                  <Bar
                    key={s}
                    dataKey={s}
                    stackId="a"
                    fill={STATUS_COLORS[s]}
                    cursor="pointer"
                    onClick={(entry) => entry.name && goToTracker({ assignee: entry.name, status: s })}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Status Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {STATUSES.map((s) => {
                const count = workpapers.filter((w) => w.status === s).length
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <button
                    key={s}
                    onClick={() => goToTracker({ status: s })}
                    className="text-center p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-2xl font-semibold" style={{ color: STATUS_COLORS[s] === '#e5e7eb' ? '#6b7280' : STATUS_COLORS[s] }}>
                      {count}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-tight">{s}</div>
                    <div className="text-xs text-gray-400">{pct}%</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
