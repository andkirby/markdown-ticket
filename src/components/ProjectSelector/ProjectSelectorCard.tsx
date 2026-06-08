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
import { cn } from '@/lib/utils'
import { useAccentStyle } from './useAccentStyle'
// eslint-disable-next-line no-restricted-imports
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
  /** Override test ID prefix (default: "project-selector-card") */
  testIdPrefix?: string
  /** Optional keydown handler from parent composite views */
  /** Whether accent coloring is enabled */
  accentEnabled?: boolean
  accentStyle?: 'gradient' | 'flat' | 'plate'
  autocolor?: boolean
  hasAccent?: boolean
  onCardKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void
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
 * @testid project-browser-card-{code} — Card in browser panel when testIdPrefix="project-browser-card"
 */
const ProjectSelectorCard: React.FC<ProjectSelectorCardProps> = ({
  project,
  isActive,
  onSelect,
  showDescription = false,
  onFavoriteToggle,
  useRailWidthConstraints = false,
  testIdPrefix,
  onCardKeyDown,
  accentEnabled = true,
  accentStyle = 'gradient',
  autocolor = true,
  hasAccent = false,
}) => {
  // Active cards always show description
  const shouldShowDescription = showDescription || isActive

  const handleCardClick = () => {
    onSelect(project.project.code || project.id)
  }

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ')
      return

    e.preventDefault()
    onSelect(project.project.code || project.id)
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card selection
    if (onFavoriteToggle) {
      onFavoriteToggle(project.project.code || project.id, e)
    }
  }

  const handleFavoriteKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    e.stopPropagation()
  }

  const isProjectBrowserCard = testIdPrefix === 'project-browser-card'

  const { style: cardStyle, accentBrightness } = useAccentStyle({
    project,
    accentEnabled,
    accentStyle,
    autocolor,
    hasAccent,
  })

  const cardClasses = cn(
    'project-card project-lift group min-h-12',
    useRailWidthConstraints && 'project-card--rail',
  )

  const cardContent = (
    <div
      className={cardClasses}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        onCardKeyDown?.(event)
        handleCardKeyDown(event)
      }}
      style={cardStyle}
      role="button"
      tabIndex={0}
      aria-label={`Select project ${project.project.name || project.project.code || project.id}`}
      data-testid={`${testIdPrefix ?? 'project-selector-card'}-${project.project.code || project.id}`}
      data-project-key={project.project.code || project.id}
      data-active={isActive ? 'true' : undefined}
      data-accent-enabled={accentEnabled}
      data-accent-style={accentStyle}
      data-autocolor={autocolor}
      {...(hasAccent && { 'data-has-accent': '' })}
      {...(accentBrightness && { 'data-accent-brightness': accentBrightness })}
      data-project-browser-card={isProjectBrowserCard ? 'true' : undefined}
    >
      {/* Favorite indicator - overlay star */}
      {onFavoriteToggle && (
        <button
          className={cn(
            'fav-star-btn fav-star-btn--card',
          )}
          data-favorited={project.favorite ? 'true' : undefined}
          onClick={handleFavoriteClick}
          onKeyDown={handleFavoriteKeyDown}
          title={project.favorite ? 'Click to unfavorite' : 'Click to favorite'}
          aria-label="Toggle favorite"
        >
          <Icon
            name="fav-star"
            className={cn('fav-star fav-star--card', project.favorite && 'active')}
          />
        </button>
      )}

      <div className="project-card__surface" aria-hidden="true">
        <div className="project-card__identity" />
      </div>

      <div className="project-card__content">
        <div className="project-card__code">
          {project.project.code || project.id}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="project-card__title">
            {project.project.name}
          </div>
          {shouldShowDescription && project.project.description && (
            <div className="project-card__desc">
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
