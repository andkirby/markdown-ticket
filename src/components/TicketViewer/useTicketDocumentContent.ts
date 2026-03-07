/**
 * useTicketDocumentContent - MDT-093.
 *
 * Lazy content loading for sub-documents.
 * Loads content when the selected path changes.
 * Loading/error states surface in the content area.
 *
 * Covers: BR-3.1, BR-3.2, BR-5.3, C6, C7, C8
 */

import { useEffect, useState } from 'react'
import { dataLayer } from '../../services/dataLayer'

interface UseTicketDocumentContentOptions {
  projectId: string
  ticketCode: string
  selectedPath: string
  mainContent: string
}

interface UseTicketDocumentContentResult {
  content: string
  loading: boolean
  error: string | null
}

export function useTicketDocumentContent(
  options: UseTicketDocumentContentOptions,
): UseTicketDocumentContentResult {
  const { projectId, ticketCode, selectedPath, mainContent } = options

  const [content, setContent] = useState<string>(mainContent)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedPath === 'main') {
      setContent(mainContent)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    dataLayer.fetchSubDocument(projectId, ticketCode, selectedPath)
      .then((doc) => {
        if (!cancelled) {
          setContent(doc.content)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load document')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedPath, projectId, ticketCode, mainContent])

  return { content, loading, error }
}
