/**
 * useTicketDocumentContent - MDT-093, MDT-094.
 *
 * Lazy content loading for sub-documents.
 * Loads content when the selected path changes.
 * Loading/error states surface in the content area.
 *
 * Covers: BR-3.1, BR-3.2, BR-5.3, C6, C7, C8
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { dataLayer } from '../../services/dataLayer'
import { urlPathToApiPath } from '../../utils/subdocPathValidation'

interface UseTicketDocumentContentOptions {
  projectId: string
  ticketCode: string
  selectedPath: string
  mainContent: string
  pendingPath: string | null
  onContentLoaded?: () => void
}

interface UseTicketDocumentContentResult {
  content: string
  loading: boolean
  error: string | null
  /** Clear cached content for a specific path, or all paths if none specified. */
  invalidateCache: (path?: string) => void
}

export function useTicketDocumentContent(
  options: UseTicketDocumentContentOptions,
): UseTicketDocumentContentResult {
  const { projectId, ticketCode, selectedPath, mainContent, onContentLoaded } = options

  const [content, setContent] = useState<string>(mainContent)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cache subdocument content keyed by path. Reset when ticket changes.
  const cacheRef = useRef<Map<string, string>>(new Map())
  const ticketKeyRef = useRef(`${projectId}:${ticketCode}`)

  // Reset cache when ticket changes
  if (`${projectId}:${ticketCode}` !== ticketKeyRef.current) {
    cacheRef.current.clear()
    ticketKeyRef.current = `${projectId}:${ticketCode}`
  }

  // Stabilize onContentLoaded to avoid re-triggering the effect
  const onContentLoadedRef = useRef(onContentLoaded)
  onContentLoadedRef.current = onContentLoaded

  const invalidateCache = useCallback((path?: string) => {
    if (path) {
      cacheRef.current.delete(path)
    } else {
      cacheRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (selectedPath === 'main') {
      setContent(mainContent)
      setLoading(false)
      setError(null)
      onContentLoadedRef.current?.()
      return
    }

    // Guard: Don't fetch if ticketCode is empty (ticket transitioning)
    if (!ticketCode) {
      return
    }

    // Serve from cache if available
    const cached = cacheRef.current.get(selectedPath)
    if (cached !== undefined) {
      setContent(cached)
      setLoading(false)
      setError(null)
      onContentLoadedRef.current?.()
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    // MDT-094: Convert URL path to API path (remove .md extension)
    const apiPath = urlPathToApiPath(selectedPath)

    dataLayer.fetchSubDocument(projectId, ticketCode, apiPath)
      .then((doc) => {
        if (!cancelled) {
          cacheRef.current.set(selectedPath, doc.content)
          setContent(doc.content)
          setLoading(false)
          // Notify that content is ready for display
          onContentLoadedRef.current?.()
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load document')
          setLoading(false)
          // Still notify to clear pending state on error
          onContentLoadedRef.current?.()
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedPath, projectId, ticketCode, mainContent])

  return { content, loading, error, invalidateCache }
}
