FileWatcherService refactoring to support multi-path monitoring for Git worktrees.

Decomposes the monolithic 683-line service into focused modules:
- **PathWatcherService**: Multi-watcher orchestration (~120 lines)
- **SSEBroadcaster**: Client lifecycle + event broadcasting (~150 lines)
- **FileWatcherService** (facade): Backward compatibility (~50 lines)

Key constraints: Each module ≤150 lines, <5% performance overhead, graceful degradation on failure.
