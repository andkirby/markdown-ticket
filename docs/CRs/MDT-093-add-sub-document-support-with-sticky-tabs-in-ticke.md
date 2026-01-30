---
code: MDT-093
status: Approved
dateCreated: 2025-12-11T10:49:36.315Z
type: Feature Enhancement
priority: Medium
---

# Add sub-document support with sticky tabs in ticket view

## 1. Description

### Problem
- Current ticket system only displays single markdown document without support for sub-documents
- No navigation mechanism within long ticket documents
- Missing UI component for tabbed content display in ticket view
- Backend API lacks endpoint to fetch sub-document structure

### Affected Artifacts
- `src/components/TicketView.tsx` (main ticket display component)
- `src/services/fileService.ts` (file fetching service)
- `server/controllers/crController.js` (CR endpoint controller)
- `server/services/CrService.js` (CR business logic)
- `.mdt-config.toml` (configuration file for custom subdocument order)
- `openapi.yaml` (OpenAPI specification - must be updated with new endpoints)
- `/api/projects/:id/crs/:crId` (modified to include subdocuments array)
- `/api/projects/:id/crs/:crId/:subdocument` (new RESTful endpoint for sub-document content)
### Scope
- **Changes**: Add sub-document parsing, create tabs UI component, implement sticky positioning, add backend API endpoint
- **Unchanged**: Existing CR file format, current ticket CRUD operations, markdown rendering for single documents

## Architecture Design
> **Extracted**: Complex architecture — see [architecture.md](./architecture.md)

**Summary**:
- Pattern: Component composition with render props
- Components: 7 (TicketViewer, TicketTabs, TabLoading, useSubDocuments, useSubDocumentSSE, CrService, fileService)
- Key constraint: Follows React component guidelines with colocation

**Shared Patterns**:
- API error handling: Add wrapper to fileService.ts
- Markdown rendering: Reuse existing MarkdownContent component

**SSE Architecture**:
- Domain-specific SSE hooks (useSubDocumentSSE) - NOT extending global useSSEEvents
- Prevents god files: Each SSE hook stays under 50 lines and is colocated with its feature
- Clean separation: Global SSE for app-wide events, domain SSE for feature-specific events

**React Guidelines Applied**:
- Colocation: useSubDocuments and useSubDocumentSSE hooks in TicketViewer/ folder (used only by this feature)
- Folder promotion: TicketViewer becomes folder when gaining TicketTabs sub-component
- File-to-Folder Rule: Move TicketViewer.tsx to TicketViewer/index.tsx (never have both)
- Flat structure: Max 2 levels deep
- Component ownership: All tab-related files in TicketViewer/ folder

**Size Limits**:
| Module | Limit | Hard Max |
|--------|-------|----------|
| TicketTabs.tsx | 200 | 300 |
| useSubDocuments.ts | 150 | 225 |
| useSubDocumentSSE.ts | 50 | 75 |
| TabLoading.tsx | 50 | 75 |
| TicketViewer/index.tsx modifications | 100 | 150 |

**Extension Rule**: To add new sub-document parsing patterns, extend MarkdownService.ts (limit 100 lines) and update CrService.js discovery logic.
## 2. Decision

### Chosen Approach
Add sub-document parsing with shadcn tabs component and sticky positioning

### Rationale
- Sub-document structure allows logical grouping of related content within tickets
- Sticky tabs provide persistent navigation while scrolling through long documents
- shadcn tabs component ensures consistent UI design with existing components
- Backend API enables efficient sub-document discovery and fetching
## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Backend parsing + shadcn tabs with sticky positioning | **ACCEPTED** - Provides complete solution with good UX |
| Accordion-style sections | Expandable sections instead of tabs | Less intuitive for document navigation |
| Side navigation | Left sidebar navigation | Takes too much screen space |
| Client-side only parsing | Parse sub-documents entirely on frontend | Inefficient for large documents |

