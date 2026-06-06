/**
 * LauncherButton Component (MDT-129)
 *
 * Launcher control button at the end of the project selector rail.
 * Opens the project selector panel when clicked.
 *
 * Behavior Requirements:
 * - BR-3.1: Single launcher control at rail end
 * - BR-3.3: Clicking opens panel via onLauncherClick callback
 */

import { Plus } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Props for LauncherButton component
 */
export interface LauncherButtonProps {
  /** Callback when launcher is clicked */
  onLauncherClick: () => void
  /** Whether the panel is currently open */
  isPanelOpen?: boolean
}

/**
 * LauncherButton component
 *
 * Displays a circular launcher button with a plus icon.
 * Opens the project selector panel on click.
 *
 * Styling:
 * - Gradient background with hover effects
 * - Rounded full circle (w-10 h-10)
 * - Backdrop blur for glassmorphism effect
 * - Smooth transitions on hover
 *
 * @testid project-selector-launcher — Launcher button
 */
const LauncherButton: React.FC<LauncherButtonProps> = ({
  onLauncherClick,
  isPanelOpen = false,
}) => {
  const handleClick = () => {
    onLauncherClick()
  }

  return (
    <button
      className={cn('project-launcher project-lift', isPanelOpen && 'active')}
      onClick={handleClick}
      data-testid="project-selector-launcher"
      aria-label="Open project selector panel"
      aria-expanded={isPanelOpen}
      title="Open project selector panel"
      type="button"
    >
      <Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
    </button>
  )
}

export default LauncherButton
