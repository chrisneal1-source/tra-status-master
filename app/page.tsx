'use client'

import { useEffect, useState } from 'react'
import { supabase, type Engagement } from '@/lib/supabase'
import Link from 'next/link'
import { FolderOpen } from 'lucide-react'

export default function Home() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEngagements() {
      const { data } = await supabase.from('engagements').select('*').order('name')
      if (data) setEngagements(data)
      setLoading(false)
    }
    fetchEngagements()
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
          {engagements.map((eng) => (
            <Link
              key={eng.id}
              href={`/${eng.slug}/dashboard`}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-red-300 hover:shadow-sm transition-all group"
            >
              <div className="bg-red-50 text-red-600 rounded-lg p-2 group-hover:bg-red-100 transition-colors">
                <FolderOpen size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-900">{eng.name}</div>
                <div className="text-xs text-gray-400">View dashboard & tracker</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
