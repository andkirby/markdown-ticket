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

import * as React from 'react'
import { Plus } from 'lucide-react'

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

  const buttonClasses = `
    inline-flex items-center justify-center
    bg-gradient-to-br from-gray-100 to-gray-200/80
    dark:from-slate-700 dark:to-slate-800/80
    border border-gray-300/50 dark:border-slate-600/50
    rounded-full w-10 h-10
    hover:from-blue-50 hover:to-indigo-50
    dark:hover:from-blue-950 dark:hover:to-indigo-950
    hover:border-blue-300 dark:hover:border-blue-700
    hover:-translate-y-0.5 hover:scale-[1.02]
    transition-all duration-200 ease-out
    cursor-pointer
    shadow-sm hover:shadow-md
    backdrop-blur-sm
    ${isPanelOpen ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}
  `

  return (
    <button
      className={buttonClasses}
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
