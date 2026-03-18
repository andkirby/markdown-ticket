# Architecture: MDT-133

**Source**: [MDT-133](../MDT-133-add-request-deduplication-to-datalayer-for-project.md)
**Generated**: 2026-03-17

## Overview

Add request deduplication to the `dataLayer` singleton to prevent duplicate API calls when multiple React hook instances trigger concurrent fetches for the same resource. The solution uses an in-flight request map that shares Promises across concurrent callers.

## Design Pattern

**Pattern**: Pending Request Map (Promise Deduplication)

**Rationale**:
- Minimal change to existing architecture
- No React state management changes required
- Transparent to callers — same API signatures
- Self-cleaning via Promise.finally()

## Module Boundaries

| Module | Ownership | Change Scope |
|--------|-----------|--------------|
| `dataLayer` | Owns all API fetch operations | Add `pendingRequests` Map and `dedupe()` helper |
| `useProjectManager` | No changes | Consumes dataLayer as before |

## Canonical Runtime Flow

```
useProjectManager (multiple instances)
  └─> dataLayer.fetchTickets(projectId)
        └─> dedupe("tickets-{projectId}", fetcher)
              ├─> If pending: return existing Promise
              └─> If not pending:
                    ├─> Create Promise, store in map
                    ├─> Execute fetcher
                    └─> On settle: delete from map
```

## Structure

```
src/services/
└── dataLayer.ts           # Add pendingRequests Map + dedupe() helper
```

```
src/services/
└── dataLayer.dedupe.test.ts  # Unit test for deduplication
```

## Invariants

1. **Single HTTP request per dedupe key** — concurrent callers receive the same Promise
2. **Automatic cleanup** — pending entry removed when Promise settles (success or failure)
3. **No API contract changes** — all public method signatures remain unchanged
4. **Singleton guarantee** — single `pendingRequests` Map shared across all callers

## Extension Rule

To add deduplication to additional methods:
1. Wrap the fetch logic with `this.dedupe(key, fetcher)`
2. Use a unique key format: `{operation}-{identifier}`
3. Existing cleanup behavior applies automatically

## Error Philosophy

- Errors from the underlying fetcher propagate to all callers sharing the Promise
- No retry logic in dedupe layer — handled by caller or underlying fetch
- Failed requests are removed from pending map, allowing retry

---
*Architecture trace projection: [architecture.trace.md](./architecture.trace.md)*
