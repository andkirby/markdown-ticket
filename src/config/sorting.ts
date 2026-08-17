import type { LucideIcon } from 'lucide-react'
import { ALargeSmall, Calendar1, CalendarClock, ChevronsUp, Ticket } from 'lucide-react'

interface SortAttribute {
  name: string
  label: string
  defaultDirection: 'asc' | 'desc'
  system: boolean
  /** Lucide glyph shown in the collapsed SortMenu (icon map: sort-menu.spec.md). */
  icon: LucideIcon
}

export interface SortPreferences {
  selectedAttribute: string
  selectedDirection: 'asc' | 'desc'
}

export const DEFAULT_SORT_ATTRIBUTES: SortAttribute[] = [
  { name: 'code', label: 'Key', defaultDirection: 'desc', system: true, icon: Ticket },
  { name: 'title', label: 'Title', defaultDirection: 'asc', system: true, icon: ALargeSmall },
  { name: 'priority', label: 'Priority', defaultDirection: 'desc', system: true, icon: ChevronsUp },
  // Labels drop the redundant "Date" — the calendar glyph carries it.
  { name: 'dateCreated', label: 'Created', defaultDirection: 'desc', system: true, icon: Calendar1 },
  { name: 'lastModified', label: 'Updated', defaultDirection: 'desc', system: true, icon: CalendarClock },
]

const DEFAULT_SORT_PREFERENCES: SortPreferences = {
  selectedAttribute: 'code',
  selectedDirection: 'desc',
}

// Local storage keys
const SORT_PREFERENCES_KEY = 'markdown-ticket-sort-preferences'

export function getSortPreferences(): SortPreferences {
  try {
    const stored = localStorage.getItem(SORT_PREFERENCES_KEY)
    if (stored) {
      return { ...DEFAULT_SORT_PREFERENCES, ...JSON.parse(stored) }
    }
  }
  catch (error) {
    console.warn('Failed to load sort preferences:', error)
  }
  return DEFAULT_SORT_PREFERENCES
}

export function setSortPreferences(preferences: SortPreferences): void {
  try {
    localStorage.setItem(SORT_PREFERENCES_KEY, JSON.stringify(preferences))
  }
  catch (error) {
    console.warn('Failed to save sort preferences:', error)
  }
}
