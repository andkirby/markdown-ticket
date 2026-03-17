/**
 * useTicketDocumentRealtime - MDT-093.
 *
 * Manages SSE-driven reconciliation of the sub-document structure.
 * Exposes the current subdocuments list and a handler for SSE updates.
 *
 * Covers: BR-5.1, BR-5.2, BR-5.4, C5
 */

import { useCallback, useEffect, useRef, useState } from 'react'
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
 * Split a path into segments, respecting physical (/) vs virtual (.) notation.
 * Physical paths like 'bdd/another.trace' → ['bdd', 'another.trace'] (dot preserved)
 * Virtual paths like 'bdd.trace' → ['bdd', 'trace'] (dot is separator)
 */
function splitPathSegments(path: string): string[] {
  if (path === "main") {
    return ["main"];
  }

  // Check if this is a physical path (contains /)
  if (path.includes("/")) {
    // Physical path: split only by /, preserve dots in filenames
    return path.split("/");
  }

  // Virtual path: split by .
  return path.split(".");
}

/**
 * Check if a given path still exists in the updated subdocument tree.
 * MDT-138: Handles both slash-separated (physical folders) and dot-notation (virtual folders) paths.
 */
function pathExistsInTree(path: string, docs: SubDocument[]): boolean {
  if (path === 'main') return true

  // MDT-138: Use smart splitting that respects physical (/) vs virtual (.) notation
  const segments = splitPathSegments(path)
  let current = docs
  for (const segment of segments) {
    // For physical children in folders, the name has a '/' prefix
    // Try to match both with and without the prefix
    const match = current.find(d => d.name === segment || d.name === `/${segment}`)
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
  const onActiveRemovedRef = useRef(onActiveRemoved)
  onActiveRemovedRef.current = onActiveRemoved

  // Sync state when initialSubdocuments changes (e.g. after async ticket fetch or SSE)
  // Also reconcile: if the active path was removed, fall back to main (BR-5.2)
  // Note: We only call onActiveRemoved if subdocuments are non-empty, to avoid
  // triggering during initial load when the path hasn't been initialized from URL yet.
  // MDT-138: selectedPath NOT in deps to prevent race condition during navigation.
  // Path validity should only be checked when the tree structure changes, not on user clicks.
  // Use ref for selectedPath to access current value without triggering effect.
  const selectedPathRef = useRef(selectedPath)
  selectedPathRef.current = selectedPath

  useEffect(() => {
    setSubdocuments(initialSubdocuments)
    if (initialSubdocuments.length > 0 && selectedPathRef.current !== 'main' && !pathExistsInTree(selectedPathRef.current, initialSubdocuments)) {
      onActiveRemovedRef.current()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSubdocuments])


  const handleSSEUpdate = useCallback(
    (updated: SubDocument[]) => {
      setSubdocuments(updated)

      // Check if the currently selected document still exists (BR-5.2)
      if (!pathExistsInTree(selectedPathRef.current, updated)) {
        onActiveRemovedRef.current()
      }
    },
    [],
  )

  return { subdocuments, handleSSEUpdate }
}
