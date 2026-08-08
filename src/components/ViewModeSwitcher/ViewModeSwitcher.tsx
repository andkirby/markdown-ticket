import type { LucideIcon } from 'lucide-react'
import type { ViewSwitcherMode } from './types'
import { Columns3, FileText, List, Rows3 } from 'lucide-react'

interface ViewModeSwitcherProps {
  currentMode: ViewSwitcherMode
  onModeChange: (mode: ViewSwitcherMode) => void
}

interface ViewSwitcherItem {
  id: ViewSwitcherMode
  label: string
  testId: string
  icon: LucideIcon
}

const VIEW_SWITCHER_ITEMS: ViewSwitcherItem[] = [
  { id: 'board', label: 'Board', testId: 'board-mode-flat-toggle', icon: Columns3 },
  { id: 'swimlanes', label: 'Swimlanes', testId: 'board-mode-epics-toggle', icon: Rows3 },
  { id: 'list', label: 'List', testId: 'view-mode-list-toggle', icon: List },
  { id: 'documents', label: 'Docs', testId: 'documents-button', icon: FileText },
]

export function ViewModeSwitcher({
  currentMode,
  onModeChange,
}: ViewModeSwitcherProps) {
  return (
    <div
      className="view-mode-switcher"
      data-testid="view-mode-switcher"
      role="group"
      aria-label="View mode"
    >
      {VIEW_SWITCHER_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = currentMode === item.id
        return (
          <button
            key={item.id}
            type="button"
            className="view-mode-switcher__button"
            data-testid={item.testId}
            data-view-mode={item.id}
            data-active={isActive ? 'true' : 'false'}
            aria-pressed={isActive}
            aria-label={item.label}
            title={item.label}
            onClick={() => onModeChange(item.id)}
          >
            <Icon size={14} strokeWidth={2.2} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
