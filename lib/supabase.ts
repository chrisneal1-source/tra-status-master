import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const isValidUrl = rawUrl.startsWith('https://') || rawUrl.startsWith('http://')

export const supabase = createClient(
  isValidUrl ? rawUrl : 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
)

export type Status =
  | 'Not Started'
  | 'In Progress'
  | 'Prepared'
  | 'Review Points'
  | 'Reviewed'
  | 'Complete'
  | 'On Hold'

export const STATUSES: Status[] = [
  'Not Started',
  'In Progress',
  'Prepared',
  'Review Points',
  'Reviewed',
  'Complete',
  'On Hold',
]

export interface Engagement {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface TeamMember {
  id: string
  name: string
  engagement_id: string
  created_at: string
}

export interface System {
  id: string
  name: string
  engagement_id: string
  display_order: number
  created_at: string
}

export interface Workpaper {
  id: string
  system: string | null
  name: string
  assignee: string | null
  status: Status
  engagement_id: string
  notes: string | null
  created_at: string
}
