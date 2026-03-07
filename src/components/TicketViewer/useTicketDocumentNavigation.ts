/**
 * useTicketDocumentNavigation - MDT-093.
 *
 * Sole frontend authority for selected path and folder-stack transitions.
 * Manages URL hash synchronization for deep linking.
 *
 * Covers: BR-4.1, BR-4.2, BR-4.3, BR-4.4, C4
 */

import { useCallback, useEffect, useState } from 'react'
import type { SubDocument } from '@mdt/shared/models/SubDocument.js'

interface UseTicketDocumentNavigationOptions {
  subdocuments: SubDocument[]
}

interface UseTicketDocumentNavigationResult {
  selectedPath: string
  folderStack: string[]
  selectPath: (path: string) => void
}

/**
 * Find all valid file/folder paths in the subdocument tree.
 */
function collectPaths(docs: SubDocument[], prefix = ''): Set<string> {
  const paths = new Set<string>()
  for (const doc of docs) {
    const fullPath = prefix ? `${prefix}/${doc.name}` : doc.name
    paths.add(fullPath)
    if (doc.kind === 'folder' && doc.children.length > 0) {
      for (const child of collectPaths(doc.children, fullPath)) {
        paths.add(child)
      }
    }
  }
  return paths
}

/**
 * Derive folder stack from a selected path and subdocument tree.
 * Files: parent folder segments. e.g. 'poc/spike' → ['poc']
 * Folders: all segments including the folder itself. e.g. 'poc' → ['poc']
 */
function deriveFolderStack(path: string, subdocuments: SubDocument[]): string[] {
  const segments = path.split('/')

  const isFolder = (docs: SubDocument[], segs: string[]): boolean => {
    if (segs.length === 0) return false
    const [head, ...rest] = segs
    const match = docs.find(d => d.name === head)
    if (!match) return false
    if (rest.length === 0) return match.kind === 'folder'
    return isFolder(match.children, rest)
  }

  if (isFolder(subdocuments, segments)) {
    return segments
  }
  return segments.slice(0, -1)
}

/**
 * Initialize selected path from URL hash, falling back to 'main' if invalid.
 */
function initFromHash(subdocuments: SubDocument[]): { selectedPath: string, folderStack: string[] } {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) {
    return { selectedPath: 'main', folderStack: [] }
  }

  const validPaths = collectPaths(subdocuments)
  if (validPaths.has(hash)) {
    return { selectedPath: hash, folderStack: deriveFolderStack(hash, subdocuments) }
  }

  return { selectedPath: 'main', folderStack: [] }
}

export function useTicketDocumentNavigation(
  options: UseTicketDocumentNavigationOptions,
): UseTicketDocumentNavigationResult {
  const { subdocuments } = options

  const [state, setState] = useState(() => initFromHash(subdocuments))

  // Re-check hash when subdocuments become available after async fetch
  useEffect(() => {
    if (state.selectedPath === 'main') {
      const fromHash = initFromHash(subdocuments)
      if (fromHash.selectedPath !== 'main') {
        setState(fromHash)
      }
    }
  }, [subdocuments])

  const selectPath = useCallback((path: string) => {
    setState((prev) => {
      const folderStack = deriveFolderStack(path, subdocuments)

      // Update URL hash
      if (path === 'main') {
        window.location.hash = ''
      }
      else {
        window.location.hash = path
      }

      return { ...prev, selectedPath: path, folderStack }
    })
  }, [subdocuments])

  return {
    selectedPath: state.selectedPath,
    folderStack: state.folderStack,
    selectPath,
  }
}
