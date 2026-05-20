---
code: MDT-174
status: In Progress
dateCreated: 2026-05-20T12:09:57.462Z
type: Feature Enhancement
priority: High
---

# Add ticket trace graph viewer

## 1. Description

### Requirements Scope

`full` - concrete frontend, backend, static asset, and test artifacts are known.

### Problem

- `src/components/TicketViewer/index.tsx` has no ticket-scoped entry point for spec-trace graph data.
- `server/routes/projects.ts` exposes ticket and subdocument reads, but no endpoint for the standard trace store path.
- The standalone spec-trace dashboard at `/Users/kirby/home/mdt-prompts/tools/spec-trace/dashboard/trace-dashboard.html` can render trace stores, but Markdown Ticket does not expose it from the ticket viewer.
- The user flow must preserve dashboard styles without rewriting the graph board as React.

### Affected Artifacts

- `src/components/TicketViewer/index.tsx` - render conditional trace graph entry and open shell.
- `src/components/TicketViewer/CompactTicketHeader.tsx` - host or expose header action placement.
- `src/components/TicketViewer/TraceGraphShell.tsx` - new full-screen parent shell.
- `src/components/TicketViewer/useTraceStoreAvailability.ts` - new availability hook.
- `src/services/dataLayer.ts` - trace store metadata/data fetch methods.
- `server/routes/projects.ts` - trace store routes under ticket resource.
- `server/controllers/ProjectController.ts` - trace store route handlers.
- `server/services/TicketService.ts` - project/ticket trace store lookup.
- `shared/services/ticket` or server-local helper - standard trace store path resolution.
- `public/spec-trace/trace-dashboard.html` - static dashboard copy with ticket-based boot parameters.
- `docs/design/surfaces/ticket-viewer.spec.md` - updated UX source of truth.
- `docs/design/surfaces/ticket-viewer.mockups.md` - updated UX wireframes.
- `tests/e2e` and server API tests - coverage for action visibility and endpoints.

### Scope

- Changes:
  - Add ticket-scoped trace store discovery from `{ticketsDir}/.trace/{ticketCode}/store.json`.
  - Add backend metadata and JSON read endpoints for the trace store.
  - Add `Trace Graph` action in Ticket Viewer only when trace store metadata exists.
  - Add a full-screen MDT-owned shell with a `Back` control and iframe.
  - Serve/copy the existing trace dashboard HTML as a static dashboard reader.
  - Make dashboard boot from `project` and `ticket` query params.
  - Preserve dashboard-owned styles and graph-board controls inside the iframe.
- Unchanged:
  - Do not rewrite the trace graph board in React.
  - Do not put MDT navigation controls inside the dashboard HTML.
  - Do not expose filesystem paths in frontend query params.
  - Do not change ticket subdocument navigation behavior.
  - Do not change Mermaid diagram viewer behavior.

## 2. Decision

### Chosen Approach

Embed the static trace dashboard in a ticket-owned full-screen iframe shell with ticket-derived API data.

### Rationale

- `trace-dashboard.html` already owns graph layout, filters, cards, edges, and dashboard-specific styles.
- `TicketViewer` is the correct owner for ticket-level discovery and return navigation.
- Server-owned path resolution keeps `{ticketsDir}/.trace/{ticketCode}/store.json` out of browser-visible state.
- An iframe isolates dashboard CSS from MDT modal, prose, tab, and badge styling.
- A full-screen MDT shell gives the user a stable `Back` path without coupling the dashboard to MDT navigation.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|----------------|--------------|
| **Chosen Approach** | Static dashboard in MDT-owned iframe shell, ticket-derived data endpoint | **ACCEPTED** - Preserves dashboard styles and keeps navigation owned by Ticket Viewer |
| Dashboard owns Back button | Add Back control inside `trace-dashboard.html` | Rejected because app navigation would leak into the graph reader |
| Pass `store=/api/...` query URL | Parent computes full store URL for iframe | Rejected because URL becomes noisier than the ticket-scoped model |
| Rewrite graph board as React | Port dashboard layout and controls into MDT components | Rejected because it increases scope and risks graph behavior drift |
| Keep Bun standalone server | Launch `/tools/spec-trace/dashboard/open-dashboard.ts` from MDT | Rejected because MDT already has an API server and browser UI shell |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `src/components/TicketViewer/TraceGraphShell.tsx` | Component | Full-screen shell with Back button and iframe |
| `src/components/TicketViewer/useTraceStoreAvailability.ts` | Hook | Check whether trace store metadata exists for the open ticket |
| `public/spec-trace/trace-dashboard.html` | Static asset | Dashboard reader copied from spec-trace with ticket-based boot params |
| `server/services/TraceStoreService.ts` or server-local helper | Service/helper | Resolve and read `{ticketsDir}/.trace/{ticketCode}/store.json` safely |
| `server/tests/api/ticket-trace-store.test.ts` | API test | Verify metadata, read, missing store, and path containment behavior |
| `tests/e2e/ticket/trace-graph-viewer.spec.ts` | E2E test | Verify Ticket Viewer action and full-screen shell flow |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `src/components/TicketViewer/index.tsx` | Composition change | Wire availability hook, render action, open/close `TraceGraphShell` |
| `src/components/TicketViewer/CompactTicketHeader.tsx` | Header action support | Allow trace action placement after badge row or expose action slot |
| `src/services/dataLayer.ts` | Methods added | Add trace metadata and trace store fetch methods |
| `server/routes/projects.ts` | Routes added | Add ticket trace store metadata and JSON routes |
| `server/controllers/ProjectController.ts` | Handlers added | Handle trace store metadata/read responses |
| `server/services/TicketService.ts` | Service methods added | Resolve project, ticket, and trace store location |
| `docs/design/surfaces/ticket-viewer.spec.md` | UX spec updated | Add trace action, shell, states, responsive rules |
| `docs/design/surfaces/ticket-viewer.mockups.md` | UX mockups updated | Add trace present, shell, unavailable, mobile states |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `TicketViewer` | `useTraceStoreAvailability` | `{ projectCode, ticketCode } -> { hasTraceStore, loading, error }` |
| `TraceGraphShell` | static dashboard HTML | iframe `src=/spec-trace/trace-dashboard.html?project={projectCode}&ticket={ticketCode}` |
| `trace-dashboard.html` | MDT API | `GET /api/projects/{projectCode}/crs/{ticketCode}/trace-store` |
| `dataLayer.ts` | MDT API | trace metadata/read fetch wrappers |
| `ProjectController` | `TicketService` or `TraceStoreService` | metadata and JSON read methods |
| `TraceStoreService` | filesystem | standard `{ticketsDir}/.trace/{ticketCode}/store.json` path |

