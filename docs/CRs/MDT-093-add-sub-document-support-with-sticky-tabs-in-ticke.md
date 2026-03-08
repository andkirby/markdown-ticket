---
code: MDT-093
status: Implemented
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

### User Value
- Users can discover related ticket documents without leaving the ticket view
- Users can move between main ticket content and supporting documents without losing reading context
- Users can keep navigation available while scrolling long documents
- Users can share and reopen direct links to specific sub-documents
- Users can see ticket-related documents update in place as they are added or removed

### Affected Areas
- Ticket detail view
- CR and document retrieval APIs
- Project configuration for sub-document ordering
- Realtime update flow for ticket document changes
- OpenAPI and feature documentation
### Scope
- **Changes**: Add sub-document discovery, ticket-view navigation, sticky document navigation, backend support for sub-document retrieval, and deep-linking support for sub-documents
- **Unchanged**: Existing CR file format, current ticket CRUD operations, markdown rendering for single documents

### Technical Constraints
- Sub-documents must be discovered from ticket-related files and directories, not created synthetically in the UI.
- Sub-document ordering must come from backend discovery and project configuration, not client-side resorting.
- Tab navigation must use `shadcn` Tabs.
- URL hash deep linking is part of the feature contract and must remain stable across reloads.
- Real-time updates must keep the visible sub-document list aligned with underlying file changes.
- Existing markdown rendering remains the content rendering pipeline for sub-documents.
- API and OpenAPI documentation must be updated because this feature changes the API surface.

## Architecture Design
> Implementation structure and technical design are extracted to [architecture.md](./architecture.md).

This CR focuses on the product behavior and user-visible contract.
## 2. Decision

### Chosen Approach
Add sub-document navigation to ticket view so users can move between the main ticket and related documents without leaving the current context.

### Rationale
- Sub-document structure allows logical grouping of related content within tickets
- Sticky tabs provide persistent navigation while scrolling through long documents
- Folder-backed tabs allow grouped document sets such as `prep/`, `poc/`, and `part-*` to stay navigable without overloading the primary tab row
- Backend API enables efficient sub-document discovery and fetching
- Deep linking makes sub-documents shareable and reload-safe
- Realtime updates keep the displayed document structure aligned with the underlying files
## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Backend parsing + shadcn tabs with sticky positioning | **ACCEPTED** - Provides complete solution with good UX |
| Accordion-style sections | Expandable sections instead of tabs | Less intuitive for document navigation |
| Side navigation | Left sidebar navigation | Takes too much screen space |
| Client-side only parsing | Parse sub-documents entirely on frontend | Inefficient for large documents |

## 4. Artifact Specifications
### Feature Contract
- Document discovery: Find sub-document directories named after ticket key (e.g., `{ticketsPath}/AAA-123/`)
- Default top-level subdocument order: requirements, domain, architecture, poc, tests, tasks, debt
- Configuration: Order can be customized in `.mdt-config.toml` under `project.ticketSubdocuments` setting
- Main ticket API returns ticket data with a sorted `subdocuments` array
- Sub-document retrieval API returns sub-document content and metadata
- Frontend rendering presents "main" plus backend-provided top-level order without client-side resorting
- Top-level markdown files appear as primary tabs
- Top-level folders may appear as primary tabs
- Selecting a folder tab reveals a second tab row containing that folder's children
- Nested folders repeat the same pattern, adding another tab row for the next level
- Folder tabs such as `prep/`, `poc/`, and `part-*` are presented as grouped navigation entries rather than flattened tab names
- Tab labeling: First tab labeled "main" for ticket document; file tabs use filenames without `.md`; folder tabs use folder names
- Conditional tabs: Only show tab interface when subdocuments array is not empty
- Client-side rendering uses the existing markdown processing pipeline for content
- Lazy loading with preload: Load sub-document content when user selects tab, but preload before switching to prevent layout shift
- URL routing: Update URL with path-based deep linking (e.g., /ticket/{id}/requirements.md)
- Real-time updates: React to SSE events for updated subdocuments list
- Re-render optimization: Only re-render tabs when subdocuments array changes
- Path fallback: If URL references non-existent sub-document, show "main" tab

### Path-Based Routing (MDT-094)
- URL format: `[{folder/}]filename.md` - strict `.md` extension required
- Security: Prohibit `../` for path traversal prevention
- Security: Prohibit absolute paths
- Support nested folders: `part-1/chapter-1/intro.md`
- Backward compatibility: Hash URLs auto-redirect to path-based URLs
- Client-side navigation: Tab switching updates URL without page reload
## 5. Acceptance Criteria
### Functional
- [ ] The ticket detail API returns ticket data with a `subdocuments` array.
- [ ] When no custom order is configured, the top-level `subdocuments` array follows the default order: `requirements`, `domain`, `architecture`, `poc`, `tests`, `tasks`, `debt`.
- [ ] When `.mdt-config.toml` specifies `project.ticketSubdocuments`, the returned `subdocuments` array follows the configured order.
- [ ] The sub-document retrieval API returns `{code, content, dateCreated, lastModified}` for an individual sub-document.
- [ ] API changes shall be compatible with MDT-085 OpenAPI specification
- [ ] The ticket view uses `shadcn` Tabs for sub-document navigation.
- [ ] The ticket view renders tabbed navigation with "main" first, then top-level files and folders in backend-provided order.
- [ ] When a folder tab is selected, the UI shows a second tab row for that folder's children.
- [ ] When nested folders are selected, the UI adds additional tab rows for deeper levels.
- [ ] Folder-backed groups such as `prep/`, `poc/`, and `part-*` are presented as grouped tabs rather than flattened names.
- [ ] Tabs only appear when subdocuments array is not empty; single tickets show no tabs
- [ ] Tabs container remains visible when scrolling (sticky positioning)
- [ ] Selecting a sub-document tab loads the corresponding sub-document content.
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
- [ ] Additional tab rows for nested folders remain readable and usable without flattening the hierarchy into a single overcrowded row.

### Testing
- Unit: Test backend sorting of sub-documents in correct order
- Unit: Test configuration loading from `.mdt-config.toml` `project.ticketSubdocuments`
- Unit: Test sub-document API response format (code, content, dateCreated, lastModified)
- Unit: Test `useSubDocuments` hook for proper list comparison and re-rendering
- Integration: Test ticket-view integration with sub-document navigation
- E2E: Test tab navigation and sticky behavior on mobile and desktop
- E2E: Test SSE-driven tab updates for add/remove scenarios

> Full EARS requirements: [requirements.md](./requirements.md)

## OpenAPI Verification
- [ ] Updated OpenAPI spec validates: `npx @apidevtools/swagger-cli validate openapi.yaml` → "openapi.yaml is valid"
- [ ] Static HTML documentation can be generated: `npx @redocly/cli build-docs openapi.yaml -o api-docs.html`
- [ ] OpenAPI spec regenerated with `npm run openapi:generate` after implementing new endpoints
## 6. Verification

### By CR Type
- **Feature**: Ticket view exposes sub-document navigation and the API returns sub-document structure

### Metrics
- Tab switching time < 100ms
- Sub-document parsing completes in < 50ms for files < 100KB

## 7. Deployment

### Prerequisites
- Update shared types with `npm run build:shared`

### Deployment Steps
- Implement new sub-document endpoints with OpenAPI annotations
- Run `npm run openapi:generate` to regenerate openapi.yaml
- Deploy backend changes first (new API endpoint)
- Deploy frontend changes (new components and updated views)
- Clear browser cache to ensure updated components load
- Verify OpenAPI spec validates successfully
- Generate and verify API documentation
