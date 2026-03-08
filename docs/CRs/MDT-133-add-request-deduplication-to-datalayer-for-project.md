---
code: MDT-133
status: Proposed
dateCreated: 2026-03-08T21:24:33.730Z
type: Technical Debt
priority: Medium
---

# Add request deduplication to dataLayer for project switching

## 1. Description

When switching projects in the UI, the system makes duplicate API calls to `/api/projects/{id}/crs` and `/api/projects/{id}/config`. Investigation revealed that multiple `useProjectManager` hook instances (in App.tsx, ProjectSelector, Board.tsx) each maintain independent state and trigger their own data fetches when `selectedProject` changes.

**Current behavior:**
- 2x `/crs` API calls on project switch
- 2x `/config` API calls on project switch

**Root cause:**
- `useProjectManager` hook creates independent state per instance
- Each instance calls `setSelectedProject()` independently
- `dataLayer` singleton has no request deduplication

## 2. Rationale

Duplicate API calls waste network resources and can cause race conditions. The `dataLayer` is already a singleton but lacks concurrent request deduplication. Adding this pattern will:
- Reduce redundant network traffic
- Prevent potential race conditions from parallel responses
- Improve perceived performance on project switching
- Maintain existing behavior (no API changes needed)

## 3. Solution Analysis

**Evaluated approaches:**

| Approach | Pros | Cons |
|----------|------|------|
| Request deduplication in dataLayer | Minimal change, solves immediate problem, no React changes | Doesn't address root architectural issue |
| Context-based state management | Single source of truth, proper React pattern | Larger refactor, more invasive |
| localStorage caching | Survives page refresh | Stale data issues, cache invalidation complexity |

**Selected approach:** Request deduplication in `dataLayer`

This is the minimal fix that solves the immediate problem without requiring architectural changes. A future CR can address the broader state management pattern if needed.

## 4. Implementation Specification

**File:** `src/services/dataLayer.ts`

Add a `pendingRequests` Map to track in-flight requests:

```typescript
class DataLayer {
  private pendingRequests = new Map<string, Promise<unknown>>()

  private async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>
    }

    const promise = fetcher().finally(() => {
      this.pendingRequests.delete(key)
    })
    
    this.pendingRequests.set(key, promise)
    return promise
  }

  async fetchTickets(projectId: string): Promise<Ticket[]> {
    return this.dedupe(`tickets-${projectId}`, async () => {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/crs`)
      // ... existing logic
    })
  }

  async fetchProjectConfig(projectId: string): Promise<ProjectConfig | null> {
    return this.dedupe(`config-${projectId}`, async () => {
      // ... existing logic
    })
  }
}
```

**Testing:**
- Verify only 1 API call per endpoint when switching projects
- Verify existing E2E tests still pass
- Add unit test for deduplication behavior

## 5. Acceptance Criteria

- [ ] Switching projects makes exactly 1 call to `/api/projects/{id}/crs`
- [ ] Switching projects makes exactly 1 call to `/api/projects/{id}/config`
- [ ] All existing E2E tests pass
- [ ] Unit test added for request deduplication
- [ ] Debug logging added during investigation is removed or made conditional