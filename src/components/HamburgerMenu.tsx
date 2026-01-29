import { Edit, Eye, EyeOff, Hash, Menu, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useConfig } from '../hooks/useConfig'
import { nuclearCacheClear } from '../utils/cache'
import { Button } from './UI/index'
import { toggleEventHistory, getEventHistoryForceHidden } from './DevTools/useEventHistoryState'

interface HamburgerMenuProps {
  onAddProject: () => void
  onEditProject?: () => void
  onCounterAPI?: () => void
  hasActiveProject?: boolean
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  onAddProject,
  onEditProject,
  onCounterAPI,
  hasActiveProject = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [eventHistoryForceHidden, setEventHistoryForceHidden] = useState(getEventHistoryForceHidden())
  const { isCounterAPIEnabled } = useConfig()

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

  const handleCounterAPI = () => {
    setIsOpen(false)
    onCounterAPI?.()
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

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-md shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={handleAddProject}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </button>
            {hasActiveProject && onEditProject && (
              <button
                onClick={handleEditProject}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </button>
            )}
            {isCounterAPIEnabled() && onCounterAPI && (
              <button
                onClick={handleCounterAPI}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Hash className="h-4 w-4 mr-2" />
                Counter API
              </button>
            )}
            <button
              onClick={handleClearCache}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </button>
            {/* Event History Toggle - only in development */}
            {import.meta.env.DEV && (
              <button
                onClick={handleToggleEventHistory}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                {eventHistoryForceHidden ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Event History
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Event History
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
