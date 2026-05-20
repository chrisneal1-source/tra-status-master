'use client'

import { useEffect, useState } from 'react'
import { supabase, type Engagement } from '@/lib/supabase'
import Link from 'next/link'
import { FolderOpen } from 'lucide-react'

interface EngagementStats {
  total: number
  prepared: number
  complete: number
}

export default function Home() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [stats, setStats] = useState<Record<string, EngagementStats>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: engs } = await supabase.from('engagements').select('*').order('name')
      if (!engs) { setLoading(false); return }
      setEngagements(engs)

      const { data: wps } = await supabase
        .from('workpapers')
        .select('engagement_id, status')
        .in('engagement_id', engs.map((e) => e.id))

      if (wps) {
        const map: Record<string, EngagementStats> = {}
        engs.forEach((e) => { map[e.id] = { total: 0, prepared: 0, complete: 0 } })
        wps.forEach((wp) => {
          if (!map[wp.engagement_id]) return
          map[wp.engagement_id].total++
          if (wp.status === 'Prepared') map[wp.engagement_id].prepared++
          if (wp.status === 'Complete') map[wp.engagement_id].complete++
        })
        setStats(map)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <div className="max-w-lg mx-auto mt-16">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">TRA Status Master</h1>
        <p className="text-gray-500 mt-1">Select a client to view their engagement</p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {engagements.map((eng) => {
            const s = stats[eng.id] ?? { total: 0, prepared: 0, complete: 0 }
            return (
              <Link
                key={eng.id}
                href={`/${eng.slug}/dashboard`}
                className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-red-300 hover:shadow-sm transition-all group"
              >
                <div className="bg-red-50 text-red-600 rounded-lg p-2 group-hover:bg-red-100 transition-colors flex-shrink-0">
                  <FolderOpen size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <div className="font-medium text-gray-900">{eng.name}</div>
                    {eng.year_end && (
                      <span className="text-xs text-gray-400">
                        YE {new Date(eng.year_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs text-gray-400">{s.total} workpapers</span>
                    <span className="text-xs text-yellow-600">{s.prepared} prepared</span>
                    <span className="text-xs text-green-600">{s.complete} complete</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
