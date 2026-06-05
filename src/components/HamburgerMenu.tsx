import type { SortPreferences } from '../config/sorting'
import type { AccessMode, AuthAccessIndicator } from '@/auth/AuthSessionContext'
import { ArrowUpDown, Edit, Eye, EyeOff, KeyRound, LockKeyhole, Menu, Monitor, Moon, Plus, Settings, Sun, Trash2 } from 'lucide-react'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DEFAULT_SORT_ATTRIBUTES } from '../config/sorting'
import { useTheme } from '../hooks/useTheme'
import { nuclearCacheClear } from '../utils/cache'
import { getEventHistoryForceHidden, subscribeEventHistoryState, toggleEventHistory } from './DevTools/useEventHistoryState'
import { ButtonGroup, ButtonGroupSeparator } from './ui/button-group'
import { Button } from './ui/index'

interface HamburgerMenuProps {
  onAddProject?: () => void
  onEditProject?: () => void
  hasActiveProject?: boolean
  sortPreferences?: SortPreferences
  onSortPreferencesChange?: (preferences: SortPreferences) => void
  onOpenSettings?: () => void
  onUnlockOwnerAccess?: () => void
  onLock?: () => Promise<void> | void
  accessMode?: AccessMode
  accessIndicator?: AuthAccessIndicator
  canManageProjects?: boolean
  canManageSharing?: boolean
  canUseOwnerEndpoints?: boolean
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  onAddProject,
  onEditProject,
  hasActiveProject = false,
  sortPreferences,
  onSortPreferencesChange,
  onOpenSettings,
  onUnlockOwnerAccess,
  onLock,
  accessMode = 'unknown',
  accessIndicator = 'none',
  canManageProjects = true,
  canManageSharing = canManageProjects,
  canUseOwnerEndpoints = canManageProjects,
}) => {
  const { themeMode, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [eventHistoryForceHidden, setEventHistoryForceHidden] = useState(() => getEventHistoryForceHidden())

  // Track EventHistory state changes
  useEffect(() => {
    return subscribeEventHistoryState((_open, hidden) => {
      setEventHistoryForceHidden(hidden)
    })
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)
        && (!dropdownRef.current || !dropdownRef.current.contains(event.target as Node))) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddProject = () => {
    setIsOpen(false)
    onAddProject?.()
  }

  const handleEditProject = () => {
    setIsOpen(false)
    onEditProject?.()
  }

  const handleClearCache = () => {
    console.warn('🔧 Cache clear button clicked')
    setIsOpen(false)
    nuclearCacheClear({ includeBackend: canUseOwnerEndpoints })
  }

  const handleToggleEventHistory = () => {
    setIsOpen(false)
    toggleEventHistory()
  }

  const handleSortAttributeChange = (attribute: string) => {
    const sortAttribute = DEFAULT_SORT_ATTRIBUTES.find(attr => attr.name === attribute)
    const newPreferences = {
      selectedAttribute: attribute,
      selectedDirection: sortAttribute?.defaultDirection || 'desc',
    }
    setIsOpen(false)
    onSortPreferencesChange?.(newPreferences)
  }

  const handleSortDirectionToggle = () => {
    if (!sortPreferences)
      return
    const newDirection = sortPreferences.selectedDirection === 'asc' ? 'desc' : 'asc'
    setIsOpen(false)
    onSortPreferencesChange?.({
      ...sortPreferences,
      selectedDirection: newDirection,
    })
  }

  const handleOpenSettings = () => {
    setIsOpen(false)
    onOpenSettings?.()
  }

  const handleUnlockOwnerAccess = () => {
    setIsOpen(false)
    onUnlockOwnerAccess?.()
  }

  const handleLock = () => {
    setIsOpen(false)
    void onLock?.()
  }

  const showLockAction = accessMode === 'owner-admin' && canUseOwnerEndpoints && Boolean(onLock)
  const showReadOnlyStatus = accessMode === 'read-only'
  const accessIndicatorClass = accessIndicator === 'owner'
    ? 'bg-green-500'
    : accessIndicator === 'shared'
      ? 'bg-orange-500'
      : ''

  return (
    <div className="relative flex" ref={menuRef}>
      <Button
        data-testid="hamburger-menu"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Menu className="h-4 w-4" />
        {accessIndicator !== 'none' && (
          <span
            data-testid="auth-access-indicator"
            className={`absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-background ${accessIndicatorClass}`}
            aria-hidden="true"
          />
        )}
      </Button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-background border border-border rounded-md shadow-lg z-[60]"
          style={{
            top: menuRef.current ? menuRef.current.getBoundingClientRect().bottom + 4 : 0,
            right: window.innerWidth - (menuRef.current?.getBoundingClientRect().right ?? 0),
            width: 192,
          }}
        >
          <div className="py-1">
            {showReadOnlyStatus && (
              <>
                <div
                  data-testid="sharing-readonly-badge"
                  className="flex items-center w-full px-4 py-2 text-sm text-muted-foreground"
                >
                  {accessIndicator === 'shared' && <span className="h-2 w-2 rounded-full mr-2 bg-orange-500" />}
                  Read only
                </div>
                <div className="my-1 border-t border-border" />
              </>
            )}

            {showLockAction && (
              <>
                <button
                  data-testid="auth-lock-button"
                  onClick={handleLock}
                  className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <LockKeyhole className="h-4 w-4 mr-2" />
                  Lock
                </button>
                <div className="my-1 border-t border-border" />
              </>
            )}

            {/**
              * @testid add-project-button — Button to open add project modal
              */}
            {canManageProjects && onAddProject && (
              <button
                data-testid="add-project-button"
                onClick={handleAddProject}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </button>
            )}

            {canManageProjects && hasActiveProject && (
              <button
                data-testid="edit-project-button"
                onClick={handleEditProject}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </button>
            )}

            {onUnlockOwnerAccess && (
              <button
                data-testid="sharing-owner-unlock-button"
                onClick={handleUnlockOwnerAccess}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Unlock access
              </button>
            )}

            {/* Sort Controls - mobile only (desktop has visible sort controls) */}
            {sortPreferences && onSortPreferencesChange && (
              <div className="sm:hidden">
                <>
                  <div className="px-4 py-2 border-t border-border">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Sort by</div>
                    <div className="space-y-1">
                      {DEFAULT_SORT_ATTRIBUTES.map(attr => (
                        <button
                          key={attr.name}
                          onClick={() => handleSortAttributeChange(attr.name)}
                          className={`flex items-center w-full px-3 py-1.5 text-sm rounded transition-colors ${
                            sortPreferences.selectedAttribute === attr.name
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          {attr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSortDirectionToggle}
                    className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Sort
                    {' '}
                    {sortPreferences.selectedDirection === 'asc' ? 'Descending' : 'Ascending'}
                  </button>
                </>
              </div>
            )}

            {/**
              * @testid clear-cache-button — Button to clear browser cache
              */}
            <button
              data-testid="clear-cache-button"
              onClick={handleClearCache}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </button>

            {/**
              * @testid event-history-toggle — Button to toggle event history visibility
              */}
            {!eventHistoryForceHidden && (
              <button
                data-testid="event-history-toggle"
                onClick={handleToggleEventHistory}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                Event History
              </button>
            )}

            {eventHistoryForceHidden && (
              <button
                data-testid="event-history-toggle"
                onClick={handleToggleEventHistory}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Event History
              </button>
            )}

            {/* Settings */}
            {canManageSharing && onOpenSettings && (
              <button
                data-testid="settings-button"
                onClick={handleOpenSettings}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
            )}

            {/* Delimiter before theme quick-access */}
            <ButtonGroupSeparator />

            {/* Theme button group — quick access */}
            <div className="px-2 py-1">
              <ButtonGroup orientation="horizontal" className="w-full">
                <button
                  data-testid="theme-light"
                  onClick={() => {
                    setTheme('light')
                    setIsOpen(false)
                  }}
                  className={`flex-1 flex items-center justify-center px-3 py-2 text-sm transition-colors rounded-l-md ${
                    themeMode === 'light'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                  title="Light theme"
                >
                  <Sun className="h-4 w-4" />
                </button>

                <button
                  data-testid="theme-dark"
                  onClick={() => {
                    setTheme('dark')
                    setIsOpen(false)
                  }}
                  className={`flex-1 flex items-center justify-center px-3 py-2 text-sm transition-colors ${
                    themeMode === 'dark'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                  title="Dark theme"
                >
                  <Moon className="h-4 w-4" />
                </button>

                <button
                  data-testid="theme-system"
                  onClick={() => {
                    setTheme('system')
                    setIsOpen(false)
                  }}
                  className={`flex-1 flex items-center justify-center px-3 py-2 text-sm transition-colors rounded-r-md ${
                    themeMode === 'system'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                  title="System theme"
                >
                  <Monitor className="h-4 w-4" />
                </button>
              </ButtonGroup>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
