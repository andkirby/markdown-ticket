import * as Tabs from '@radix-ui/react-tabs'
import { Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { getEventHistoryForceHidden, toggleEventHistory } from './DevTools/useEventHistoryState'
import { useTheme } from '../hooks/useTheme'
import { nuclearCacheClear } from '../utils/cache'
import { ButtonGroup } from './ui/button-group'
import { Modal, ModalBody, ModalHeader } from './ui/Modal'
import { Switch } from './ui/switch'

// Storage keys
const DEFAULT_VIEW_KEY = 'mdt-settings-default-view'
const CARD_DENSITY_KEY = 'mdt-settings-card-density'

type DefaultView = 'board' | 'list'
type CardDensity = 'comfortable' | 'compact'

function readStorageString(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  }
  catch {
    return fallback
  }
}

function writeStorageString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  }
  catch {
    console.warn(`Failed to save setting: ${key}`)
  }
}

function readAutoLinking(): boolean {
  try {
    const stored = localStorage.getItem('markdown-ticket-link-config')
    if (stored) {
      return (JSON.parse(stored) as { enableAutoLinking?: boolean }).enableAutoLinking ?? true
    }
  }
  catch { /* use default */ }
  return true
}

function writeAutoLinking(value: boolean): void {
  try {
    const stored = localStorage.getItem('markdown-ticket-link-config')
    const current = stored ? JSON.parse(stored) : {}
    localStorage.setItem('markdown-ticket-link-config', JSON.stringify({ ...current, enableAutoLinking: value }))
  }
  catch {
    console.warn('Failed to save link config')
  }
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { themeMode, setTheme } = useTheme()

  // Appearance
  const [defaultView, setDefaultView] = useState<DefaultView>(
    () => readStorageString(DEFAULT_VIEW_KEY, 'board') as DefaultView,
  )

  // Board
  const [cardDensity, setCardDensity] = useState<CardDensity>(
    () => readStorageString(CARD_DENSITY_KEY, 'comfortable') as CardDensity,
  )
  const [autoLinking, setAutoLinking] = useState(readAutoLinking)

  // Advanced
  const [eventHistoryVisible, setEventHistoryVisible] = useState(() => !getEventHistoryForceHidden())

  // Appearance handlers
  const handleThemeChange = useCallback((mode: 'light' | 'dark' | 'system') => {
    setTheme(mode)
  }, [setTheme])

  const handleDefaultViewChange = useCallback((view: DefaultView) => {
    setDefaultView(view)
    writeStorageString(DEFAULT_VIEW_KEY, view)
  }, [])

  // Board handlers
  const handleCardDensityChange = useCallback((density: CardDensity) => {
    setCardDensity(density)
    writeStorageString(CARD_DENSITY_KEY, density)
  }, [])

  const handleAutoLinkingChange = useCallback((checked: boolean) => {
    setAutoLinking(checked)
    writeAutoLinking(checked)
  }, [])

  // Advanced handlers
  const handleEventHistoryChange = useCallback((checked: boolean) => {
    setEventHistoryVisible(checked)
    const currentlyHidden = getEventHistoryForceHidden()
    if (checked && currentlyHidden) {
      toggleEventHistory()
    }
    else if (!checked && !currentlyHidden) {
      toggleEventHistory()
    }
  }, [])

  const handleClearCache = useCallback(() => {
    nuclearCacheClear()
  }, [])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" data-testid="settings-modal">
      <ModalHeader title="Settings" onClose={onClose} closeTestId="settings-close" />
      <ModalBody className="p-0">
        <Tabs.Root defaultValue="appearance">
          <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700">
            <Tabs.Trigger
              value="appearance"
              data-testid="settings-tab-appearance"
              className="settings-tab-trigger"
            >
              Appearance
            </Tabs.Trigger>
            <Tabs.Trigger
              value="board"
              data-testid="settings-tab-board"
              className="settings-tab-trigger"
            >
              Board
            </Tabs.Trigger>
            <Tabs.Trigger
              value="advanced"
              data-testid="settings-tab-advanced"
              className="settings-tab-trigger"
            >
              Advanced
            </Tabs.Trigger>
          </Tabs.List>

          {/* ── Appearance ─────────────────────────────────────── */}
          <Tabs.Content value="appearance" className="settings-tab-content">
            {/* Theme */}
            <div className="settings-group">
              <label className="settings-label">Theme</label>
              <p className="settings-desc">Choose light, dark, or system theme</p>
              <ButtonGroup orientation="horizontal" className="mt-3 w-full">
                <button
                  data-testid="settings-theme-light"
                  onClick={() => handleThemeChange('light')}
                  className={`settings-theme-btn rounded-l-md ${
                    themeMode === 'light' ? 'settings-theme-btn--active' : 'settings-theme-btn--inactive'
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  Light
                </button>
                <button
                  data-testid="settings-theme-dark"
                  onClick={() => handleThemeChange('dark')}
                  className={`settings-theme-btn ${
                    themeMode === 'dark' ? 'settings-theme-btn--active' : 'settings-theme-btn--inactive'
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </button>
                <button
                  data-testid="settings-theme-system"
                  onClick={() => handleThemeChange('system')}
                  className={`settings-theme-btn rounded-r-md ${
                    themeMode === 'system' ? 'settings-theme-btn--active' : 'settings-theme-btn--inactive'
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  System
                </button>
              </ButtonGroup>
            </div>

            {/* Default View */}
            <div className="settings-group">
              <label className="settings-label">Default View</label>
              <p className="settings-desc">Open this view when navigating to a project</p>
              <select
                data-testid="settings-default-view"
                value={defaultView}
                onChange={e => handleDefaultViewChange(e.target.value as DefaultView)}
                className="settings-select mt-2"
              >
                <option value="board">Board</option>
                <option value="list">List</option>
              </select>
            </div>
          </Tabs.Content>

          {/* ── Board ──────────────────────────────────────────── */}
          <Tabs.Content value="board" className="settings-tab-content">
            {/* Card Density */}
            <div className="settings-group">
              <label className="settings-label">Card Density</label>
              <p className="settings-desc">Compact shows more tickets per column</p>
              <select
                data-testid="settings-card-density"
                value={cardDensity}
                onChange={e => handleCardDensityChange(e.target.value as CardDensity)}
                className="settings-select mt-2"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </div>

            {/* Smart Links */}
            <div className="settings-group-row">
              <div>
                <label className="settings-label">Smart Links</label>
                <p className="settings-desc">Auto-detect ticket keys and document paths</p>
              </div>
              <Switch
                checked={autoLinking}
                onCheckedChange={handleAutoLinkingChange}
                data-testid="settings-auto-linking"
              />
            </div>
          </Tabs.Content>

          {/* ── Advanced ───────────────────────────────────────── */}
          <Tabs.Content value="advanced" className="settings-tab-content">
            {/* Event History */}
            <div className="settings-group-row">
              <div>
                <label className="settings-label">Event History</label>
                <p className="settings-desc">Show SSE event history panel</p>
              </div>
              <Switch
                checked={eventHistoryVisible}
                onCheckedChange={handleEventHistoryChange}
                data-testid="settings-event-history"
              />
            </div>

            {/* Cache */}
            <div className="settings-group-row">
              <div>
                <label className="settings-label">Cache</label>
                <p className="settings-desc">Clear all cached data and reload</p>
              </div>
              <button
                data-testid="settings-clear-cache"
                onClick={handleClearCache}
                className="settings-action-btn"
              >
                <Trash2 className="h-4 w-4" />
                Clear Cache
              </button>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </ModalBody>
    </Modal>
  )
}

/**
 * Read the stored default view setting.
 * Used by App.tsx on initial load to decide board vs list.
 */
export function getDefaultView(): DefaultView {
  return readStorageString(DEFAULT_VIEW_KEY, 'board') as DefaultView
}

/**
 * Read the stored card density setting.
 * Used by TicketCard to adjust padding/spacing.
 */
export function getCardDensity(): CardDensity {
  return readStorageString(CARD_DENSITY_KEY, 'comfortable') as CardDensity
}
