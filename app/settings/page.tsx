'use client'

import { useEffect, useState } from 'react'
import { supabase, type Engagement, type TeamMember, type System } from '@/lib/supabase'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

export default function SettingsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [newEngagement, setNewEngagement] = useState('')
  const [newMemberName, setNewMemberName] = useState<Record<string, string>>({})
  const [newSystemName, setNewSystemName] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [{ data: engs }, { data: members }, { data: syss }] = await Promise.all([
        supabase.from('engagements').select('*').order('name'),
        supabase.from('team_members').select('*').order('name'),
        supabase.from('systems').select('*').order('display_order'),
      ])
      if (engs) setEngagements(engs)
      if (members) setTeamMembers(members)
      if (syss) setSystems(syss)
      setLoading(false)
    }
    fetchData()
  }, [])

  async function addEngagement() {
    const name = newEngagement.trim()
    if (!name) return
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { data, error } = await supabase.from('engagements').insert({ name, slug }).select().single()
    if (!error && data) {
      setEngagements((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewEngagement('')
    }
  }

  async function deleteEngagement(id: string) {
    await supabase.from('engagements').delete().eq('id', id)
    setEngagements((prev) => prev.filter((e) => e.id !== id))
    setTeamMembers((prev) => prev.filter((m) => m.engagement_id !== id))
    setSystems((prev) => prev.filter((s) => s.engagement_id !== id))
  }

  async function addTeamMember(engagementId: string) {
    const name = (newMemberName[engagementId] ?? '').trim()
    if (!name) return
    const { data, error } = await supabase.from('team_members').insert({ name, engagement_id: engagementId }).select().single()
    if (!error && data) {
      setTeamMembers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewMemberName((prev) => ({ ...prev, [engagementId]: '' }))
    }
  }

  async function deleteTeamMember(id: string) {
    await supabase.from('team_members').delete().eq('id', id)
    setTeamMembers((prev) => prev.filter((m) => m.id !== id))
  }

  async function addSystem(engagementId: string) {
    const name = (newSystemName[engagementId] ?? '').trim()
    if (!name) return
    const engSystems = systems.filter((s) => s.engagement_id === engagementId)
    const display_order = engSystems.length + 1
    const { data, error } = await supabase
      .from('systems')
      .insert({ name, engagement_id: engagementId, display_order })
      .select()
      .single()
    if (!error && data) {
      setSystems((prev) => [...prev, data])
      setNewSystemName((prev) => ({ ...prev, [engagementId]: '' }))
    }
  }

  async function deleteSystem(id: string, engagementId: string) {
    await supabase.from('systems').delete().eq('id', id)
    // Re-number remaining systems for this engagement
    const remaining = systems
      .filter((s) => s.id !== id && s.engagement_id === engagementId)
      .sort((a, b) => a.display_order - b.display_order)
    await Promise.all(
      remaining.map((s, i) =>
        supabase.from('systems').update({ display_order: i + 1 }).eq('id', s.id)
      )
    )
    setSystems((prev) => {
      const filtered = prev.filter((s) => s.id !== id)
      return filtered.map((s) => {
        if (s.engagement_id !== engagementId) return s
        const idx = remaining.findIndex((r) => r.id === s.id)
        return idx >= 0 ? { ...s, display_order: idx + 1 } : s
      })
    })
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage clients, team members, and systems</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add New Client</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Client name..."
            value={newEngagement}
            onChange={(e) => setNewEngagement(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEngagement()}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={addEngagement}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {engagements.length === 0 && <p className="text-sm text-gray-400">No clients yet.</p>}
        {engagements.map((eng) => {
          const members = teamMembers.filter((m) => m.engagement_id === eng.id)
          const engSystems = systems
            .filter((s) => s.engagement_id === eng.id)
            .sort((a, b) => a.display_order - b.display_order)
          const isOpen = !!expanded[eng.id]

          return (
            <div key={eng.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <button onClick={() => toggleExpanded(eng.id)} className="flex items-center gap-2 text-left flex-1">
                  {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  <span className="font-medium text-gray-900">{eng.name}</span>
                  <span className="text-xs text-gray-400 ml-1">
                    {members.length} member{members.length !== 1 ? 's' : ''} · {engSystems.length} system{engSystems.length !== 1 ? 's' : ''}
                  </span>
                </button>
                <button onClick={() => deleteEngagement(eng.id)} className="text-gray-300 hover:text-red-500 transition-colors ml-4">
                  <Trash2 size={14} />
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4 flex flex-col gap-6">

                  {/* Team Members */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Team Members</h3>
                    <p className="text-xs text-gray-400 mb-3">Appear in the assignee dropdown for {eng.name}</p>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Member name..."
                        value={newMemberName[eng.id] ?? ''}
                        onChange={(e) => setNewMemberName((prev) => ({ ...prev, [eng.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addTeamMember(eng.id)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button onClick={() => addTeamMember(eng.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                        <Plus size={15} /> Add
                      </button>
                    </div>
                    {members.length === 0 ? (
                      <p className="text-xs text-gray-400">No team members yet.</p>
                    ) : (
                      <div className="flex flex-col divide-y divide-gray-100">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-900">{member.name}</span>
                            <button onClick={() => deleteTeamMember(member.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Systems */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Systems</h3>
                    <p className="text-xs text-gray-400 mb-3">Appear in the system dropdown on the tracker. Added in order.</p>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="System name..."
                        value={newSystemName[eng.id] ?? ''}
                        onChange={(e) => setNewSystemName((prev) => ({ ...prev, [eng.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addSystem(eng.id)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button onClick={() => addSystem(eng.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                        <Plus size={15} /> Add
                      </button>
                    </div>
                    {engSystems.length === 0 ? (
                      <p className="text-xs text-gray-400">No systems yet.</p>
                    ) : (
                      <div className="flex flex-col divide-y divide-gray-100">
                        {engSystems.map((sys) => (
                          <div key={sys.id} className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-900">
                              <span className="text-gray-400 mr-2">{sys.display_order}.</span>
                              {sys.name}
                            </span>
                            <button onClick={() => deleteSystem(sys.id, eng.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
