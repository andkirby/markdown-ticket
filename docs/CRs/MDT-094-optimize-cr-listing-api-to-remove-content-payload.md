---
code: MDT-094
status: Approved
dateCreated: 2025-12-11T16:09:47.654Z
type: Technical Debt
priority: Medium
---

# Optimize CR listing API to remove content payload

## 1. Description

### Problem
- `/api/projects/{projectId}/crs` endpoint returns full Ticket objects including `content` field with entire markdown
- Listing 100 tickets transfers entire markdown content for each ticket, causing unnecessary bandwidth usage
- Frontend only needs metadata for listing views, not full content
- Missing creation/modification dates in listing response needed for proper sorting

### Affected Artifacts
- `server/dist/routes/projects.js:65` - `/api/projects/{projectId}/crs` endpoint returns full Ticket objects
- `shared/services/MarkdownService.ts:210` - `scanMarkdownFiles()` parses full markdown content
- `shared/models/Ticket.ts:23` - Ticket interface includes content field
- `src/services/dataLayer.ts:84` - Frontend fetches full tickets for listing
- `src/components/List.tsx:96` - Component expects full ticket data

### Scope
- **Changes**: Modify listing endpoint to return metadata-only, update frontend to fetch content on-demand
- **Unchanged**: Individual ticket endpoint (`/api/projects/{projectId}/crs/{crId}`) keeps full content

## 2. Decision
### Chosen Approach
Modify list endpoint to return only mandatory metadata fields. Frontend will fetch full content separately when needed.

### Data Flow
1. **List view**: `/api/projects/{id}/crs` → metadata only (code, title, status, type, priority, dates)
2. **Ticket view**: `/api/projects/{id}/crs/{id}` → full ticket with content
3. **Frontend**: Fetch metadata for list, fetch full ticket when user clicks on specific ticket

### Rationale
- Reduces list endpoint payload by >90%
- Maintains clear separation: list vs detail operations
- Frontend gets exactly what it needs for each view
- No unnecessary data transfer

> **Extracted**: Complex architecture — see [architecture.md](./architecture.md)

**Summary**:
- Pattern: Data Transfer Optimization
- Components: 5 (ProjectController, TicketService, MarkdownService, dataLayer, List component)
- Key constraint: List endpoint payload <10% of current size, detail endpoint unchanged

**Extension Rule**: To add new metadata fields, update TicketMetadata interface and scanTicketMetadata() method (limit 100 lines).
## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Return metadata-only in list endpoint | **ACCEPTED** - Clean separation, maximal performance gain |
| Add content parameter | Add `?includeContent=false` query parameter | Still returns content by default, requires client opt-in |
| Implement pagination | Add `?limit=50&offset=0` pagination | Doesn't solve per-ticket payload size, adds complexity |
| Client-side filtering | Cache full tickets client-side | Increases memory usage, initial load still slow |

## 4. Artifact Specifications
### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `server/controllers/ProjectController.js` | Response modification | Return metadata-only Ticket objects (no content field) |
| `shared/services/MarkdownService.ts` | Method addition | Add `scanTicketMetadata()` to read YAML only |
| `shared/services/TicketService.ts` | Method update | Update `listCRs()` to return metadata-only |
| `src/services/dataLayer.ts` | Method split | `fetchTickets()` returns metadata, `fetchTicket()` fetches full |
| `src/components/List.tsx` | Integration update | Use metadata for list, fetch full content on selection |

### Data Flow Changes

**Backend**:
1. List endpoint returns: `{code, title, status, type, priority, dateCreated, lastModified}`
2. Detail endpoint returns: Full ticket with content (unchanged)

**Frontend**:
1. List view: Use metadata from list endpoint
2. Ticket detail view: Fetch full ticket using existing `/api/projects/{id}/crs/{crId}`
3. Lazy loading: Content only loaded when needed
## 5. Acceptance Criteria
### Functional
- [ ] `/api/projects/{projectId}/crs` returns tickets WITHOUT `content` field
- [ ] Response includes mandatory fields: `code`, `title`, `status`, `type`, `priority`, `dateCreated`, `lastModified`
- [ ] `/api/projects/{projectId}/crs/{crId}` returns full ticket WITH `content` (unchanged)
- [ ] Frontend List view renders using metadata only
- [ ] Frontend fetches full ticket when user clicks on specific ticket
- [ ] Sorting by dates works correctly

### API E2E Tests
- [ ] Test list endpoint returns metadata-only structure
- [ ] Test detail endpoint returns full ticket structure  
- [ ] Test payload size reduction >80%
- [ ] Test frontend can display list and detail views properly

### Non-Functional
- [ ] List response size reduced by >80% for 100 tickets
- [ ] List endpoint response time <200ms
- [ ] No breaking changes to individual ticket endpoint
## 6. Verification

### By CR Type
- **Technical Debt**: List endpoint returns metadata only, individual endpoint unchanged, performance improved

### Metrics
- Baseline: 100 tickets × ~3KB content = ~300KB payload
- Target: 100 tickets × ~200B metadata = ~20KB payload (93% reduction)
- Response time: 500ms → <200ms for 100 tickets

## 7. Deployment

### Phased Deployment

| Phase | Artifacts Deployed | Rollback |
|-------|-------------------|----------|
| 1 | Backend metadata service, updated list endpoint | Revert to full Ticket return |
| 2 | Frontend metadata fetching, lazy content loading | Revert dataLayer.ts changes |

### Migration Steps

```bash
# Build shared code with new types
npm run build:shared

# Build backend with new endpoint
cd server && npm run build

# Build frontend with lazy loading
npm run build
```