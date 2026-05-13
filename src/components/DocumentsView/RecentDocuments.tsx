import { ChevronDown, ChevronRight, File } from 'lucide-react'
import { useState } from 'react'

interface RecentDocument {
  path: string
  name: string
  title?: string
}

interface RecentDocumentsProps {
  documents: RecentDocument[]
  onSelectDocument: (path: string) => void
}

function getLabel(path: string): string {
  return path.split('/').pop() ?? path
}

export default function RecentDocuments({ documents, onSelectDocument }: RecentDocumentsProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (documents.length === 0)
    return null

  return (
    <section className="space-y-1 border-b border-border pb-2" aria-label="Recent documents">
      <button
        type="button"
        onClick={() => setIsExpanded(expanded => !expanded)}
        className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-expanded={isExpanded}
        aria-controls="document-recent-list"
        data-testid="document-recent-toggle"
      >
        {isExpanded
          ? <ChevronDown className="h-3 w-3" aria-hidden="true" />
          : <ChevronRight className="h-3 w-3" aria-hidden="true" />}
        <span className="flex-1">Recent</span>
      </button>
      {isExpanded && (
        <div id="document-recent-list" className="space-y-0.5" data-testid="document-recent-list">
          {documents.map(document => (
            <button
              key={document.path}
              type="button"
              onClick={() => onSelectDocument(document.path)}
              className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-foreground transition-colors hover:bg-muted"
              title={document.path}
              data-testid="document-recent-item"
              data-document-path={document.path}
            >
              <File className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">
                  {document.title || document.name || getLabel(document.path)}
                </div>
                {document.title && (
                  <div className="truncate text-xs text-muted-foreground">
                    {document.name || getLabel(document.path)}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
