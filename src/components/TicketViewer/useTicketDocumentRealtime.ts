/**
 * useTicketDocumentRealtime - MDT-093.
 *
 * Manages SSE-driven reconciliation of the sub-document structure.
 * Exposes the current subdocuments list and a handler for SSE updates.
 *
 * Covers: BR-5.1, BR-5.2, BR-5.4, C5
 */

import { useCallback, useEffect, useState } from 'react'
import type { SubDocument } from '@mdt/shared/models/SubDocument.js'

interface UseTicketDocumentRealtimeOptions {
  initialSubdocuments: SubDocument[]
  selectedPath: string
  onActiveRemoved: () => void
}

interface UseTicketDocumentRealtimeResult {
  subdocuments: SubDocument[]
  handleSSEUpdate: (updated: SubDocument[]) => void
}

/**
 * Check if a given path still exists in the updated subdocument tree.
 */
function pathExistsInTree(path: string, docs: SubDocument[]): boolean {
  if (path === 'main') return true

  const segments = path.split('/')
  let current = docs
  for (const segment of segments) {
    const match = current.find(d => d.name === segment)
    if (!match) return false
    current = match.children
  }
  return true
}

export function useTicketDocumentRealtime(
  options: UseTicketDocumentRealtimeOptions,
): UseTicketDocumentRealtimeResult {
  const { initialSubdocuments, selectedPath, onActiveRemoved } = options

  const [subdocuments, setSubdocuments] = useState<SubDocument[]>(initialSubdocuments)

  // Sync state when initialSubdocuments changes (e.g. after async ticket fetch or SSE)
  // Also reconcile: if the active path was removed, fall back to main (BR-5.2)
  useEffect(() => {
    setSubdocuments(initialSubdocuments)
    if (!pathExistsInTree(selectedPath, initialSubdocuments)) {
      onActiveRemoved()
    }
  }, [initialSubdocuments])


  const handleSSEUpdate = useCallback(
    (updated: SubDocument[]) => {
      setSubdocuments(updated)

      // Check if the currently selected document still exists (BR-5.2)
      if (!pathExistsInTree(selectedPath, updated)) {
        onActiveRemoved()
      }
    },
    [selectedPath, onActiveRemoved],
  )

  return { subdocuments, handleSSEUpdate }
}
