/**
 * useTicketDocumentContent - MDT-093, MDT-094.
 *
 * Lazy content loading for sub-documents.
 * Loads content when the selected path changes.
 * Loading/error states surface in the content area.
 *
 * Covers: BR-3.1, BR-3.2, BR-5.3, C6, C7, C8
 */

import { useEffect, useState } from 'react'
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
}

export function useTicketDocumentContent(
  options: UseTicketDocumentContentOptions,
): UseTicketDocumentContentResult {
  const { projectId, ticketCode, selectedPath, mainContent, pendingPath, onContentLoaded } = options

  const [content, setContent] = useState<string>(mainContent)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedPath === 'main') {
      setContent(mainContent)
      setLoading(false)
      setError(null)
      onContentLoaded?.()
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
          setContent(doc.content)
          setLoading(false)
          // Notify that content is ready for display
          onContentLoaded?.()
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load document')
          setLoading(false)
          // Still notify to clear pending state on error
          onContentLoaded?.()
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedPath, projectId, ticketCode, mainContent, onContentLoaded])

  return { content, loading, error }
}
