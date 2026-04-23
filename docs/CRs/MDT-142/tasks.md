# Tasks: MDT-142

**Source**: [MDT-142](../MDT-142-fix-filewatcher-recursive-watching-worktree-exclus.md)
**Generated**: 2026-03-17

## Scope Boundaries

- **Backend**: PathWatcherService owns file watching, subdocument extraction, worktree exclusion
- **Frontend**: TicketViewer owns UI updates, EventBus owns event types
- **SSE**: SSEBroadcaster owns event payload structure

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Recursive watch pattern | `PathWatcherService.ts` | N/A |
| Subdocument path parsing | `PathWatcherService.ts` | N/A |
| Worktree exclusion | `PathWatcherService.ts` | N/A |
| SSE event structure | `SSEBroadcaster.ts` | N/A |
| Event type definition | `eventBus.ts` | N/A |
| SSE → EventBus mapping | `useSSEEvents.ts` | N/A |
| Subdocument UI handling | `TicketViewer/index.tsx` | N/A |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 (Recursive pattern) | Task 1 |
| C2 (Worktree exclusion) | Task 1 |
| C3 (Monitor .git/worktrees) | Task 2 |
| C4 (Backward compatibility) | Task 4, Task 5 |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint |
|-----------|---------------|-------|------------|
| M0: Backend foundation | — | Task 1, Task 2, Task 3 | Unit tests GREEN |
| M1: Frontend event mapping | BR-1.4 | Task 4, Task 5 | Frontend unit tests GREEN |
| M2: UI handling | BR-1.4, Edge-2 | Task 6 | 5-case tests GREEN |
| M3: E2E integration | BR-1.1, BR-1.4 | Task 7 | E2E tests GREEN |

## Tasks

### Task 1: PathWatcherService: Recursive pattern + subdocument extraction + worktree exclusion (M0)

**Skills**: architecture-patterns

**Structure**: `server/services/fileWatcher/PathWatcherService.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-path-watcher-recursive` → `server/tests/fileWatcherService.subdocument.test.ts`: recursive pattern tests
- `TEST-path-watcher-exclusion` → `server/tests/fileWatcherService.subdocument.test.ts`: exclusion tests
- `TEST-worktree-exclusion` → `server/tests/fileWatcherService.subdocument.test.ts`: duplicate prevention tests
- `no_duplicate_events_worktree` → BDD scenario (BR-1.3)

**Scope**: File watching logic for subdocuments and worktree exclusion
**Boundary**: Does not modify SSE event structure or frontend

**Creates**: None (modifies existing)

**Modifies**:
- `server/services/fileWatcher/PathWatcherService.ts`

**Must Not Touch**:
- `SSEBroadcaster.ts`
- Frontend files

**Anti-duplication**: Import existing `WorktreeService` from `@mdt/shared/services/WorktreeService.js`

**Duplication Guard**:
- Check `PathWatcherService.ts` for existing watch logic before adding new methods
- Verify no duplicate file event handling exists

**Verify**:

```bash
bun run --cwd server jest fileWatcherService.subdocument.test.ts
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] Recursive pattern `**/*.md` used
- [x] Subdocument path parsing extracts code and filePath
- [x] Worktree exclusion prevents duplicate events

---

### Task 2: PathWatcherService: Worktree auto-discovery via .git/worktrees/*/HEAD monitoring (M0)

**Skills**: architecture-patterns

**Structure**: `server/services/fileWatcher/PathWatcherService.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-worktree-auto-discovery` → `server/tests/fileWatcherService.worktree-monitor.test.ts`: HEAD monitoring tests
- `worktree_add_auto_detects` → BDD scenario (BR-1.2)

**Scope**: Automatic worktree detection and watcher reconfiguration
**Boundary**: Does not modify SSE or frontend

**Creates**: None (modifies existing)

**Modifies**:
- `server/services/fileWatcher/PathWatcherService.ts`

**Must Not Touch**:
- `SSEBroadcaster.ts`
- Frontend files

**Anti-duplication**: Reuse existing `addWatcher()` and `removeWorktreeWatcher()` methods

**Duplication Guard**:
- Check existing worktree watcher map before adding new tracking
- Verify HEAD monitoring doesn't duplicate existing worktree detection

**Verify**:

