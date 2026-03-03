---
code: MDT-094
status: Implemented
dateCreated: 2025-12-11T16:09:47.654Z
type: Technical Debt
priority: Medium
---

# Optimize CR listing API to remove content payload

## 1. Description

### Problem
The `/api/projects/{projectId}/crs` endpoint returns full Ticket objects including the `content` field with entire markdown body. When listing 100 tickets, this transfers ~300KB of unnecessary data because:
- Frontend list views only need metadata (title, status, dates) for display
- Full markdown content is only needed when viewing/editing a specific ticket
- Current approach wastes bandwidth and increases latency

### Affected Areas
- Backend: CR listing endpoint
- Frontend: Ticket list views
- Shared: Ticket data models

### Scope
- **In Scope**: Modify listing endpoint response to return metadata-only
- **Out of Scope**: Individual ticket endpoint (`/api/projects/{projectId}/crs/{crId}`) remains unchanged

## 2. Rationale

### Why This Change
- **Performance**: Reduce list endpoint payload by >90% (from ~300KB to ~20KB for 100 tickets)
- **User Experience**: Faster page loads for ticket list views
- **Clean Architecture**: Clear separation between list operations (metadata) and detail operations (full content)

### Decision
The list endpoint will return only metadata fields. The detail endpoint remains unchanged and continues to return full tickets with content.

> **Implementation details**: See [architecture.md](./architecture.md) for technical approach.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Return metadata-only in list endpoint | **ACCEPTED** - Clean separation, maximal performance gain |
| Add content parameter | Add `?includeContent=false` query parameter | Still returns content by default, requires client opt-in |
| Implement pagination | Add `?limit=50&offset=0` pagination | Doesn't solve per-ticket payload size, adds complexity |
| Client-side filtering | Cache full tickets client-side | Increases memory usage, initial load still slow |

## 4. Acceptance Criteria

### Functional
- [ ] `/api/projects/{projectId}/crs` returns tickets WITHOUT `content` field
- [ ] Response includes: `code`, `title`, `status`, `type`, `priority`, `dateCreated`, `lastModified`
- [ ] `/api/projects/{projectId}/crs/{crId}` returns full ticket WITH `content` (unchanged behavior)
- [ ] Frontend list views render correctly using metadata only
- [ ] Frontend fetches full ticket content when user opens a specific ticket
- [ ] Sorting by date fields works correctly

### Non-Functional
- [ ] List response size reduced by >80% for 100 tickets
- [ ] List endpoint response time <200ms
- [ ] No breaking changes to individual ticket endpoint

## 5. Verification

### Success Metrics
| Metric | Baseline | Target |
|--------|----------|--------|
| List payload (100 tickets) | ~300KB | <20KB (93% reduction) |
| List endpoint response time | ~500ms | <200ms |
| Detail endpoint response | Unchanged | Unchanged |

### Test Coverage
- API tests verify list endpoint returns metadata-only structure
- API tests verify detail endpoint returns full ticket with content
- E2E tests verify frontend list and detail views work correctly

## 6. Deployment

Deploy in two phases:
1. Backend changes (metadata-only list endpoint)
2. Frontend changes (lazy content fetching)

Rollback: Revert to previous deployment if list view breaks or performance degrades.
