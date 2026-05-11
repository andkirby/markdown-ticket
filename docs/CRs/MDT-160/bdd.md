# BDD: MDT-160

Source: [MDT-160](../MDT-160-document-sse-cache.md)
Generated: 2026-05-11

## E2E Context

| Field | Value |
|-------|-------|
| Framework | Playwright for browser E2E, Supertest/Jest for API-level SSE behavior |
| Directory | `tests/e2e/`, `server/tests/` |
| Command | `bun run test:e2e` for browser flows; `bun run --cwd server jest` for server flows |
| Acceptance gating | Executable checks expected for server watcher/event behavior; browser flow may be covered by focused component/EventBus tests if full E2E setup is heavy |

## Feature

Feature: Documents View live file freshness

As a Markdown Ticket user, I want configured document changes to appear in Documents View without manual cache clearing, so that the app reflects the files on disk.

## Journeys

### Selected Document Refresh

```gherkin
@requirement:BR-1.2 @priority:high
Scenario: Selected document refreshes after external edit
  Given Documents View is open with a configured document selected
  When the selected document file changes on disk
  Then the preview shows the fresh document content without changing the selected route
```

### Non-Selected Document Update

```gherkin
@requirement:BR-1.3 @priority:medium
Scenario: Non-selected document update preserves active preview
  Given Documents View is open with one document selected and another configured document visible in the tree
  When the non-selected document changes on disk
  Then the document tree metadata refreshes and the selected preview remains unchanged
```

### Deleted Selected Document

```gherkin
@requirement:BR-1.4 @priority:high
Scenario: Deleted selected document shows deleted state
  Given Documents View is open with a configured document selected
  When the selected document file is deleted on disk
  Then the viewer shows a deleted-file state instead of stale content
```

### Live Document Event

```gherkin
@requirement:BR-1.1 @priority:high
Scenario: Configured document update reaches connected clients
  Given a project has configured document paths and a client is connected to live updates
  When a markdown file inside a configured document path is added, changed, or removed
  Then the client receives an update for the project-relative document path and event type
```

### Reconnect Recovery

```gherkin
@requirement:BR-1.5 @priority:medium
Scenario: Reconnect resyncs open documents
  Given Documents View is open after the live update connection was interrupted
  When the live update connection reconnects
  Then the document tree and selected document content are refreshed
```

### Document Path Selection Change

```gherkin
@requirement:BR-1.6 @priority:high
Scenario: Changing selected document paths enables live updates for the new paths
  Given Documents View has saved one set of selected document paths
  When the user saves a different document path selection
  Then future file updates from the new selection are handled without requiring a server restart
```

## Notes

- Constraints and edge cases are intentionally not BDD-covered; they carry to architecture and tests.
- The scenario budget is 6 total, under the normal-mode limit.
