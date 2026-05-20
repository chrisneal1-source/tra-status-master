'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase, STATUSES, type Workpaper, type Status, type Engagement, type TeamMember, type System } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { Upload, Plus, Trash2, ChevronDown } from 'lucide-react'

const STATUS_STYLES: Record<Status, { bg: string; text: string }> = {
  'Not Started':   { bg: '#ffffff', text: '#000000' },
  'In Progress':   { bg: '#ffffff', text: '#000000' },
  'Prepared':      { bg: '#ffffff', text: '#000000' },
  'Review Points': { bg: '#dc2626', text: '#ffffff' },
  'Reviewed':      { bg: '#ffffff', text: '#000000' },
  'Complete':      { bg: '#ffffff', text: '#000000' },
  'On Hold':       { bg: '#ffffff', text: '#000000' },
}

function StatusPill({ status, onChange }: { status: Status; onChange: (s: Status) => void }) {
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { bg, text } = STATUS_STYLES[status]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
    }
    setOpen((o) => !o)
  }

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{ backgroundColor: bg, color: text, borderColor: bg === '#ffffff' ? '#d1d5db' : bg }}
        className="flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-full border cursor-pointer whitespace-nowrap"
      >
        {status}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[150px]"
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false) }}
              style={{
                backgroundColor: STATUS_STYLES[s].bg === '#ffffff' ? 'transparent' : STATUS_STYLES[s].bg,
                color: STATUS_STYLES[s].bg === '#ffffff' ? '#000000' : STATUS_STYLES[s].text,
              }}
              className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2"
            >
              {STATUS_STYLES[s].bg !== '#ffffff' && (
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_STYLES[s].bg }} />
              )}
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getInitials(): string {
  if (typeof window === 'undefined') return ''
  let initials = localStorage.getItem('userInitials')
  if (!initials) {
    initials = window.prompt('Enter your initials (e.g. CN):') ?? ''
    if (initials) localStorage.setItem('userInitials', initials.toUpperCase())
  }
  return initials.toUpperCase()
}

