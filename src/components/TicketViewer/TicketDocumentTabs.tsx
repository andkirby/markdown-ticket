/**
 * TicketDocumentTabs - MDT-093.
 *
 * Renders one shadcn Tabs row per active folder level.
 * Hidden when no sub-documents exist (BR-1.5).
 * Folders reveal children in the next row (BR-2.1–BR-2.5).
 * Navigation remains sticky during scroll (BR-3.3, BR-3.4, C9).
 *
 * Sole consumer of useTicketDocumentNavigation (OBL-navigation-transition-authority).
 */

import * as Tabs from '@radix-ui/react-tabs'
import type { SubDocument } from '@mdt/shared/models/SubDocument.js'

interface TicketDocumentTabsProps {
  subdocuments: SubDocument[]
  selectedPath: string
  folderStack: string[]
  onSelect: (path: string) => void
  pendingPath: string | null
}

/**
 * Build tab rows from current folderStack and subdocuments tree.
 * Returns array of { entries, activeValue } for each row.
 */
function buildTabRows(
  subdocuments: SubDocument[],
  selectedPath: string,
  folderStack: string[],
): Array<{ entries: SubDocument[], activeValue: string }> {
  const rows: Array<{ entries: SubDocument[], activeValue: string }> = []

  // Top-level row: includes 'main' + all top-level subdocuments
  const topLevel: SubDocument[] = [
    { name: 'main', kind: 'file', children: [] },
    ...subdocuments,
  ]

  // Determine which top-level entry is "active" (first segment of path, or 'main')
  const pathSegments = selectedPath === 'main' ? ['main'] : selectedPath.split('/')
  const topActive = pathSegments[0]

  rows.push({ entries: topLevel, activeValue: topActive })

  // For each folder in the stack, add a row for its children
  let currentDocs = subdocuments
  for (let i = 0; i < folderStack.length; i++) {
    const folderName = folderStack[i]
    const folder = currentDocs.find(d => d.name === folderName && d.kind === 'folder')
    if (!folder || folder.children.length === 0) break

    const activeInRow = pathSegments[i + 1] ?? folder.children[0]?.name ?? ''
    rows.push({ entries: folder.children, activeValue: activeInRow })
    currentDocs = folder.children
  }

  return rows
}

export function TicketDocumentTabs({
  subdocuments,
  selectedPath,
  folderStack,
  onSelect,
  pendingPath,
}: TicketDocumentTabsProps) {
  // Hidden when no sub-documents exist (BR-1.5)
  if (subdocuments.length === 0) {
    return null
  }

  const rows = buildTabRows(subdocuments, selectedPath, folderStack)

  return (
    /* @testid subdoc-tabs — container for tab rows; only rendered when subdocuments exist */
    <div
      data-testid="subdoc-tabs"
      className="ticket-document-tabs sticky top-0 z-10 bg-background border-b"
    >
      {rows.map((row, rowIdx) => (
        <Tabs.Root
          key={rowIdx}
          value={row.activeValue}
          onValueChange={(value) => {
            // Determine full path based on folder nesting
            const prefix = folderStack.slice(0, rowIdx).join('/')
            const fullPath = prefix ? `${prefix}/${value}` : value
            // For folders, auto-navigate to first child so content loads
            const entry = row.entries.find(e => e.name === value)
            if (entry?.kind === 'folder' && entry.children.length > 0) {
              onSelect(`${fullPath}/${entry.children[0].name}`)
            }
            else {
              onSelect(fullPath)
            }
          }}
        >
          {/* @testid subdoc-tab-row — a single tab row (primary or nested) */}
          <Tabs.List data-testid="subdoc-tab-row" className="flex overflow-x-auto scrollbar-hide border-b px-2">
            {row.entries.map(entry => {
              // Determine full path for this entry
              const prefix = folderStack.slice(0, rowIdx).join('/')
              const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name
              const isPending = pendingPath === fullPath

              return (
                /* @testid subdoc-tab-{name} — individual tab trigger */
                <Tabs.Trigger
                  key={entry.name}
                  value={entry.name}
                  data-testid={`subdoc-tab-${entry.name}`}
                  className="px-3 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:border-b-2 data-[state=active]:border-primary relative"
                  disabled={isPending}
                >
                  {entry.name === 'main' ? 'Main' : entry.name}
                  {entry.kind === 'folder' ? ' ▶' : ''}
                  {isPending && (
                    <span className="ml-1 text-xs animate-pulse">…</span>
                  )}
                </Tabs.Trigger>
              )
            })}
          </Tabs.List>
        </Tabs.Root>
      ))}
    </div>
  )
}
