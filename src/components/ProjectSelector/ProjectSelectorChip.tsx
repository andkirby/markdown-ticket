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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../UI/hover-card'
import ProjectSelectorCard from './ProjectSelectorCard'

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

  const chipClasses = `
    group relative inline-flex items-center justify-center
    bg-gradient-to-br from-white to-gray-50/80
    dark:from-slate-800 dark:to-slate-900/80
    border border-gray-200/50 dark:border-slate-700/50
    rounded-md px-2 py-1.5 h-12
    hover:bg-accent hover:text-accent-foreground
    hover:border-blue-300 dark:hover:border-blue-700
    hover:-translate-y-0.5 hover:scale-[1.02]
    transition-all duration-200 ease-out
    cursor-pointer
    shadow-sm hover:shadow-md
  `

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          className={chipClasses}
          onClick={handleClick}
          data-testid={`project-selector-chip-${project.project.code || project.id}`}
          data-project-key={project.project.code || project.id}
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {project.project.code || project.id}
          </span>

          {/* Favorite indicator - rotated star in top-right corner */}
          {project.favorite && (
            <svg
              className="absolute top-0 -right-1.5 w-[14px] h-[14px] fill-yellow-400 text-yellow-400 drop-shadow-md rotate-[15deg] opacity-60 group-hover:opacity-100 transition-opacity"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <title>Favorited project</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="p-0 border-0 shadow-xl">
        <ProjectSelectorCard
          project={project}
          isActive={false}
          onSelect={onSelect}
          showDescription={true}
        />
      </HoverCardContent>
    </HoverCard>
  )
}

export default ProjectSelectorChip
export { ProjectSelectorChip, type ProjectSelectorChipProps }
