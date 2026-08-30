/**
 * ProjectResultRow - Result row for project matches — MDT-179
 *
 * Displays a project with code badge and name.
 *
 * @testid project-result-item — individual project result
 */

import type { ScoredProject } from '@/hooks/useProjectSearch'

export interface ProjectResultRowProps {
  scoredProject: ScoredProject
  isSelected: boolean
  onSelect: () => void
}

export function ProjectResultRow({ scoredProject, isSelected, onSelect }: ProjectResultRowProps): React.ReactElement {
  const { project } = scoredProject
  const code = project.project?.code ?? ''
  const name = project.project?.name ?? ''

  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={isSelected}
        data-testid="project-result-item"
        data-selected={isSelected ? 'true' : undefined}
        data-type="project"
        className="search-result"
        onClick={onSelect}
      >
        <div className="search-result__row">
          <span className="search-result__code">
            {code}
          </span>
          <span className="search-result__title">
            {name}
          </span>
        </div>
        <div className="search-result__project-name">
          <span className="search-result__project-label">Project</span>
        </div>
      </button>
    </li>
  )
}
