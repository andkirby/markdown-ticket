---
code: MDT-133
status: Implemented
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

- [x] Switching projects makes exactly 1 call to `/api/projects/{id}/crs`
- [x] Switching projects makes exactly 1 call to `/api/projects/{id}/config`
- [x] All existing E2E tests pass
- [x] Unit test added for request deduplication
- [x] Debug logging added during investigation is removed or made conditional

## 6. Implementation Summary

**Completed:** 2026-03-18

### Changes Made

1. **`src/services/dataLayer.ts`**
   - Added `pendingRequests` Map to track in-flight requests
   - Added `dedupe<T>()` helper method that shares Promises across concurrent callers
   - Wrapped `fetchTickets()` and `fetchProjectConfig()` with deduplication

2. **`src/hooks/useProjectManager.ts`**
   - Updated `fetchProjectConfig` to use `dataLayer.fetchProjectConfig()` instead of raw `fetch()`

3. **`src/services/dataLayer.dedupe.test.ts`**
   - Added unit tests for deduplication behavior (10 tests, all passing)

### Verification

**Unit Tests:** 10/10 pass (C1, C2, C3 coverage)

**Browser Verification** (via playwright-cli):

| State | `/crs` calls | `/config` calls |
|-------|--------------|-----------------|
| Before fix | 2x ❌ | 2x ❌ |
| After fix | 1x ✅ | 1x ✅ |

Project switching also verified: switching from MDT → SUML → MDT results in exactly 1 call per endpoint for each project.

## 7. References

> Architecture trace projection: [architecture.trace.md](./MDT-133/architecture.trace.md)
> Architecture notes: [architecture.md](./MDT-133/architecture.md)
> Assessment: [assess.md](./MDT-133/assess.md)
> Test plan: [tests.trace.md](./MDT-133/tests.trace.md)
> Tasks trace: [tasks.trace.md](./MDT-133/tasks.trace.md)
> Tasks: [tasks.md](./MDT-133/tasks.md)