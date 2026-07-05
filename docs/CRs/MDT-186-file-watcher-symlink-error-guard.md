---
code: MDT-186
status: Implemented
dateCreated: 2026-07-05T21:48:16.147Z
type: Feature Enhancement
priority: Medium
implementationNotes: Fix delivered: followSymlinks:false in PathWatcherService OPTS + dedicated error handler in facade. Regression tests added (MDT-186).
---

# File watcher must not follow symlinks or crash on chokidar errors

## Problem

The file watcher server crashes the process when chokidar emits an `error` event and no consumer has attached an `error` listener on the `FileWatcherService` facade. Node's `EventEmitter` throws `ERR_UNHANDLED_ERROR` on an `error` emit with zero listeners, which under bun terminates the process.

The concrete trigger observed in production: the registered `LlmTranslator` (Xcode app) project contains a DMG-build staging symlink `LlmTranslator_dmg_temp/Applications → /Applications`. chokidar (default `followSymlinks: true`) follows it, recurses into `/Applications/LLM Code/Xcode.app`, and `lstat`s Apple's self-referential `Ruby.framework/Headers/ruby/ruby/...` symlink loop → `ELOOP` → `error` event → unhandled → crash. The crash surfaces when any SSE client (e.g. the VOC documents page) lazily provisions watchers for already-registered projects.

Two independent defects, both must be fixed:

1. **Symlink escape**: chokidar follows symlinks out of the watched project root. MDT watches markdown only and already enforces path containment (`isInsideRoot`, `isPathInsideTicketPath`); the watcher runtime does not.
2. **Fragile error forwarding**: the facade forwards `error` through a generic broadcast loop identical to all other events, ignoring Node's throw-on-unhandled-`error` semantics.

## Requirements Scope

`brief` — Bug fix; focus on the two defects.

## Affected Areas

- `server/services/fileWatcher/PathWatcherService.ts` — chokidar options
- `server/services/fileWatcher/index.ts` — error event forwarding
- `server/tests/unit/PathWatcherService.test.ts` — regression: `followSymlinks: false`
- `server/tests/fileWatcherService.worktree.test.ts` — regression: no crash on unhandled watcher error

## Root Cause

1. `OPTS` in `PathWatcherService` omits `followSymlinks`, so chokidar's default `true` applies. Any outward symlink in a watched tree becomes a new watch root via `_handleFsEventsSymlink` → `realpath` → `_addToFsEvents`.
2. `setupEventForwarding()` in the facade lists `'error'` in `eventsToForward` and re-emits it with `this.emit('error', data)`. With no listener, Node throws.

## Fix

1. **Root cause (symlink escape)**: add `followSymlinks: false` to the shared `OPTS`. MDT never needs symlink targets; worktree paths are real directories so worktree watching is unaffected. Containment is now enforced uniformly with the existing path-level guards.
2. **Defense in depth (error forwarding)**: remove `'error'` from the generic forward loop; add a dedicated handler that always logs and re-emits only when `this.listenerCount('error') > 0`. This is the canonical Node pattern and preserves forwarding to consumers who attach a listener (verified by existing C4 worktree test).

The two layers are independent: `followSymlinks: false` prevents the specific ELOOP; the error guard prevents any future chokidar error (EACCES, ENOSPC, etc.) from crashing the server.

## Verification

- `bun run --cwd server jest` — all watcher suites green (82 tests).
- `bun run validate:ts` — no new type errors introduced by the change.
- Regression tests added asserting both behaviors.

## Non-Goals

- Per-project `followSymlinks` override (add when a project legitimately stores tickets behind symlinks).
- Cleaning `LlmTranslator_dmg_temp/` — that is the user's build artifact; the watcher guard is the correct system-level fix.