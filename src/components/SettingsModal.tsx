import type { Project } from '@mdt/shared/models/Project'
import type { CardDensity, DefaultView, MarkdownDensity } from '../config/settingsPreferences'
import type { TicketCardBadgeId } from '../config/ticketCardBadges'
import * as Tabs from '@radix-ui/react-tabs'
import { Info, Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { authFetch } from '../auth/authFetch'
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
import { getProjectCode } from '../utils/projectUtils'
import { getEventHistoryForceHidden, toggleEventHistory } from './DevTools/useEventHistoryState'
import { ButtonGroup } from './ui/button-group'
import { Modal, ModalBody, ModalHeader } from './ui/Modal'
import { Switch } from './ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

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
  selectedProject?: Project | null
  onProjectSharingUpdated?: () => Promise<void> | void
}

type SettingsTab = 'appearance' | 'board' | 'sharing' | 'advanced'
type SharingMode = 'private' | 'unlisted-readonly' | 'public-readonly'

const SHARING_MODES: Array<{ value: SharingMode, label: string }> = [
  { value: 'private', label: 'Private' },
  { value: 'unlisted-readonly', label: 'Unlisted read-only' },
  { value: 'public-readonly', label: 'Public read-only' },
]

async function getSharingErrorMessage(response: Response, projectCode: string): Promise<string> {
  const responseMessage = await readErrorMessage(response)
  const statusLabel = `${response.status} ${response.statusText || 'Error'}`.trim()

  if (response.status === 404) {
    return `Sharing update failed: project "${projectCode}" or the sharing endpoint was not found. Refresh the project list and try again. (${statusLabel})`
  }

  if (response.status === 401 || response.status === 403) {
    return `Sharing update failed: owner access is required. Unlock with an owner token and try again. (${statusLabel})`
  }

  return `Sharing update failed${responseMessage ? `: ${responseMessage}` : ''}. (${statusLabel})`
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await response.json() as { error?: unknown, message?: unknown }
      const message = typeof body.message === 'string' ? body.message : undefined
      const error = typeof body.error === 'string' ? body.error : undefined
      return message || error || ''
    }

    return (await response.text()).trim()
  }
  catch {
    return ''
  }
}

export function SettingsModal({ isOpen, onClose, selectedProject, onProjectSharingUpdated }: SettingsModalProps) {
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
  const [sharingMode, setSharingMode] = useState<SharingMode>('private')
  const [shareId, setShareId] = useState('')
  const [sharingStatus, setSharingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [sharingError, setSharingError] = useState<string | null>(null)

  // Advanced
  const [eventHistoryVisible, setEventHistoryVisible] = useState(() => !getEventHistoryForceHidden())

  useEffect(() => {
    if (!selectedProject) {
      if (activeTab === 'sharing') {
        setActiveTab('appearance')
      }
      return
    }

    const sharing = selectedProject.metadata?.sharing
    setSharingMode((sharing?.mode as SharingMode | undefined) || 'private')
    setShareId(sharing?.shareId || '')
    setSharingStatus('idle')
    setSharingError(null)
  }, [activeTab, selectedProject])

  const shareUrl = useMemo(() => {
    if (sharingMode === 'private' || !shareId) {
      return ''
    }

    return `${window.location.origin}/share/${shareId}`
  }, [shareId, sharingMode])

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

  const updateSharing = useCallback(async (rotateShareId = false) => {
    if (!selectedProject) {
      return
    }

    setSharingStatus('saving')
    setSharingError(null)

    try {
      const projectCode = getProjectCode(selectedProject)
      const response = await authFetch(`/api/projects/${encodeURIComponent(projectCode)}/sharing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        ownerIntent: true,
        body: JSON.stringify({
          mode: sharingMode,
          ...(rotateShareId ? { rotateShareId: true } : {}),
        }),
      })

      if (!response.ok) {
        throw new Error(await getSharingErrorMessage(response, projectCode))
      }

      const updatedProject = await response.json() as Project
      setShareId(updatedProject.metadata?.sharing?.shareId || '')
      setSharingStatus('saved')
      await onProjectSharingUpdated?.()
    }
    catch (error) {
      setSharingStatus('error')
      setSharingError(error instanceof Error ? error.message : 'Failed to update sharing')
    }
  }, [onProjectSharingUpdated, selectedProject, sharingMode])

  const handleSaveSharing = useCallback(async () => {
    await updateSharing(false)
  }, [updateSharing])

  const handleRotateShareId = useCallback(async () => {
    await updateSharing(true)
  }, [updateSharing])

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
            {selectedProject && (
              <Tabs.Trigger
                value="sharing"
                data-testid="settings-tab-sharing"
                className="tab tab--fill"
                onClick={() => setActiveTab('sharing')}
              >
                Sharing
              </Tabs.Trigger>
            )}
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

          {selectedProject && (
            <Tabs.Content value="sharing" className="tab__content">
              <div className="settings-group">
                <div className="settings-label-row">
                  <label className="settings-label" htmlFor="settings-sharing-mode">Project Access</label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          data-testid="settings-sharing-info"
                          aria-label="Project access mode details"
                          className="settings-info-trigger"
                        >
                          <Info className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Private hides the project. Unlisted creates a direct read-only link. Public also lists the project for anonymous visitors.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <select
                  id="settings-sharing-mode"
                  data-testid="settings-sharing-mode"
                  value={sharingMode}
                  onChange={event => setSharingMode(event.target.value as SharingMode)}
                  className="settings-select mt-2"
                >
                  {SHARING_MODES.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {sharingMode !== 'private' && (
                <div className="settings-group">
                  <label className="settings-label" htmlFor="settings-share-url">Share Link</label>
                  {shareUrl && (
                    <input
                      id="settings-share-url"
                      data-testid="settings-share-url"
                      value={shareUrl}
                      readOnly
                      className="settings-input mt-2 font-mono text-xs"
                    />
                  )}
                  {!shareUrl && <p className="settings-desc mt-2">Save to generate a share link.</p>}
                </div>
              )}

              <div className="settings-group-row">
                <div>
                  <label className="settings-label">Save Sharing</label>
                  {sharingError && <p className="settings-desc text-destructive">{sharingError}</p>}
                  {sharingStatus === 'saved' && <p className="settings-desc">Sharing updated.</p>}
                </div>
                <div className="flex gap-2">
                  {sharingMode !== 'private' && shareId && (
                    <button
                      data-testid="settings-rotate-share-id"
                      onClick={handleRotateShareId}
                      disabled={sharingStatus === 'saving'}
                      className="settings-action-btn disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Rotate
                    </button>
                  )}
                  <button
                    data-testid="settings-save-sharing"
                    onClick={handleSaveSharing}
                    disabled={sharingStatus === 'saving'}
                    className="settings-action-btn disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sharingStatus === 'saving' ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </Tabs.Content>
          )}

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
