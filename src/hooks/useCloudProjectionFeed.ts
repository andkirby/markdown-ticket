import type { FeedProjection, ProjectionFeed } from './useCloudProjections'
import { useEffect, useState } from 'react'
import { authFetch } from '../auth/authFetch'

interface ProjectionPollResponse extends ProjectionFeed {
  enabled: boolean
  pollIntervalSeconds: number
  nextCursor: number | null
  hasMore: boolean
}

export interface UseCloudProjectionFeedOptions {
  projectId?: string
  enabled: boolean
  injectedFeed?: ProjectionFeed | null
}

const MIN_POLL_SECONDS = 5
const MAX_RETRY_SECONDS = 60

/**
 * Poll the local server for header-only cloud projections. The server owns
 * Cloudflare credentials; this hook only sees the approved projection fields.
 */
export function useCloudProjectionFeed({
  projectId,
  enabled,
  injectedFeed,
}: UseCloudProjectionFeedOptions): ProjectionFeed | null {
  const [feed, setFeed] = useState<ProjectionFeed | null>(injectedFeed ?? null)

  useEffect(() => {
    if (injectedFeed !== undefined) {
      setFeed(injectedFeed)
      return
    }
    if (!enabled || !projectId) {
      setFeed(null)
      return
    }

    setFeed(null)
    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    let cursor = 0
    let retrySeconds = MIN_POLL_SECONDS
    const projections = new Map<string, FeedProjection>()

    const publish = (stale: boolean) => {
      if (!cancelled) {
        setFeed({ items: Array.from(projections.values()), stale })
      }
    }

    const schedule = (seconds: number, task: () => Promise<void>) => {
      if (!cancelled) {
        timeout = setTimeout(() => void task(), seconds * 1000)
      }
    }

    const poll = async (): Promise<void> => {
      controller = new AbortController()
      try {
        const response = await authFetch(
          `/api/projects/${encodeURIComponent(projectId)}/cloud-projections?after=${cursor}&limit=100`,
          { signal: controller.signal },
        )
        if (!response.ok) {
          throw new Error(`Projection poll failed with HTTP ${response.status}`)
        }
        const result = await response.json() as ProjectionPollResponse
        if (!result.enabled) {
          publish(false)
          return
        }

        for (const item of result.items) {
          if (item.lifecycle === 'deleted') {
            projections.delete(item.code)
          }
          else {
            projections.set(item.code, item)
          }
        }
        cursor = result.nextCursor ?? cursor
        retrySeconds = MIN_POLL_SECONDS
        publish(result.stale === true)

        if (result.hasMore) {
          void poll()
          return
        }
        schedule(Math.max(MIN_POLL_SECONDS, result.pollIntervalSeconds), poll)
      }
      catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError'))
          return
        publish(true)
        schedule(retrySeconds, poll)
        retrySeconds = Math.min(MAX_RETRY_SECONDS, retrySeconds * 2)
      }
    }

    void poll()
    return () => {
      cancelled = true
      controller?.abort()
      if (timeout)
        clearTimeout(timeout)
    }
  }, [enabled, injectedFeed, projectId])

  return injectedFeed !== undefined ? injectedFeed : feed
}