function stamp(existing: string, newText: string): string {
  const initials = getInitials()
  const date = new Date()
  const d = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`
  const prefix = initials ? `[${initials} ${d}] ` : `[${d}] `
  const entry = prefix + newText.trim()
  return existing ? `${existing}\n${entry}` : entry
}

function NotesCell({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [draft, setDraft] = useState('')

  function save() {
    if (!draft.trim()) return
    onChange(stamp(value, draft.trim()))
    setDraft('')
  }

  return (
    <div title={value || undefined} className="flex flex-col gap-0.5">
      {value && (
        <div className="text-xs text-gray-400 truncate max-w-xs">{value.split('\n').at(-1)}</div>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); (e.target as HTMLInputElement).blur() } }}
        placeholder={value ? 'Add another note...' : 'Add a note...'}
        className="w-full bg-transparent text-black text-sm focus:outline-none focus:ring-1 focus:ring-red-400 rounded px-1 -mx-1"
      />
    </div>
  )
}

export default function TrackerPage() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const [engagement, setEngagement] = useState<Engagement | null>(null)
  const [workpapers, setWorkpapers] = useState<Workpaper[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSystem, setFilterSystem] = useState('')
  const [filterName, setFilterName] = useState('')
  const [filterAssignee, setFilterAssignee] = useState(searchParams.get('assignee') ?? '')
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>((searchParams.get('status') as Status) ?? 'All')
  const [filterNotes, setFilterNotes] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchData() {
      const [{ data: eng }] = await Promise.all([
        supabase.from('engagements').select('*').eq('slug', slug).single(),
      ])
      if (!eng) { setLoading(false); return }
      setEngagement(eng)

      const [{ data: members }, { data: syss }, { data }] = await Promise.all([
        supabase.from('team_members').select('*').eq('engagement_id', eng.id).order('name'),
        supabase.from('systems').select('*').eq('engagement_id', eng.id).order('display_order'),
        supabase.from('workpapers').select('*').eq('engagement_id', eng.id).order('name'),
      ])
      if (members) setTeamMembers(members)
      if (syss) setSystems(syss)
      if (data) setWorkpapers(data)
      setLoading(false)
    }
    fetchData()
  }, [slug])

  async function updateField(id: string, field: keyof Workpaper, value: string) {
    await supabase.from('workpapers').update({ [field]: value }).eq('id', id)
    setWorkpapers((prev) => prev.map((wp) => (wp.id === id ? { ...wp, [field]: value } : wp)))
  }

  async function addWorkpaper() {
    if (!engagement) return
    const { data, error } = await supabase
      .from('workpapers')
      .insert({ system: '', name: 'New Workpaper', assignee: '', status: 'Not Started', engagement_id: engagement.id, notes: '' })
      .select()
      .single()
    if (!error && data) setWorkpapers((prev) => [...prev, data])
  }

  async function deleteWorkpaper(id: string) {
    await supabase.from('workpapers').delete().eq('id', id)
    setWorkpapers((prev) => prev.filter((wp) => wp.id !== id))
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!engagement) return
    const file = e.target.files?.[0]
    if (!file) return
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws)

    const toInsert = rows.map((row) => ({
      system: String(row['System'] || row['system'] || '').trim(),
      name: String(row['Name'] || row['name'] || row['Workpaper'] || '').trim(),
      assignee: String(row['Assignee'] || row['assignee'] || '').trim(),
      status: (STATUSES.includes(row['Status'] as Status) ? row['Status'] : 'Not Started') as Status,
      notes: String(row['Notes'] || row['notes'] || '').trim(),
      engagement_id: engagement.id,
    })).filter((r) => r.name)

    if (toInsert.length === 0) return
    const { data, error } = await supabase.from('workpapers').insert(toInsert).select()
    if (!error && data) setWorkpapers((prev) => [...prev, ...data])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const systemOrder = Object.fromEntries(systems.map((s) => [s.name, s.display_order]))

  const filtered = workpapers
    .filter((wp) => {
      if (filterSystem && (wp.system ?? '') !== filterSystem) return false
      if (filterName && !wp.name.toLowerCase().includes(filterName.toLowerCase())) return false
      if (filterAssignee && (wp.assignee ?? '') !== filterAssignee) return false
      if (filterStatus !== 'All' && wp.status !== filterStatus) return false
      if (filterNotes && !(wp.notes ?? '').toLowerCase().includes(filterNotes.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      const orderA = systemOrder[a.system ?? ''] ?? 999
      const orderB = systemOrder[b.system ?? ''] ?? 999
      if (orderA !== orderB) return orderA - orderB
      return a.name.localeCompare(b.name)
    })

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
  if (!engagement) return <div className="p-8 text-center text-gray-400 text-sm">Engagement not found.</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">{engagement.name} — Status Tracker</h1>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <Upload size={14} /> Import Excel
          </button>
          <button
            onClick={addWorkpaper}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Plus size={14} /> Add Workpaper
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {workpapers.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No workpapers found.</div>
        ) : (
          <table className="w-full text-base">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-40">System</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-64">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-40">Assignee</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-40">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Notes</th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
              <tr className="border-b border-gray-200 bg-white">
                <td className="px-3 py-1.5">
                  <select
                    value={filterSystem}
                    onChange={(e) => setFilterSystem(e.target.value)}
                    className="w-full text-sm text-gray-500 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-400 bg-gray-50"
                  >
                    <option value="">All</option>
                    {systems.map((s) => <option key={s.id} value={s.name}>{s.display_order}. {s.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="w-full text-sm text-gray-500 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-400 bg-gray-50"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <select
                    value={filterAssignee}
                    onChange={(e) => setFilterAssignee(e.target.value)}
                    className="w-full text-sm text-gray-500 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-400 bg-gray-50"
                  >
                    <option value="">All</option>
                    {teamMembers.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as Status | 'All')}
                    className="w-full text-sm text-gray-500 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-400 bg-gray-50"
                  >
                    <option value="All">All</option>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filterNotes}
                    onChange={(e) => setFilterNotes(e.target.value)}
                    className="w-full text-sm text-gray-500 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-400 bg-gray-50"
                  />
                </td>
                <td />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No workpapers match the current filters.</td></tr>
              )}
              {filtered.map((wp) => (
                <tr key={wp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <select
                      value={wp.system ?? ''}
                      onChange={(e) => updateField(wp.id, 'system', e.target.value)}
                      className="w-full bg-transparent text-black text-base focus:outline-none focus:ring-1 focus:ring-red-400 rounded px-1 -mx-1 cursor-pointer"
                    >
                      <option value="">—</option>
                      {systems.map((s) => (
                        <option key={s.id} value={s.name}>{s.display_order}. {s.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      defaultValue={wp.name}
                      onBlur={(e) => { const val = e.target.value; if (val !== wp.name) updateField(wp.id, 'name', val) }}
                      className="w-full bg-transparent text-black focus:outline-none focus:ring-1 focus:ring-red-400 rounded px-1 -mx-1"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={wp.assignee ?? ''}
                      onChange={(e) => updateField(wp.id, 'assignee', e.target.value)}
                      className="w-full bg-transparent text-black text-base focus:outline-none focus:ring-1 focus:ring-red-400 rounded px-1 -mx-1 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <StatusPill status={wp.status} onChange={async (s) => {
                      await updateField(wp.id, 'status', s)
                      if (s === 'Complete') await updateField(wp.id, 'assignee', 'Completed')
                    }} />
                  </td>
                  <td className="px-4 py-2">
                    <NotesCell value={wp.notes ?? ''} onChange={(val) => updateField(wp.id, 'notes', val)} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => deleteWorkpaper(wp.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">{filtered.length} workpaper{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