## 4. Artifact Specifications
### New Artifacts
| Artifact | Type | Purpose |
|----------|------|---------|
| `src/components/TicketTabs.tsx` | Component | Tabbed navigation for sub-documents |
| `src/hooks/useSubDocuments.ts` | Hook | Sub-document fetching and management |
| `/api/projects/:id/crs/:crId/:subdocument` | Endpoint | Fetch individual sub-document content (RESTful) |
| `shared/models/SubDocument.ts` | Type | Sub-document metadata type definitions |
| `server/services/CrService.js` (extended) | Service | Sub-document sorting and discovery logic |
### Modified Artifacts
| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `src/components/TicketView.tsx` | Component updated | Integrate TicketTabs component |
| `src/services/fileService.ts` | Method added | `fetchSubDocument(subdocumentName)` |
| `server/controllers/crController.js` | Route added | GET /crs/:crId/:subdocument |
| `server/services/CrService.js` | Method added | `getSubDocument(crPath, subdocumentName)` and `loadSubdocumentOrder()` |
| `shared/models/Types.ts` | Interface extended | Add subdocuments array to Ticket interface |
### Integration Points
| From | To | Interface |
|------|----|-----------|
| TicketView | TicketTabs | subdocuments array from main ticket API response |
| useSubDocuments | fileService | `fetchSubDocument(subdocumentName)` |
| CrService | File System | Sub-document discovery and sorting |
| Frontend | API | GET /crs/:crId/:subdocument for sub-document content |
| SSE Events | Frontend | Updated subdocuments array triggers re-render |
### Key Patterns
- Document discovery: Find sub-document directories named after ticket key (e.g., `{ticketsPath}/AAA-123/`)
- Default subdocument order: requirements, architecture, tests, tasks, debt
- Configuration: Order can be customized in `.mdt-config.toml` under `project.ticketSubdocuments` setting
- Main ticket API: GET `/api/projects/{projectId}/crs/{crId}` returns ticket with sorted subdocuments array
- Sub-document API: GET `/api/projects/{projectId}/crs/{crId}/tasks` returns `{code, content, dateCreated, lastModified}`
- Frontend rendering: Tabs render "main" + backend-provided order without client-side sorting
- Tab labeling: First tab labeled "main" for ticket document, subsequent tabs use sub-document filenames without .md extension
- Conditional tabs: Only show tab interface when subdocuments array is not empty
- Client-side rendering: Use existing markdown processing for content
- Lazy loading: Load sub-document content on tab selection via RESTful API
- URL routing: Update URL with hash for deep linking (#subdocument-name)
- Real-time updates: React to SSE events for updated subdocuments list
- Re-render optimization: Only re-render tabs when subdocuments array changes
- Hash fallback: If URL hash references non-existent sub-document, show "main" tab
## 5. Acceptance Criteria
### Functional
- [ ] GET `/api/projects/{projectId}/crs/{crId}` returns ticket data with `"subdocuments": ["requirements", "architecture", "tests", "tasks", "debt"]` array
- [ ] Backend reads `.mdt-config.toml` for custom `project.ticketSubdocuments` order if specified
- [ ] GET `/api/projects/{projectId}/crs/{crId}/tasks` returns `{code, content, dateCreated, lastModified}`
- [ ] API changes shall be compatible with MDT-085 OpenAPI specification
- [ ] `TicketTabs.tsx` renders shadcn tabs with "main" tab first, then sub-documents in backend-provided order
- [ ] Tabs only appear when subdocuments array is not empty; single tickets show no tabs
- [ ] Tabs container remains visible when scrolling (sticky positioning)
- [ ] Clicking tab triggers RESTful API call to `/api/projects/{projectId}/crs/{crId}/{subdocument}`
- [ ] URL updates with hash fragment for current sub-document (e.g., #tasks)
- [ ] Page reload maintains selected tab based on URL hash
- [ ] If URL hash references deleted sub-document, "main" tab is shown
- [ ] SSE events with updated subdocuments array trigger tab re-render
- [ ] If active sub-document is removed via SSE, system switches to "main" tab

### Non-Functional
- [ ] Tab switching occurs within 100ms
- [ ] Sub-document parsing handles markdown files up to 1MB
- [ ] Component follows existing shadcn theme patterns
- [ ] No layout shift when tabs become sticky
- [ ] Frontend re-renders tabs only when subdocuments array changes

### Testing
- Unit: Test backend sorting of sub-documents in correct order
- Unit: Test configuration loading from `.mdt-config.toml` `project.ticketSubdocuments`
- Unit: Test sub-document API response format (code, content, dateCreated, lastModified)
- Unit: Test `useSubDocuments` hook for proper list comparison and re-rendering
- Integration: Test `TicketView` integration with `TicketTabs` component
- E2E: Test tab navigation and sticky behavior on mobile and desktop
- E2E: Test SSE-driven tab updates for add/remove scenarios

> Full EARS requirements: [requirements.md](./requirements.md)

## OpenAPI Verification
- [ ] Updated OpenAPI spec validates: `npx @apidevtools/swagger-cli validate openapi.yaml` → "openapi.yaml is valid"
- [ ] Static HTML documentation can be generated: `npx @redocly/cli build-docs openapi.yaml -o api-docs.html`
- [ ] OpenAPI spec regenerated with `npm run openapi:generate` after implementing new endpoints
## 6. Verification

### By CR Type
- **Feature**: `TicketTabs.tsx` component exists and renders tabs, API endpoint returns sub-document structure

### Metrics
- Tab switching time < 100ms
- Sub-document parsing completes in < 50ms for files < 100KB

## 7. Deployment

### Prerequisites
- Run `npx shadcn@latest add tabs` to install tabs component
- Update shared types with `npm run build:shared`

### Deployment Steps
- Implement new sub-document endpoints with OpenAPI annotations
- Run `npm run openapi:generate` to regenerate openapi.yaml
- Deploy backend changes first (new API endpoint)
- Deploy frontend changes (new components and updated views)
- Clear browser cache to ensure updated components load
- Verify OpenAPI spec validates successfully
- Generate and verify API documentation
