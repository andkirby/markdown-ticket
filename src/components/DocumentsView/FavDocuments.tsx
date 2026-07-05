import type { DocumentFile } from './FileTree'
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
// eslint-disable-next-line no-restricted-imports
import { Icon } from '../shared/Icon'
import { ScrollArea } from '../ui/scroll-area'
import CopyPathButton from './CopyPathButton'

interface FavDocumentsProps {
  documents: DocumentFile[]
  isExpanded: boolean
  showAll: boolean
  onSelectDocument: (document: DocumentFile) => void
  onToggleFavorite?: (document: DocumentFile) => void
  onExpandedChange: (expanded: boolean) => void
  onShowAllChange: (showAll: boolean) => void
}

function getLabel(document: DocumentFile): string {
  return document.type === 'file' && document.title
    ? document.title
    : document.name || document.path.split('/').pop() || document.path
}

export default function FavDocuments({
  documents,
  isExpanded,
  showAll,
  onSelectDocument,
  onToggleFavorite,
  onExpandedChange,
  onShowAllChange,
}: FavDocumentsProps) {
  const hasOverflow = documents.length > 5
  const visibleDocuments = useMemo(() => showAll ? documents : documents.slice(0, 5), [documents, showAll])

  if (documents.length === 0) {
    return null
  }

  return (
    <section
      className="flex min-h-0 flex-col gap-1 border-b border-border px-2 pt-2 pb-0"
      style={{ maxHeight: 'var(--documents-favs-max-height, 33%)' }}
      aria-label="Favs"
      data-testid="document-favs"
    >
      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onExpandedChange(!isExpanded)}
          className="flex min-w-0 flex-1 items-center gap-1 rounded px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-expanded={isExpanded}
          aria-controls="document-favs-list"
          data-testid="document-favs-toggle"
        >
          {isExpanded
            ? <ChevronDown className="h-3 w-3" aria-hidden="true" />
            : <ChevronRight className="h-3 w-3" aria-hidden="true" />}
          <span className="flex-1">Favs</span>
        </button>
        {hasOverflow && isExpanded && (
          <button
            type="button"
            className="rounded px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => onShowAllChange(!showAll)}
            data-testid="document-favs-show-all"
          >
            {showAll ? 'Show less' : 'Show all'}
          </button>
        )}
      </div>
      {isExpanded && (
        <ScrollArea className="min-h-0 flex-1" id="document-favs-list" data-testid="document-favs-list">
          <div className="space-y-0.5">
            {visibleDocuments.map(document => (
              <div
                key={document.path}
                onClick={() => onSelectDocument(document)}
                className="group flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-foreground transition-colors hover:bg-muted"
                title={document.path}
                data-testid="document-fav-item"
                data-document-path={document.path}
              >
                <button
                  type="button"
                  onClick={() => onSelectDocument(document)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {document.type === 'folder'
                    ? <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                    : <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">
                      {getLabel(document)}
                    </div>
                    {document.type === 'file' && document.title && (
                      <div className="truncate text-xs text-muted-foreground">
                        {document.name}
                      </div>
                    )}
                  </div>
                </button>
                <CopyPathButton path={document.path} />
                {onToggleFavorite && (
                  <button
                    type="button"
                    className="fav-star-btn fav-star-btn--document"
                    data-active={document.favorite ? '' : undefined}
                    title={document.favorite ? 'Click to unfavorite' : 'Click to favorite'}
                    aria-label="Toggle favorite"
                    data-testid="document-fav-star"
                    data-document-path={document.path}
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggleFavorite(document)
                    }}
                  >
                    <Icon name="fav-star" className={cn('fav-star fav-star--document', document.favorite && 'active')} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  )
}