```bash
bun run --cwd server jest fileWatcherService.worktree-monitor.test.ts
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] `.git/worktrees/*/HEAD` monitored
- [x] Worktree add/remove triggers watcher reconfiguration
- [x] Edge-1: Cleanup on worktree removal

---

### Task 3: SSEBroadcaster: Add subdocument metadata and source to SSE events (M0)

**Structure**: `server/services/fileWatcher/SSEBroadcaster.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-sse-subdocument-events` → `server/tests/sseBroadcaster.subdocument.test.ts`: event structure tests

**Scope**: SSE event payload structure with subdocument metadata
**Boundary**: Does not modify file watching or frontend

**Creates**: None (modifies existing)

**Modifies**:
- `server/services/fileWatcher/SSEBroadcaster.ts`

**Must Not Touch**:
- `PathWatcherService.ts`
- Frontend files

**Anti-duplication**: Extend existing `FileChangeEvent` interface

**Duplication Guard**:
- Check existing `FileChangeEvent` interface before adding fields
- Verify no duplicate event type definitions

**Verify**:

```bash
bun run --cwd server jest sseBroadcaster.subdocument.test.ts
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] SSE events include `subdocument` field
- [x] SSE events include `source` field ('main' | 'worktree')
- [x] Edge-2: add/unlink events include subdocument metadata

---

### Task 4: EventBus: Add ticket:subdocument:changed event type (M1)

**Structure**: `src/services/eventBus.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-frontend-event-mapping` → `src/hooks/useSSEEvents.subdocument.test.ts`: mapping tests

**Scope**: Add new event type to EventBus
**Boundary**: Does not modify SSE handling or TicketViewer

**Creates**: None (modifies existing)

**Modifies**:
- `src/services/eventBus.ts`

**Must Not Touch**:
- `useSSEEvents.ts`
- `TicketViewer/index.tsx`

**Anti-duplication**: Follow existing event type patterns in `EventType`

**Duplication Guard**:
- Check `EventType` union before adding new type
- Verify no duplicate payload type definitions

**Verify**:

```bash
bun test src/hooks/useSSEEvents.subdocument.test.ts
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] `ticket:subdocument:changed` event type added
- [x] `TicketSubdocumentEventPayload` interface defined
- [x] C4: `ticket:updated` still works

---

### Task 5: useSSEEvents: Map SSE file-change to ticket:subdocument:changed or ticket:updated (M1)

**Skills**: frontend-react-component

**Structure**: `src/hooks/useSSEEvents.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-frontend-event-mapping` → `src/hooks/useSSEEvents.subdocument.test.ts`: mapping tests

**Enables (BDD)**:
- `subdocument_sse_event_main_project` (BR-1.1, BR-1.4) — needs Task 6 to complete
- `subdocument_sse_event_worktree` (BR-1.1, BR-1.4, BR-1.2) — needs Task 6 to complete

**Scope**: SSE to EventBus mapping logic
**Boundary**: Does not modify EventBus types or TicketViewer

**Creates**: None (modifies existing)

**Modifies**:
- `src/hooks/useSSEEvents.ts`

**Must Not Touch**:
- `src/services/eventBus.ts`
- `src/components/TicketViewer/index.tsx`

**Anti-duplication**: Use existing `eventBus.emit()` patterns

**Duplication Guard**:
- Check existing SSE handling before adding new mapping
- Verify no duplicate event emission

**Verify**:

```bash
bun test src/hooks/useSSEEvents.subdocument.test.ts
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] SSE with subdocument → `ticket:subdocument:changed`
- [x] SSE without subdocument → `ticket:updated`
- [x] eventType included in payload

---

### Task 6: TicketViewer: Handle ticket:subdocument:changed with 5 cases (M2)

**Skills**: frontend-react-component

**Structure**: `src/components/TicketViewer/index.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-ticket-viewer-subdocument` → `src/components/TicketViewer/useTicketDocumentRealtime.subdocument.test.ts`: 5-case tests

**Makes GREEN (Behavior)**:
- `subdocument_sse_event_main_project` → `tests/e2e/filewatcher/subdocument-sse.spec.ts` (BR-1.1, BR-1.4)
- `subdocument_sse_event_worktree` → `tests/e2e/filewatcher/subdocument-sse.spec.ts` (BR-1.1, BR-1.4, BR-1.2)

**Scope**: UI handling for subdocument change events
**Boundary**: Does not modify SSE or EventBus

**Creates**: None (modifies existing)

**Modifies**:
- `src/components/TicketViewer/index.tsx`
- `src/components/TicketViewer/useTicketDocumentRealtime.ts`

**Must Not Touch**:
- `src/hooks/useSSEEvents.ts`
- `src/services/eventBus.ts`

**Anti-duplication**: Use existing `invalidateCache()` from `useTicketDocumentContent`

**Duplication Guard**:
- Check existing `ticket:updated` handler before adding new handler
- Verify no duplicate state updates

**Verify**:

```bash
bun test src/components/TicketViewer/useTicketDocumentRealtime.subdocument.test.ts
```

**Done when**:
- [x] Unit tests GREEN (were RED)
- [x] Case 1: change + viewing → invalidateCache + refetch
- [x] Case 2: change + NOT viewing → invalidateCache only
- [x] Case 3: add → refetch ticket (tabs refresh)
- [x] Case 4: unlink + NOT viewing → refetch ticket (tabs refresh)
- [x] Case 5: unlink + viewing → selectPath('main') + refetch

---

### Task 7: E2E: Verify subdocument SSE events flow end-to-end (M3)

**Skills**: playwright-skill

**Makes GREEN (Behavior)**:
- `subdocument_sse_event_main_project` → `tests/e2e/filewatcher/subdocument-sse.spec.ts` (BR-1.1, BR-1.4)
- `subdocument_sse_event_worktree` → `tests/e2e/filewatcher/subdocument-sse.spec.ts` (BR-1.1, BR-1.4, BR-1.2)

**Scope**: End-to-end verification of SSE event flow
**Boundary**: E2E tests only, no code changes

**Creates**:
- `tests/e2e/filewatcher/subdocument-sse.spec.ts` (already written)

**Modifies**: None

**Must Not Touch**:
- All runtime code

**Anti-duplication**: N/A (test file)

**Duplication Guard**: N/A (test file)

**Verify**:

```bash
bunx playwright test tests/e2e/filewatcher/subdocument-sse.spec.ts
```

**Done when**:
- [x] E2E tests GREEN
- [x] Subdocument changes trigger SSE events
- [x] Frontend receives and processes events correctly

---

## Post-Implementation

- [ ] No duplication (grep check for duplicate logic)
- [ ] Scope boundaries respected
- [ ] All unit tests GREEN
- [ ] All BDD scenarios GREEN
- [ ] Smoke test: Open ticket with subdocuments, edit subdoc in worktree, verify UI updates
- [ ] Fallback: Main ticket file changes still emit `ticket:updated`

---
*Rendered by /mdt:tasks via spec-trace*
