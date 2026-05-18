import type { CardDensity, DefaultView, MarkdownDensity } from '../config/settingsPreferences'
import type { TicketCardBadgeId } from '../config/ticketCardBadges'
import * as Tabs from '@radix-ui/react-tabs'
import { Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import {
  getCardDensity,
  getDefaultView,
  getMarkdownDensity,
  setCardDensityPreference,
  setDefaultViewPreference,
  setMarkdownDensityPreference,
} from '../config/settingsPreferences'
import {
  getVisibleTicketCardBadges,
  setVisibleTicketCardBadges,
  TicketCardBadgeOptions,
} from '../config/ticketCardBadges'
import { useTheme } from '../hooks/useTheme'
import { nuclearCacheClear } from '../utils/cache'
import { getEventHistoryForceHidden, toggleEventHistory } from './DevTools/useEventHistoryState'
import { ButtonGroup } from './ui/button-group'
import { Modal, ModalBody, ModalHeader } from './ui/Modal'
import { Switch } from './ui/switch'

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

type SettingsTab = 'appearance' | 'board' | 'advanced'

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { themeMode, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')

  // Appearance
  const [defaultView, setDefaultView] = useState<DefaultView>(
    getDefaultView,
  )
  const [markdownDensity, setMarkdownDensity] = useState<MarkdownDensity>(
    getMarkdownDensity,
  )

  // Board
  const [cardDensity, setCardDensity] = useState<CardDensity>(
    getCardDensity,
  )
  const [autoLinking, setAutoLinking] = useState(readAutoLinking)
  const [visibleBadgeIds, setVisibleBadgeIds] = useState(getVisibleTicketCardBadges)

  // Advanced
  const [eventHistoryVisible, setEventHistoryVisible] = useState(() => !getEventHistoryForceHidden())

  // Appearance handlers
  const handleThemeChange = useCallback((mode: 'light' | 'dark' | 'system') => {
    setTheme(mode)
  }, [setTheme])

  const handleDefaultViewChange = useCallback((view: DefaultView) => {
    setDefaultView(view)
    setDefaultViewPreference(view)
  }, [])

  const handleMarkdownDensityChange = useCallback((density: MarkdownDensity) => {
    setMarkdownDensity(density)
    setMarkdownDensityPreference(density)
  }, [])

  // Board handlers
  const handleCardDensityChange = useCallback((density: CardDensity) => {
    setCardDensity(density)
    setCardDensityPreference(density)
  }, [])

  const handleAutoLinkingChange = useCallback((checked: boolean) => {
    setAutoLinking(checked)
    writeAutoLinking(checked)
  }, [])

  const handleVisibleBadgeChange = useCallback((badgeId: TicketCardBadgeId, checked: boolean) => {
    setVisibleBadgeIds((currentBadgeIds) => {
      if (!checked && currentBadgeIds.length === 1 && currentBadgeIds.includes(badgeId))
        return currentBadgeIds

      const nextBadgeIds = checked
        ? [...currentBadgeIds, badgeId]
        : currentBadgeIds.filter(currentBadgeId => currentBadgeId !== badgeId)

      return setVisibleTicketCardBadges(nextBadgeIds)
    })
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
        <Tabs.Root value={activeTab} onValueChange={value => setActiveTab(value as SettingsTab)}>
          <Tabs.List className="tab__list settings-tab-list">
            <Tabs.Trigger
              value="appearance"
              data-testid="settings-tab-appearance"
              className="tab tab--fill"
              onClick={() => setActiveTab('appearance')}
            >
              Appearance
            </Tabs.Trigger>
            <Tabs.Trigger
              value="board"
              data-testid="settings-tab-board"
              className="tab tab--fill"
              onClick={() => setActiveTab('board')}
            >
              Board
            </Tabs.Trigger>
            <Tabs.Trigger
              value="advanced"
              data-testid="settings-tab-advanced"
              className="tab tab--fill"
              onClick={() => setActiveTab('advanced')}
            >
              Advanced
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="appearance" className="tab__content">
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

            <div className="settings-group">
              <label className="settings-label">Markdown Density</label>
              <p className="settings-desc">Adjust rendered ticket and document text size</p>
              <select
                data-testid="settings-markdown-density"
                value={markdownDensity}
                onChange={e => handleMarkdownDensityChange(e.target.value as MarkdownDensity)}
                className="settings-select mt-2"
              >
                <option value="compact">Compact</option>
                <option value="default">Default</option>
                <option value="comfortable">Comfortable</option>
              </select>
            </div>
          </Tabs.Content>

          <Tabs.Content value="board" className="tab__content">
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

            <div className="settings-group">
              <label className="settings-label">Visible Card Badges</label>
              <p className="settings-desc">Choose which badges appear on board ticket cards</p>
              <div className="settings-checkbox-list" data-testid="settings-visible-card-badges">
                {TicketCardBadgeOptions.map(option => (
                  <label key={option.id} className="settings-checkbox-row">
                    <input
                      type="checkbox"
                      checked={visibleBadgeIds.includes(option.id)}
                      onChange={e => handleVisibleBadgeChange(option.id, e.target.checked)}
                      data-testid={`settings-visible-badge-${option.id}`}
                      className="settings-checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </Tabs.Content>

          <Tabs.Content value="advanced" className="tab__content">
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
