# Architecture: MDT-265

Scope: frontend path, URL, filename and prose ticket-key consumers, extended by
the user's follow-up to repair failing verification and shared/backend parser
risks. Existing modules keep ownership and routing order. No API/storage change.

- A small `utils/ticketKeyPatterns.ts` composes noncapturing pattern bodies from
  domain-contracts. Canonical stored keys require 2–5 character project codes
  and 3–5 digits. Callers own delimiters, anchors, capture groups and flags.
- Prefix extraction requires a path/filename boundary; six-digit numbers and
  invalid project codes must never be truncated into valid ticket links.
- `linkProcessor` and `linkNormalization` retain optional letter prefixes
  (CR-A001). Evidence: MDT-001 documents the historical codePattern generator,
  and archived integration examples use that format. This exception belongs
  only to the existing link consumers and derives the same project/digit bounds.
- Preserve current case sensitivity (title filename fallback alone uses i),
  relative-link classification priority, anchors, markdown/html subdocuments,
  code protection and document-index routing.
- No new runtime dependencies or consequential unresolved decisions.
- X-10000 in the ticket is an invalid example under MDT-254's project contract;
  use TP0-10000 for five-digit acceptance.

All owned leaf paths are listed in architecture.trace.md and TASK-1.

## Follow-up investigation

- domain-contracts exports TICKET_KEY_PATTERN_BODY directly; CR_CODE_PATTERN and
  consumers compose it rather than stripping anchors from another regex.
- WorktreeService remains the single owner of branch-to-ticket identity. Its
  existing extractTicketCode becomes public and supports canonical keys with an
  optional slug in the final branch segment. Detection filters the exact
  project-code prefix plus dash. PathWatcherService delegates extraction, uses
  the gitdir file's parent as the worktree root, and remembers HEAD-to-ticket
  identity for removal rather than searching watcher IDs for folder names.
- TitleExtractionService derives filename fallback from the domain body; H1
  remains authoritative. No frontend-to-backend dependency is introduced.
- Relative .md/.html links and inline spans share the same document-reference
  grammar, including anchors, while retaining scheme/absolute-path exclusions.
- Runtime browser sanitation remains DOMPurify. Only the rendering test binds
  the real sanitizer to a JSDOM window (dev dependency), following upstream's
  supported DOM guidance. It exercises useMarkdownProcessor itself; remove the
  copied test renderer. Happy DOM remains the React test environment.
- Preference expectations follow ticket-card.spec.md's one-time migration and
  explicit opt-out. No runtime preference policy change is required.

Program Design: WorktreeService.extractTicketCode(branch: string): string | null.
HEAD add -> shared extraction -> project check -> exact root -> watcher/map.
HEAD unlink -> remembered identity -> watcher removal -> map deletion.
Duplicate worktrees retain the selected first root. Only a HEAD whose gitdir
target matches that selected root is retained for removal, and live duplicate
additions do not announce a different root while keeping the original watcher.
If gitdir metadata is absent, detection can select a root, but HEAD ownership is
established only by that root's own .git pointer; the triggering HEAD is not
assumed to own a ticket-only fallback result.
Whole-filename protection uses both supported document extensions before prose
ticket conversion, including ticket-shaped HTML basenames.
Least-confident boundary: DOM integration in tests; a supported-DOM probe must
preserve markup and remove javascript: before replacing the test harness.

## Architect review corrections

Project lifetime identities invalidate delayed discovery on shutdown; per-HEAD
identities invalidate pending adds on unlink or a newer add. Shutdown detaches
owned entries synchronously, then awaits only captured watcher references. Old
cleanup never mutates replacement ownership. Removal releases worktree exclusion
state, and project matching uses exact IDs or delimited watcher-kind prefixes.

Document-context filename restoration does not require a ticket key. It routes
the complete filename through resolveDocumentRef, respecting disabled document
links; ticket-context compatibility remains in its existing branch.
