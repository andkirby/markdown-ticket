import type { SubDocument } from '@mdt/shared/models/SubDocument'
import { filePathToApiPath } from '../../utils/subdocPathValidation'

export const ROOT_DOCUMENT_PATH = 'main'

export interface TicketDocumentTabRow {
  entries: SubDocument[]
  activeValue: string
}

/**
 * Split a path into segments, respecting physical (/) vs virtual (.) notation.
 * Physical paths like 'bdd/another.trace' → ['bdd', 'another.trace'] (dot preserved)
 * Virtual paths like 'bdd.trace' → ['bdd', 'trace'] (dot is separator)
 */
export function splitPathSegments(path: string): string[] {
  if (path === ROOT_DOCUMENT_PATH) {
    return [ROOT_DOCUMENT_PATH]
  }

  if (path.includes('/')) {
    return path.split('/')
  }

  return path.split('.')
}

/**
 * Derive folder stack from a selected path and subdocument tree.
 * Files: parent folder segments. e.g. 'poc/spike' → ['poc']
 * Folders: all segments including the folder itself. e.g. 'poc' → ['poc']
 * Handles both slash-separated (physical folders) and dot-notation (virtual folders) paths.
 */
export function deriveFolderStack(path: string, subdocuments: SubDocument[]): string[] {
  const segments = splitPathSegments(path)

  const isFolderPath = (docs: SubDocument[], remainingSegments: string[]): boolean => {
    if (remainingSegments.length === 0) {
      return false
    }

    const [currentSegment, ...nextSegments] = remainingSegments
    const matchingDocument = docs.find(document => document.name === currentSegment)

    if (!matchingDocument) {
      return false
    }

    if (nextSegments.length === 0) {
      return matchingDocument.kind === 'folder'
    }

    return isFolderPath(matchingDocument.children, nextSegments)
  }

  return isFolderPath(subdocuments, segments)
    ? segments
    : segments.slice(0, -1)
}

function getPathLastSegment(path: string): string {
  if (path.includes('/')) {
    return path.split('/').pop() ?? path
  }

  if (path.includes('.')) {
    return path.split('.').pop() ?? path
  }

  return path
}

function getActiveChildValue(
  entries: SubDocument[],
  pathSegment: string,
  ticketCode: string,
): string {
  const matchingEntry = entries.find((entry) => {
    if (!entry.filePath) {
      return false
    }

    const apiPath = filePathToApiPath(entry.filePath, ticketCode)
    return getPathLastSegment(apiPath) === pathSegment
  })

  return matchingEntry?.name ?? entries[0]?.name ?? ''
}

export function buildTicketDocumentTabRows(
  subdocuments: SubDocument[],
  selectedPath: string,
  folderStack: string[],
  ticketCode: string,
): TicketDocumentTabRow[] {
  const pathSegments = splitPathSegments(selectedPath)
  const topLevelEntries: SubDocument[] = [
    { name: ROOT_DOCUMENT_PATH, kind: 'file', children: [] },
    ...subdocuments,
  ]

  const rows: TicketDocumentTabRow[] = [
    {
      entries: topLevelEntries,
      activeValue: pathSegments[0] ?? ROOT_DOCUMENT_PATH,
    },
  ]

  let currentDocuments = subdocuments

  for (const [index, folderName] of folderStack.entries()) {
    const folder = currentDocuments.find(
      document => document.name === folderName && document.kind === 'folder',
    )

    if (!folder || folder.children.length === 0) {
      break
    }

    rows.push({
      entries: folder.children,
      activeValue: getActiveChildValue(
        folder.children,
        pathSegments[index + 1] ?? '',
        ticketCode,
      ),
    })

    currentDocuments = folder.children
  }

  return rows
}

export function resolveTicketDocumentSelectionPath(
  entry: SubDocument | undefined,
  ticketCode: string,
): string | null {
  if (!entry) {
    return null
  }

  if (entry.name === ROOT_DOCUMENT_PATH && !entry.filePath) {
    return ROOT_DOCUMENT_PATH
  }

  if (entry.kind === 'folder') {
    const firstChild = entry.children[0]
    return firstChild?.filePath
      ? filePathToApiPath(firstChild.filePath, ticketCode)
      : null
  }

  return entry.filePath
    ? filePathToApiPath(entry.filePath, ticketCode)
    : null
}
