/**
 * TicketDocumentTabs - MDT-093.
 *
 * Renders one radix Tabs row per active folder level.
 * Hidden when no sub-documents exist (BR-1.5).
 * Folders reveal children in the next row (BR-2.1–BR-2.5).
 * Navigation remains sticky during scroll (BR-3.3, BR-3.4, C9).
 *
 * Sole consumer of useTicketDocumentNavigation (OBL-navigation-transition-authority).
 */

import type { SubDocument } from '@mdt/shared/models/SubDocument'
import type { TicketDocumentTabRow } from './subdocumentPath'
import * as Tabs from '@radix-ui/react-tabs'
import {
  buildTicketDocumentTabRows,
  resolveTicketDocumentSelectionPath,
  ROOT_DOCUMENT_PATH,
} from './subdocumentPath'

interface TicketDocumentTabsProps {
  subdocuments: SubDocument[]
  selectedPath: string
  folderStack: string[]
  onSelect: (path: string) => void
  ticketCode: string
}

function handleRowValueChange(
  value: string,
  row: TicketDocumentTabRow,
  ticketCode: string,
  onSelect: (path: string) => void,
): void {
  if (value === row.activeValue) {
    return
  }

  const nextPath = resolveTicketDocumentSelectionPath(
    row.entries.find(entry => entry.name === value),
    ticketCode,
  )

  if (nextPath) {
    onSelect(nextPath)
  }
}

export function TicketDocumentTabs({
  subdocuments,
  selectedPath,
  folderStack,
  onSelect,
  ticketCode,
}: TicketDocumentTabsProps) {
  if (subdocuments.length === 0) {
    return null
  }

  const rows = buildTicketDocumentTabRows(
    subdocuments,
    selectedPath,
    folderStack,
    ticketCode,
  )

  return (
    <div
      data-testid="subdoc-tabs"
      className="ticket-document-tabs sticky top-0 z-10 bg-background/50 backdrop-blur-sm"
    >
      {rows.map(row => (
        <Tabs.Root
          key={row.entries[0]?.filePath ?? row.entries[0]?.name ?? row.activeValue}
          value={row.activeValue}
          onValueChange={(value) => {
            handleRowValueChange(value, row, ticketCode, onSelect)
          }}
        >
          <Tabs.List
            data-testid="subdoc-tab-row"
            className="modal__section flex overflow-x-auto scrollbar-hide"
          >
            {row.entries.map(entry => (
              <Tabs.Trigger
                key={entry.name}
                value={entry.name}
                data-testid={`subdoc-tab-${entry.name}`}
                data-filepath={entry.filePath || undefined}
                className="relative mr-3 whitespace-nowrap px-2 py-1.5 text-sm font-medium text-gray-700 transition-[color,transform,opacity] last:mr-0 hover:-translate-y-0.5 hover:scale-[1.01] hover:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-gray-900 data-[state=active]:hover:translate-y-0 data-[state=active]:hover:scale-100 dark:text-gray-200 dark:hover:text-white dark:data-[state=active]:text-white"
              >
                {entry.name === ROOT_DOCUMENT_PATH ? 'Main' : entry.name}
                {entry.kind === 'folder' ? ' ▶' : ''}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      ))}
    </div>
  )
}
