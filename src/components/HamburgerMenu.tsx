import type { SortPreferences } from '../config/sorting'
import { ArrowUpDown, Edit, Eye, EyeOff, Menu, Monitor, Moon, Plus, Settings, Sun, Trash2 } from 'lucide-react'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_SORT_ATTRIBUTES } from '../config/sorting'
import { useTheme } from '../hooks/useTheme'
import { nuclearCacheClear } from '../utils/cache'
import { getEventHistoryForceHidden, toggleEventHistory } from './DevTools/useEventHistoryState'
import { ButtonGroup, ButtonGroupSeparator } from './ui/button-group'
import { Button } from './ui/index'

interface HamburgerMenuProps {
  onAddProject: () => void
  onEditProject?: () => void
  hasActiveProject?: boolean
  sortPreferences?: SortPreferences
  onSortPreferencesChange?: (preferences: SortPreferences) => void
  onOpenSettings?: () => void
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  onAddProject,
  onEditProject,
  hasActiveProject = false,
  sortPreferences,
  onSortPreferencesChange,
  onOpenSettings,
}) => {
  const { themeMode, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [eventHistoryForceHidden, setEventHistoryForceHidden] = useState(() => getEventHistoryForceHidden())

  // Track EventHistory state changes
  useEffect(() => {
    const checkInterval = setInterval(() => {
      setEventHistoryForceHidden(getEventHistoryForceHidden())
    }, 100)
    return () => clearInterval(checkInterval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddProject = () => {
    setIsOpen(false)
    onAddProject()
  }

  const handleEditProject = () => {
    setIsOpen(false)
    onEditProject?.()
  }

  const handleClearCache = () => {
    console.warn('🔧 Cache clear button clicked')
    setIsOpen(false)
    nuclearCacheClear()
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

  return (
    <div className="relative flex" ref={menuRef}>
      <Button
        data-testid="hamburger-menu"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-md shadow-lg z-[60]">
          <div className="py-1">
            {/**
              * @testid add-project-button — Button to open add project modal
              */}
            <button
              data-testid="add-project-button"
              onClick={handleAddProject}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </button>

            {hasActiveProject && (
              <button
                data-testid="edit-project-button"
                onClick={handleEditProject}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
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
              * @testid event-history-toggle — Button to toggle event history panel
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
            <button
              data-testid="settings-button"
              onClick={handleOpenSettings}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </button>

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
        </div>
      )}
    </div>
  )
}
