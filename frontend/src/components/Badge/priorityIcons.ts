import type { LucideIcon } from 'lucide-react'
import { ChevronDown, ChevronUp, Equal, Flame } from 'lucide-react'

/**
 * Bold directional glyph per priority (mirrors designs/board-zai priority icons).
 * Kept in a non-component module so PriorityBadge / PriorityIcon component files
 * stay Fast-Refresh-clean (react-refresh/only-export-components).
 */
export const PRIORITY_ICON: Record<string, LucideIcon> = {
  critical: Flame,
  high: ChevronUp,
  medium: Equal,
  low: ChevronDown,
}
