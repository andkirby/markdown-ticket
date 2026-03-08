/**
 * MDT-131: ViewModeSwitcher Component
 *
 * Container component for view mode switching.
 * Composes BoardListToggle and Documents button with responsive behavior.
 */

import { useState, useEffect } from 'react'
import { BoardListToggle } from './BoardListToggle'
import type { ViewMode } from './types'

const DESKTOP_BREAKPOINT = 768

interface ViewModeSwitcherProps {
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void
}

export function ViewModeSwitcher({
  currentMode,
  onModeChange,
}: ViewModeSwitcherProps) {
  const isDocumentsView = currentMode === 'documents'
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const checkViewport = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    }

    // Initial check
    checkViewport()

    // Listen for resize
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  return (
    <div className="flex items-center gap-2">
      {/* Board/List Toggle - always visible */}
      <BoardListToggle
        currentMode={currentMode}
        onModeChange={onModeChange}
        isDocumentsView={isDocumentsView}
      />

      {/* Documents button - desktop only (>= 768px) */}
      {isDesktop && (
        <button
          data-testid="documents-button"
          onClick={() => onModeChange('documents')}
          className={`h-12 w-12 rounded-md transition-all border-2 ${
            isDocumentsView
              ? 'border-2 border-primary'
              : 'border-2 border-transparent hover:border-muted-foreground/30'
          }`}
          type="button"
          title="Documents View"
        >
          <img
            src="/icon_docs_64.webp"
            alt="Documents"
            className="w-8 h-8 mx-auto dark:invert"
          />
        </button>
      )}
    </div>
  )
}
