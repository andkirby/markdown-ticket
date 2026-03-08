/**
 * ProjectSelectorChip Component (MDT-129)
 *
 * Displays an inactive project in the selector rail.
 * Shows project code in compact chip or medium card format based on compactInactive preference.
 *
 * Behavior Requirements:
 * - BR-2.1: When compactInactive is true, render as compact code-only chip
 * - BR-2.2: When compactInactive is false, render as medium card presentation
 * - BR-2.3: No title or description expansion in the rail
 */

import type { ProjectWithSelectorState } from './types'
import * as React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../UI/tooltip'

interface ProjectSelectorChipProps {
  /** Project with selector state to display */
  project: ProjectWithSelectorState
  /** Whether to render in compact mode (true = small chip, false = medium card) */
  compact: boolean
  /** Callback when project is selected */
  onSelect: (projectKey: string) => void
}

/**
 * ProjectSelectorChip component
 *
 * Displays an inactive project as a clickable chip or card:
 * - Compact mode: small badge/pill style with minimal height
 * - Medium mode: similar to ProjectSelectorCard but smaller
 *
 * @testid project-selector-chip — Chip/card container
 * @testid project-selector-chip-{code} — Chip for specific project (e.g., project-selector-chip-MDT)
 */
const ProjectSelectorChip: React.FC<ProjectSelectorChipProps> = ({
  project,
  compact,
  onSelect,
}) => {
  const handleClick = () => {
    onSelect(project.project.code || project.id)
  }

  // Compact mode: small badge/pill style
  if (compact) {
    const chipClasses = `
      inline-flex items-center justify-center
      bg-gradient-to-br from-gray-100 to-gray-200/80
      dark:from-slate-700 dark:to-slate-800/80
      border border-gray-300/50 dark:border-slate-600/50
      rounded-md px-2 py-1.5 h-12 border-2 border-transparent
      hover:bg-accent hover:text-accent-foreground
      hover:border-blue-300 dark:hover:border-blue-700
      hover:-translate-y-0.5 hover:scale-[1.02]
      transition-all duration-200 ease-out
      cursor-pointer
      shadow-sm hover:shadow-md
    `

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={chipClasses}
            onClick={handleClick}
            data-testid={`project-selector-chip-${project.project.code || project.id}`}
            data-project-key={project.project.code || project.id}
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {project.project.code || project.id}
            </span>
          </div>
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

  // Medium mode: similar to ProjectSelectorCard but smaller
  const cardClasses = `
    group relative
    bg-gradient-to-br from-white to-gray-50/80
    dark:from-slate-800 dark:to-slate-900/80
    border border-gray-200/50 dark:border-slate-700/50
    rounded-lg px-3 py-1.5 h-12
    hover:from-blue-50 hover:to-indigo-50
    dark:hover:from-blue-950 dark:hover:to-indigo-950
    hover:border-blue-200 dark:hover:border-blue-800
    hover:-translate-y-0.5 hover:scale-[1.02]
    transition-all duration-200 ease-out
    cursor-pointer
    shadow-sm hover:shadow-md
  `

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cardClasses}
          onClick={handleClick}
          data-testid={`project-selector-chip project-selector-chip-${project.project.code || project.id}`}
          data-project-key={project.project.code || project.id}
        >
          <div className="flex items-center gap-2 h-full">
            {/* Project code */}
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {project.project.code || project.id}
            </div>

            {/* Favorite indicator (smaller than active card) */}
            {project.favorite && (
              <svg
                className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0"
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
        </div>
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

export default ProjectSelectorChip
export { ProjectSelectorChip, type ProjectSelectorChipProps }
