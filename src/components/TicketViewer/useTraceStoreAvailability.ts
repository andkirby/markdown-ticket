import type { TraceStoreMetadata } from '../../services/dataLayer'
import { useEffect, useState } from 'react'
import { dataLayer } from '../../services/dataLayer'

interface UseTraceStoreAvailabilityOptions {
  projectCode: string
  ticketCode: string
  isEnabled: boolean
}

interface UseTraceStoreAvailabilityResult {
  hasTraceStore: boolean
  loading: boolean
  error: string | null
  metadata: TraceStoreMetadata | null
}

export function useTraceStoreAvailability({
  projectCode,
  ticketCode,
  isEnabled,
}: UseTraceStoreAvailabilityOptions): UseTraceStoreAvailabilityResult {
  const [metadata, setMetadata] = useState<TraceStoreMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEnabled || !projectCode || !ticketCode) {
      setMetadata(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    dataLayer.fetchTraceStoreMetadata(projectCode, ticketCode)
      .then((nextMetadata) => {
        if (cancelled) {
          return
        }

        setMetadata(nextMetadata)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return
        }

        setMetadata(null)
        setError(err instanceof Error ? err.message : 'Failed to load trace store metadata')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [projectCode, ticketCode, isEnabled])

  return {
    hasTraceStore: metadata?.exists === true,
    loading,
    error,
    metadata,
  }
}
