/**
 * DocumentResultRow - Result row for document matches — MDT-179
 *
 * Displays a document with path and name, with project badge.
 *
 * @testid document-result-item — individual document result
 */

export interface DocumentResultItem {
  path: string
  name: string
  project: {
    code: string
    name: string
  }
}

export interface DocumentResultRowProps {
  document: DocumentResultItem
  isSelected: boolean
  onSelect: () => void
}

export function DocumentResultRow({ document, isSelected, onSelect }: DocumentResultRowProps): React.ReactElement {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={isSelected}
        data-testid="document-result-item"
        data-selected={isSelected ? 'true' : undefined}
        data-type="document"
        className="search-result"
        onClick={onSelect}
      >
        <div className="flex items-center gap-3">
          <span className="search-result__code">
            {document.name}
          </span>
          <span className="search-result__title truncate">
            {document.path}
          </span>
        </div>
        <div className="mt-1 text-xs search-result__project-name">
          <span className="search-result__project-label">
            {document.project.code}
          </span>
          <span className="ml-1.5">{document.project.name}</span>
        </div>
      </button>
    </li>
  )
}
