import type { ProjectionFeed } from './useCloudProjections'
import { useEffect, useState } from 'react'

export interface UseCloudProjectionFeedOptions {
  projectId?: string
  enabled: boolean
  injectedFeed?: ProjectionFeed | null
}

/**
 * MDT-226: production browser polling is disabled. The browser consumes the
 * unified ticket API, which merges projections server-side. This hook now serves
 * only the test-injection seam (`injectedFeed`); production callers receive
 * `null`. The legacy poll loop caused per-ticket D1 read amplification and is
 * removed from the active path.
 */
export function useCloudProjectionFeed({
  projectId: _projectId,
  enabled: _enabled,
  injectedFeed,
}: UseCloudProjectionFeedOptions): ProjectionFeed | null {
  const [feed, setFeed] = useState<ProjectionFeed | null>(injectedFeed ?? null)

  useEffect(() => {
    if (injectedFeed !== undefined) {
      // Test-injection seam: deterministic feeds for E2E/render tests only.
      setFeed(injectedFeed)
      return
    }
    // MDT-226: production browser polling is disabled. The browser consumes the
    // unified ticket API, which merges projections server-side. Cloud traffic is
    // backend-owned (one stream per project). The legacy poll loop caused
    // per-ticket D1 read amplification and is removed from the active path.
    setFeed(null)
  }, [injectedFeed])

  return injectedFeed !== undefined ? injectedFeed : feed
}
