# Worktree File Changes Emit No SSE Event (MDT-142 regression)

**Date:** 2026-08-09
**Severity:** High
**Status:** Open
**Affected:** Worktree-driven live updates (`server/services/fileWatcher/`), SSE consumers watching ticket subdocuments edited from a git worktree

## Symptoms

`server/tests/integration/worktree-sse.test.ts` — the test "emits a real SSE subdocument event from a git worktree with source attribution" fails **deterministically**, not flakily:

```text
✕ emits a real SSE subdocument event from a git worktree with source attribution (5810 ms)
  Timed out after 5000ms
  > 51 |   throw new Error(`Timed out after ${timeoutMs}ms`)
```

The sibling test ("suppresses main-project subdocument SSE events…") passes — but only **trivially**, because it asserts the *absence* of an event. When no event is ever emitted, an absence assertion is vacuously true.

## Impact

Live updates for ticket subdocuments edited inside a git worktree never reach the browser. Users editing `architecture.md` (or any subdoc) from a feature-branch worktree see no live refresh; they must manually reload. The feature (MDT-142) is effectively non-functional for the worktree path.

## Confirmed Cause

Not a timeout budget problem. The test was initially misdiagnosed as "flaky / 5s too short." Raising the wait budget to 15s made the test run ~16s and **still fail** — the event never arrives.

Instrumented the recorder to dump captured SSE events to a file (the shared test setup mocks `console`, so stderr is swallowed). After writing a real file in the worktree, only the connection handshake is captured:

```json
[
  { "type": "connection", "data": { "status": "connected", "timestamp": 1786308641481 } }
]
```

Zero `file-change` events. The worktree file-watcher path is not emitting. The chain under test: `chokidar` worktree watcher → `PathWatcherService` → `SSEBroadcaster` → `/api/events` SSE — one of those links is silent for the worktree source.

## Reproduction

```bash
cd server
npx jest tests/integration/worktree-sse.test.ts
# → 1 failed (the "emits a real SSE…" test); 1 passed (the "suppresses…" absence test)
```

Run 3× — fails identically each time at ~5.8–6.0s (then ~16s when the budget is raised). Not flaky; deterministically broken.

## Verification this is pre-existing (not branch-introduced)

```bash
git diff main..HEAD --stat -- server/tests/integration/worktree-sse.test.ts server/services/fileWatcher/ server/routes/sse.ts
# → (empty: no diff between main and this branch for the test, watcher, or SSE route)
```

Fails identically on `main`. Unrelated to the current branch's (MDT-226/206/225) work.

## Follow-up

- Debug the worktree watcher emission chain: add a probe at each stage (`PathWatcherService` worktree event handler → `SSEBroadcaster.broadcast`) to locate where the event is dropped. Likely in the worktree-watcher add/event path in `services/fileWatcher/`.
- The "suppresses…" test currently gives false confidence — it passes whether or not the feature works. Add a positive-control assertion or restructure so it only passes when suppression is *selective* (main suppressed AND worktree emitted), not when everything is silent.
- Do NOT "fix" this by raising the timeout — that just hides a real defect behind a longer wait.
