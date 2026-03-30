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
import { Icon } from '../shared/Icon'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../ui/hover-card'

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
    group relative flex items-center justify-center
    ${isActive
        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg'
        : 'bg-gradient-to-br from-white to-gray-50/80 dark:from-slate-800 dark:to-slate-900/80 border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md'
    }
    border rounded-xl px-2 sm:px-4 py-1.5 min-h-12
    ${useRailWidthConstraints ? 'min-w-[100px] sm:min-w-[150px] max-w-[280px] flex-1' : ''}
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
      {/* Favorite indicator - overlay star */}
      {onFavoriteToggle && (
        <button
          className={`absolute top-1 right-1 w-5 h-5 hover:scale-110 transition-all cursor-pointer drop-shadow-md opacity-60 group-hover:opacity-100 ${
            project.favorite ? 'rotate-[15deg]' : ''
          }`}
          onClick={handleFavoriteClick}
          title={project.favorite ? 'Click to unfavorite' : 'Click to favorite'}
          aria-label="Toggle favorite"
        >
          <Icon
            name="fav-star"
            className={`fav-star fav-star--card ${project.favorite ? 'active' : ''}`}
          />
        </button>
      )}

      <div className="flex items-center gap-1 sm:gap-2 w-full">
        {/* Project code and title */}
        <div className="text-xs sm:text-sm font-medium flex-shrink-0 text-gray-900 dark:text-white">
          {project.project.code || project.id}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 truncate break-words leading-tight">
            {project.project.name}
          </div>
          {shouldShowDescription && project.project.description && (
            <div className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 truncate break-words leading-tight mt-0.5">
              {project.project.description}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Only add hover card if not showing description inline
  if (!shouldShowDescription) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          {cardContent}
        </HoverCardTrigger>
        <HoverCardContent className="w-80 p-0">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                {project.project.code || project.id}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 leading-tight">
                {project.project.name}
              </div>
            </div>
            {project.project.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5 whitespace-pre-wrap">
                {project.project.description}
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  return cardContent
}

export default ProjectSelectorCard
export { ProjectSelectorCard, type ProjectSelectorCardProps }
