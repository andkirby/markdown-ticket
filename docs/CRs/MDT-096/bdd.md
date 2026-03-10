# BDD

## Overview

BDD scenarios cover the core multi-path monitoring behaviors:
1. Multi-path setup and monitoring
2. SSE event path identification
3. Dynamic path addition/removal
4. Backward compatibility with single-path API

Existing test coverage in `server/tests/fileWatcherService.worktree.test.ts` validates worktree-specific scenarios.

## Scenarios By Requirement Family

### BR-1

- Single-path API still works (`backward_compat_single_path`)
  Covers: `BR-1.5`
  Given: Existing code uses initFileWatcher()
  When: with a single path argument
  Then: file watching works as before
- File changes invalidate cache (`cache_invalidated_on_change`)
  Covers: `BR-1.7`
  Given: FileInvoker is connected to watcher
  When: a watched file changes
  Then: invalidateFile() is called with the file path
- Paths can be added at runtime (`dynamic_path_addition`)
  Covers: `BR-1.3`
  Given: FileWatcherService is running
  When: when addWatcher() is called with a new path
  Then: the new watcher is created and begins monitoring
- Paths can be removed at runtime (`dynamic_path_removal`)
  Covers: `BR-1.4`
  Given: Multiple watchers are active
  When: when removeWorktreeWatcher() is called
  Then: the specified watcher is closed and removed without affecting others
- Multiple paths monitored simultaneously (`multi_path_monitoring`)
  Covers: `BR-1.1`
  Given: FileWatcherService is initialized
  When: with multiple project paths registered
  Then: each path has an active watcher and changes trigger events
- Registry config changes trigger events (`registry_changes_detected`)
  Covers: `BR-1.6`
  Given: Global registry watcher is active
  When: a project .toml file is added/changed/removed
  Then: a project-created/updated/deleted event is broadcast to SSE clients
- SSE events identify source path (`sse_path_identification`)
  Covers: `BR-1.2`
  Given: A file change occurs in a watched path
  When: when the SSE event is broadcast
  Then: the event data includes the projectId that triggered it

## Coverage Summary

| Requirement ID | Scenario Count | Scenario IDs |
|---|---:|---|
| `BR-1.1` | 1 | `multi_path_monitoring` |
| `BR-1.2` | 1 | `sse_path_identification` |
| `BR-1.3` | 1 | `dynamic_path_addition` |
| `BR-1.4` | 1 | `dynamic_path_removal` |
| `BR-1.5` | 1 | `backward_compat_single_path` |
| `BR-1.6` | 1 | `registry_changes_detected` |
| `BR-1.7` | 1 | `cache_invalidated_on_change` |
