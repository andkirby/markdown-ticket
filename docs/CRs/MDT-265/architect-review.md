# Architect review: MDT-265

Review target: working-tree change against bf75438f1c765b341bd72a8d88d9a029311e4ee3.
User requested another independent architecture review, fixes, implementation
status, and a scoped commit. The starting tree matched accepted evidence.

**Semantic verdict: PASS after corrections.**

## Resolved findings

1. **HIGH: lifetime ownership of asynchronous discovery.** A delayed Git
   fallback or initial detection can register after HEAD unlink/project stop.
   Old project cleanup also awaits close while retaining shared map ownership,
   allowing it to remove a replacement generation. Fix in PathWatcherService:
   project/HEAD lifetime identities, cancellation checks before registration,
   synchronous detachment before awaiting closes, exact project selection.
2. **MEDIUM: filename protection and documents context.** Protected HTML
   basenames skip restoration when the source is a project document and has no
   ticket key. Reuse resolveDocumentRef for that context; retain complete paths
   and the document-links capability flag.
3. **MINOR: stale owner comment.** WorktreeService describes interface stubs
   despite executing Git. Update the comment to match the implemented owner.

4. **MEDIUM: relative Git metadata backlinks.** Both startup and live discovery
   previously treated gitdir targets as process-relative paths. They now use
   one helper that resolves against the metadata file directory. Startup/live
   regressions cover registration and removal. See [Git worktree options](https://git-scm.com/docs/git-worktree#Documentation/git-worktree.txt---relative-paths).

## Architecture assessment

| Check | Authority | Result |
|-------|-----------|--------|
| Canonical key syntax in domain-contracts | frontmatter.ts; MDT-254 | PASS |
| WorktreeService owns branch syntax and ticket routing | MDT-095 architecture:79 | PASS |
| Watcher owns subscription metadata, not CRUD path routing | project-identity-and-worktrees.md | PASS |
| Async lifetime and cleanup ownership | PathWatcherService + WatcherLifecycleManager | PASS |
| One document resolver across contexts | markdownPreprocessor.ts | PASS |
| Rendering tests use production hook and real sanitizer | useMarkdownProcessor.test.ts | PASS |

No new module extraction is required: Git subscription identity is a watcher
adapter concern; ticket routing remains in WorktreeService. Findings were corrected in the implementation phase and independently
re-reviewed. Deferred tests cover disposal, replacement, duplicate-ticket
results and queued callbacks. Complete filename tests cover relative resolution,
root-file knowledge, unique-basename lookup and disabled document links.

## Verification and limits

- Frontend suite: 1305 passing tests. Watcher boundary suites: 110 passing tests
  across six files. Shared title/worktree suites: 25 passing tests.
- All-package build, changed-file types, scoped ESLint, and configured
  pre-commit Knip file check pass. Final immutable verification is rerun before
  the approved status update and commit.
- Complexity comparison found no new red-zone module. Existing SSE/preprocessor
  red zones predate this ticket; the converter remains green.
- Full Knip also reports pre-existing unused public exports/types and a dynamic
  test-setup dependency outside these changes. The configured commit gate is
  `knip --files`, which passes. No public API was removed merely to silence it.
- Browser E2E and deployment are not claimed. No server was restarted.
