/**
 * ProjectSelectorCard Component (MDT-129)
 *
 * Displays a project as a card in the project selector.
 * Shows project code, title, description, and favorite indicator.
 * Used for both active project display (larger) and inactive projects.
 *
 * Behavior Requirements:
 * - BR-1.1: Active project shown as larger card with code and title
 * - BR-1.2: Favorite indicator on active project card
 */

import type { ProjectWithSelectorState } from './types'
import * as React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../UI/tooltip'

interface ProjectSelectorCardProps {
  /** Project with selector state to display */
  project: ProjectWithSelectorState
  /** Whether this is the currently active project */
  isActive: boolean
  /** Callback when project is selected */
  onSelect: (projectKey: string) => void
  /** Whether to show project description (for panel view or active card) */
  showDescription?: boolean
  /** Callback when favorite star is clicked */
  onFavoriteToggle?: (projectKey: string, e: React.MouseEvent) => void
  /** Whether to apply rail width constraints (only for rail active card) */
  useRailWidthConstraints?: boolean
}

/**
 * Star icon component for favorite indicator
 */
const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    className={`w-5 h-5 ${filled ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-gray-400'}`}
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  </svg>
)

/**
 * ProjectSelectorCard component
 *
 * Displays a project as a clickable card with:
 * - Project code (prominent display)
 * - Project title (full name)
 * - Project description (optional, when showDescription=true or isActive=true)
 * - Favorite indicator (star when favorited, clickable to toggle)
 *
 * @testid project-selector-card — Card container
 * @testid project-selector-card-{code} — Card for specific project (e.g., project-selector-card-MDT)
 */
const ProjectSelectorCard: React.FC<ProjectSelectorCardProps> = ({
  project,
  isActive,
  onSelect,
  showDescription = false,
  onFavoriteToggle,
  useRailWidthConstraints = false,
}) => {
  // Active cards always show description
  const shouldShowDescription = showDescription || isActive

  const handleCardClick = () => {
    onSelect(project.project.code || project.id)
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card selection
    if (onFavoriteToggle) {
      onFavoriteToggle(project.project.code || project.id, e)
    }
  }

  const cardClasses = `
    group relative
    ${isActive
      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg'
      : 'bg-gradient-to-br from-white to-gray-50/80 dark:from-slate-800 dark:to-slate-900/80 border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md'
    }
    border rounded-xl px-4 py-1.5 h-12
    ${useRailWidthConstraints ? 'min-w-[150px] max-w-[280px] flex-1' : ''}
    hover:-translate-y-0.5 hover:scale-[1.02]
    transition-all duration-200 ease-out
    cursor-pointer
  `

  const cardContent = (
    <div
      className={cardClasses}
      onClick={handleCardClick}
      data-testid={`project-selector-card-${project.project.code || project.id}`}
      data-project-key={project.project.code || project.id}
    >
      <div className="flex items-center gap-2 h-full">
        {/* Project code and title */}
        <div className="text-sm font-medium flex-shrink-0 text-gray-900 dark:text-white">
          {project.project.code || project.id}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-xs text-gray-700 dark:text-gray-300 truncate break-words leading-tight">
            {project.project.name}
          </div>
          {shouldShowDescription && project.project.description && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate break-words leading-tight mt-0.5">
              {project.project.description}
            </div>
          )}
        </div>

        {/* Favorite indicator - clickable */}
        {project.favorite && (
          <button
            className="flex-shrink-0 hover:scale-110 transition-transform cursor-pointer"
            onClick={handleFavoriteClick}
            title={onFavoriteToggle ? "Click to unfavorite" : "Favorited project"}
            aria-label="Toggle favorite"
          >
            <StarIcon filled={true} />
          </button>
        )}
        {!project.favorite && onFavoriteToggle && (
          <button
            className="flex-shrink-0 hover:scale-110 transition-transform cursor-pointer opacity-60 hover:opacity-100"
            onClick={handleFavoriteClick}
            title="Click to favorite"
            aria-label="Toggle favorite"
          >
            <StarIcon filled={false} />
          </button>
        )}
      </div>
    </div>
  )

  // Only add tooltip if not showing description inline
  if (!shouldShowDescription) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-medium">{project.project.name}</div>
            {project.project.description && (
              <div className="text-xs text-muted-foreground mt-1">{project.project.description}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return cardContent
}

export default ProjectSelectorCard
export { ProjectSelectorCard, type ProjectSelectorCardProps }
