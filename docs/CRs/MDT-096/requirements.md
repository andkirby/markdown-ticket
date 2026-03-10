# Requirements

Ticket: `MDT-096`

## Overview

FileWatcherService refactoring to support multi-path monitoring for Git worktrees.

Decomposes the monolithic 683-line service into focused modules:
- **PathWatcherService**: Multi-watcher orchestration (~120 lines)
- **SSEBroadcaster**: Client lifecycle + event broadcasting (~150 lines)
- **FileWatcherService** (facade): Backward compatibility (~50 lines)

Key constraints: Each module ≤150 lines, <5% performance overhead, graceful degradation on failure.

## Behavioral Requirements

### BR-1

- `BR-1.1` [bdd] FileWatcherService monitors multiple directory paths simultaneously
- `BR-1.2` [bdd] SSE events identify which project path triggered the change
- `BR-1.3` [bdd] Service accepts dynamic path additions at runtime
- `BR-1.4` [bdd] Service accepts dynamic path removals at runtime
- `BR-1.5` [bdd] Existing single-path API remains functional for backward compatibility
- `BR-1.6` [bdd] Global registry watcher detects project config changes and broadcasts events
- `BR-1.7` [bdd] Cache invalidation triggers when watched files change

## Constraints

- `C-2.1` [not_applicable] Must not degrade file watching performance (<5% overhead per additional path)
- `C-2.2` [not_applicable] Must maintain existing SSE event format for backward compatibility
- `C-2.3` [not_applicable] Each service module must not exceed 150 lines
- `C-2.4` [not_applicable] Must gracefully degrade if watcher creation fails (log error, continue)
- `C-2.5` [not_applicable] Debouncing prevents rapid duplicate events within 100ms window
- `C-2.6` [not_applicable] Heartbeat runs every 30 seconds to detect dead connections

## Edge Cases

- `Edge-3.1` [not_applicable] Handle concurrent add/remove operations without race conditions
- `Edge-3.2` [not_applicable] Handle watcher creation failure for individual paths without affecting other watchers

## Route Policy Summary

| Route | Count | IDs |
|---|---:|---|
| bdd | 7 | `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-1.4`, `BR-1.5`, `BR-1.6`, `BR-1.7` |
| tests | 0 | - |
| clarification | 0 | - |
| not_applicable | 8 | `C-2.1`, `C-2.2`, `C-2.3`, `C-2.4`, `C-2.5`, `C-2.6`, `Edge-3.1`, `Edge-3.2` |