### Key Patterns

- Modal Pattern B: `TraceGraphShell` uses `Modal` + `ModalBody className="p-0"`.
- Full-viewport modal variant: modal content fills `100dvw x 100dvh` for iframe tools.
- CSS isolation: dashboard styles stay inside iframe.
- Server-owned path resolution: frontend passes project code and ticket code only.
- Conditional action: absent trace store means no disabled button is rendered.
- Existing dashboard ownership: graph board internals remain owned by `trace-dashboard.html`.

## 5. UX Source of Truth

### Durable Design References

| File | Governs |
|------|---------|
| `docs/design/surfaces/ticket-viewer.spec.md` | Ticket Viewer trace action, shell behavior, responsive rules, tokens/classes |
| `docs/design/surfaces/ticket-viewer.mockups.md` | Trace present, shell, unavailable, and mobile states |

### Boundary

- This CR implements the durable Ticket Viewer design docs above.
- Do not duplicate or fork those UX rules inside this ticket.
- Do not create a trace graph board spec.
- The graph dashboard remains a static graph reader whose internals are owned by `trace-dashboard.html`.

## 6. Acceptance Criteria

### Functional

- [ ] `GET /api/projects/:projectId/crs/:ticketCode/trace-store/meta` returns presence metadata for existing standard trace store.
- [ ] `GET /api/projects/:projectId/crs/:ticketCode/trace-store` returns the JSON from `{ticketsDir}/.trace/{ticketCode}/store.json`.
- [ ] Trace store endpoints return 404 for missing stores without leaking filesystem paths.
- [ ] Trace store path resolution rejects traversal and symlink escapes outside the standard trace directory.
- [ ] `TicketViewer` shows `Trace Graph` only when trace metadata reports an existing store.
- [ ] Clicking `Trace Graph` opens a full-screen shell with Back and ticket context.
- [ ] Back closes the shell and returns to the same ticket viewer state.
- [ ] iframe URL uses only project code and ticket code query params.
- [ ] Dashboard CSS is isolated from MDT app CSS through iframe rendering.
- [ ] `trace-dashboard.html` fetches `/api/projects/{project}/crs/{ticket}/trace-store` from query params.
- [ ] No graph-board internals are reimplemented in React.

### Non-Functional

- [ ] Frontend query params do not contain filesystem paths.
- [ ] Ticket Viewer remains usable when trace metadata request fails.
- [ ] Dashboard iframe fills remaining viewport under the shell bar on mobile and desktop.
- [ ] Existing ticket document tabs and MarkdownContent behavior remain unchanged when shell is closed.
- [ ] Design docs remain aligned with implementation: `ticket-viewer.spec.md` and `ticket-viewer.mockups.md` reflect shipped behavior.

### Testing

- Unit: trace path resolver with valid ticket, missing store, traversal input, and symlink escape.
- API: metadata endpoint existing store -> 200 with presence true.
- API: metadata endpoint missing store -> 200 with presence false or 404, whichever implementation documents.
- API: store endpoint existing store -> JSON response with no-store cache headers.
- API: store endpoint missing store -> 404 without absolute path in body.
- Frontend unit: availability hook maps metadata states to render states.
- Frontend unit: TraceGraphShell builds iframe URL from project code and ticket code.
- E2E: open ticket with trace store -> `Trace Graph` appears -> shell opens -> Back returns to ticket.
- E2E: open ticket without trace store -> `Trace Graph` is absent.
- Manual: verify dashboard styles are preserved inside iframe.

## 7. Verification

### Feature Verification

- `src/components/TicketViewer/TraceGraphShell.tsx` exists and renders Back + iframe.
- `src/components/TicketViewer/useTraceStoreAvailability.ts` exists and is used by Ticket Viewer.
- `public/spec-trace/trace-dashboard.html` exists and supports `project` + `ticket` params.
- Server trace store endpoints exist under the ticket route.
- Server tests for trace store access pass.
- Frontend/E2E tests for action visibility and shell navigation pass.
- `bun run validate:ts` passes.
- `bun run build` passes.

### Metrics

- No performance metric is claimed for this CR.
- Verification is based on artifact existence, endpoint behavior, tests, build, and manual iframe style check.

## 8. Deployment

### Simple Changes

- Deploy frontend static asset and React code with the normal web build.
- Deploy backend route/controller/service changes with the normal server build.
- No new project config key is required if `{ticketsDir}/.trace/{ticketCode}/store.json` remains the standard path.
- Rollback by reverting frontend shell, static dashboard copy, and trace store API routes together.

## 9. Documentation Boundary

- Durable UX details live in `docs/design/surfaces/ticket-viewer.spec.md`.
- Durable mockups live in `docs/design/surfaces/ticket-viewer.mockups.md`.
- This CR references those files and tracks implementation work only.
