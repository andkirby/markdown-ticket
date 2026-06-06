/**
 * ProjectSelectorChip Component (MDT-129)
 *
 * Displays an inactive project in the selector rail as a compact chip.
 * Shows project code with favorite indicator as rotated overlay star.
 *
 * Behavior Requirements:
 * - Always renders as compact code-only chip
 * - Favorite indicator shown as rotated star (15deg) in top-right corner
 * - No title or description expansion in the rail
 */

import type { ProjectWithSelectorState } from './types'
import * as React from 'react'
import { cn } from '@/lib/utils'
// eslint-disable-next-line no-restricted-imports
import { Icon } from '../shared/Icon'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../ui/hover-card'

interface ProjectSelectorChipProps {
  /** Project with selector state to display */
  project: ProjectWithSelectorState
  /** Whether to render in compact mode (unused, always compact) */
  compact?: boolean
  /** Callback when project is selected */
  onSelect: (projectKey: string) => void
}

/**
 * ProjectSelectorChip component
 *
 * Displays an inactive project as a clickable chip:
 * - Shows project code as compact badge
 * - Favorite indicator as overlay star in top-right corner (rotated 15deg)
 *
 * @testid project-selector-chip — Chip container
 * @testid project-selector-chip-{code} — Chip for specific project (e.g., project-selector-chip-MDT)
 */
const ProjectSelectorChip: React.FC<ProjectSelectorChipProps> = ({
  project,
  compact: _compact,
  onSelect,
}) => {
  const handleClick = () => {
    onSelect(project.project.code || project.id)
  }

  const chipClasses = cn('project-chip project-lift group')

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          className={chipClasses}
          onClick={handleClick}
          data-testid={`project-selector-chip-${project.project.code || project.id}`}
          data-project-key={project.project.code || project.id}
        >
          <span className="project-chip__code">
            {project.project.code || project.id}
          </span>

          {/* Favorite indicator - rotated star in top-right corner */}
          {project.favorite && (
            <Icon name="fav-star" className="fav-star fav-star--chip" aria-label="Favorited" />
          )}
        </div>
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

export default ProjectSelectorChip
export { ProjectSelectorChip, type ProjectSelectorChipProps }
