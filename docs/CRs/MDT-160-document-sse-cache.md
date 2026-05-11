---
code: MDT-160
status: In Progress
dateCreated: 2026-05-11T15:37:21.672Z
type: Bug Fix
priority: Medium
---

# Fix document SSE cache invalidation

## 1. Description

### Requirements Scope
brief

### Problem

- Documents View can show stale markdown content after a configured document file changes on disk.
- Browser refresh can still return stale content because document reads are cached and document file edits do not currently trigger cache invalidation.
- Ticket SSE works through the ticket watcher and EventBus path, but configured documents do not have an equivalent update path.

### Affected Areas

- Documents View document tree and markdown preview.
- Backend file watching and SSE broadcasting.
- Document read cache and document metadata refresh.
- UX design docs for file update behavior.

### Scope

- In scope: real-time update behavior for configured document paths.
- In scope: cache invalidation for changed document content.
- In scope: refresh behavior for the currently selected document and document tree metadata.
- In scope: preserving the existing ticket update behavior.
- Out of scope: scanning every markdown file in the project.
- Out of scope: changing ticket date semantics.
- Out of scope: replacing SSE with bidirectional transport.

## 2. Desired Outcome

### Success Conditions

- When a configured document file changes on disk, Documents View can show fresh content without manual cache clearing.
- When the currently selected document changes, the preview refreshes without changing route or selection.
- When a non-selected configured document changes, the tree metadata can refresh without interrupting the active reader.
- When the selected document is deleted, the viewer shows a clear deleted-file state.
- Ticket file and ticket subdocument updates keep their existing narrow watcher and EventBus behavior.

### Constraints

- Must watch only configured document paths from project configuration.
- Must not scan or watch every markdown file in the repository.
- Must avoid duplicate events for files under the ticket path.
- Must keep SSE as the current one-way transport.
- Must preserve existing Board/List behavior when Documents View is not mounted.

### Non-Goals

- Not adding a document editing workflow.
- Not adding a server-side route subscription system in this CR.
- Not rewriting the ticket watcher architecture unless architecture determines it is required.
- Not changing markdown rendering behavior unrelated to freshness.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Watch scope | How should configured file paths and configured directory paths be normalized into watcher patterns? | Must remain limited to project document paths. |
| Event model | Should document updates use a new SSE event type or extend existing file-change events? | Must not break existing ticket event consumers. |
| Cache | Which cache instances need explicit invalidation for document content freshness? | Must avoid manual cache-clear dependency. |
| UX | Should selected-document refresh be silent or show a compact inline indicator? | Follow `docs/design/specs/documents-view-file-updates.md`. |

### Known Constraints

- Existing SSE connection is global and one-way.
- Server cannot know the active frontend route without an additional subscription mechanism.
- Documents View currently fetches document content by project ID and project-relative file path.
- Document dates currently come from filesystem metadata.

### Decisions Deferred

- Exact backend watcher implementation.
- Exact EventBus payload shape.
- Test file placement and test granularity.
- Whether a future topic subscription API is needed.

## 4. Acceptance Criteria

### Functional

- [ ] Configured document paths produce file update events for markdown files inside those paths.
- [ ] Document file update events do not fire for unrelated markdown files outside configured document paths.
- [ ] Ticket files continue to emit existing ticket update events.
- [ ] Changed document content is read fresh after a file update event.
- [ ] Selected document preview refreshes when its backing file changes.
- [ ] Document tree metadata refreshes when a configured document is added, changed, or removed.
- [ ] Deleted selected document shows a clear empty/deleted state.
- [ ] SSE reconnect triggers a refresh of the document tree and selected document content.

### Non-Functional

- [ ] No project-wide markdown watcher is introduced.
- [ ] File update handling is debounced to avoid repeated rapid refreshes.
- [ ] Reading an unchanged selected document remains stable and does not reset user selection.

### Edge Cases

- Configured path is a single markdown file.
- Configured path is a directory containing nested markdown files.
- File changes while Documents View is not mounted.
- File is deleted while selected.
- File is added while search or sort is active.
- SSE disconnects and reconnects after missed document edits.

## 5. Verification

### How to Verify Success

- Manual: open a configured document, edit the file externally, and confirm the preview updates without manual cache clear.
- Manual: edit a non-selected configured document and confirm the tree metadata updates without changing the selected preview.
- Automated: backend watcher tests cover configured document path events and exclusion of unrelated markdown files.
- Automated: frontend EventBus or component tests cover selected-file refresh, non-selected tree refresh, delete state, and reconnect refresh.
- Regression: existing ticket SSE and ticket subdocument tests still pass.

## References

- UX spec: `docs/design/specs/documents-view-file-updates.md`
- Wireframe: `docs/design/mockups/documents-view-file-updates.md`

> Requirements trace projection: [requirements.trace.md](./MDT-160/requirements.trace.md)
>
> Requirements notes: [requirements.md](./MDT-160/requirements.md)
>
> BDD trace projection: [bdd.trace.md](./MDT-160/bdd.trace.md)
>
> BDD notes: [bdd.md](./MDT-160/bdd.md)
>
> Architecture trace projection: [architecture.trace.md](./MDT-160/architecture.trace.md)
>
> Architecture notes: [architecture.md](./MDT-160/architecture.md)
>
> Tests trace projection: [tests.trace.md](./MDT-160/tests.trace.md)
