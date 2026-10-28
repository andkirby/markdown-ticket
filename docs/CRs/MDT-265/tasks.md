# Tasks: MDT-265

Source: canonical architecture/tests state and tasks.trace.md.

## Scope Boundaries

Task 1 covers frontend consumers. User-authorized Task 2 extends scope to
shared/domain/backend parser ownership and failing frontend verification.
Canonical syntax ownership remains in domain-contracts.

## Ownership Guardrails

Existing preprocessor, link, SSE and title utilities retain their behavior.
The pattern module only composes syntax; it does not classify or route links.

## Constraint Coverage

C1, C2, C3: Task 1.

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap |
|-------|------------|----------|-----|
| Frontend runtime | 8 | 8 | 0 |
| Frontend tests | 5 | 5 | 0 |

All existing paths verified on disk; all five missing files are Creates below.
Runtime probe: existing seven-file parser/SSE suite passes 126 tests.

### Task 1: Unify frontend path and link parsers with canonical key patterns

**Skills**: mdt-frontend

**Makes GREEN (Automated Tests)**: TEST-1, TEST-2, TEST-3, TEST-4, TEST-5.

**Scope**: C1–C3; all frontend key-shaped regexes, including additional risky consumers.
**Boundary**: parsing syntax only; keep route precedence and document handling.

**Creates**:
- `frontend/src/utils/ticketKeyPatterns.ts`
- `frontend/src/utils/markdownPreprocessor.mdt265.test.ts`
- `frontend/src/utils/linkProcessor.mdt265.test.ts`
- `frontend/src/utils/linkNormalization.mdt265.test.ts`
- `frontend/src/utils/linkValidator.mdt265.test.ts`

**Modifies**:
- `frontend/src/services/sseClient.ts`
- `frontend/src/utils/markdownPreprocessor.ts`
- `frontend/src/utils/linkValidator.ts`
- `frontend/src/utils/linkProcessor.ts`
- `frontend/src/utils/linkNormalization.ts`
- `frontend/src/utils/titleExtraction.ts`
- `frontend/src/components/MarkdownContent/index.tsx`
- `frontend/src/services/sseClient.test.ts`

**Deletes**: None.
**Must Not Touch**: domain-contracts/, shared/, server/, CLI or API behavior.
**Exclude**: new route semantics, normalization redesign, storage migration.
**Anti-duplication**: import canonical syntax; compose shared frontend pattern bodies once.
**Duplication Guard**: inspect existing owners first; scan frontend for independent
key patterns after edits; never introduce a second router.
**Re-plan Trigger**: existing behavior conflicts with canonical bounds or legacy policy.

**Verify**:
```bash
bun test --isolate frontend/src/utils/markdownPreprocessor.mdt265.test.ts frontend/src/utils/linkProcessor.mdt265.test.ts frontend/src/utils/linkNormalization.mdt265.test.ts frontend/src/utils/linkValidator.mdt265.test.ts frontend/src/services/sseClient.test.ts
bun run fe:test
bun run build
bun run validate:ts
```

**Observe**:
```bash
bun test --isolate frontend/src/utils/markdownPreprocessor.mdt265.test.ts frontend/src/utils/linkProcessor.mdt265.test.ts frontend/src/utils/linkNormalization.mdt265.test.ts frontend/src/utils/linkValidator.mdt265.test.ts frontend/src/services/sseClient.test.ts
```
Expected: actual markdown URLs and classifier fields include TP0-042/TP0-10000,
anchors and nested subdocuments; invalid tokens never produce partial keys.

**Done when**:
- [x] RED-to-GREEN regression evidence recorded.
- [x] Full frontend tests and build pass.
- [x] No independent key pattern remains.
- [x] Observable acceptance smoke passes.
- [x] Mutation intent matches actual paths.

## Post-Implementation

- [x] Scope and test integrity reviewed.
- [x] Additional backend risks recorded separately in review.md.

Frontend readiness was restored by Task 2; see review.md for final evidence.

### Task 2: Resolve suite failures and consolidate cross-layer parser ownership

**Skills**: mdt-frontend
**Makes GREEN**: TEST-1, TEST-6, TEST-7, TEST-8, TEST-9, TEST-10, TEST-11, TEST-12.
**Scope**: C4, C5, C6; user-requested investigation and architectural correction.
**Boundary**: existing owners; no API, persistence or application screen changes.
**Creates**:
- `shared/services/__tests__/TitleExtractionService.test.ts`
**Modifies**:
- `domain-contracts/src/ticket/frontmatter.ts`
- `frontend/src/utils/ticketKeyPatterns.ts`
- `shared/services/WorktreeService.ts`
- `shared/services/TitleExtractionService.ts`
- `server/services/fileWatcher/PathWatcherService.ts`
- `shared/services/__tests__/WorktreeService.test.ts`
- `server/tests/unit/PathWatcherService.test.ts`
- `frontend/src/config/ticketCardBadges.test.ts`
- `frontend/src/components/SettingsModal.test.tsx`
- `frontend/src/components/MarkdownContent/useMarkdownProcessor.test.ts`
- `frontend/src/components/MarkdownContent/useMarkdownProcessor.ts`
- `frontend/src/components/TicketViewer/TicketViewer.test.tsx`
- `frontend/src/utils/markdownPreprocessor.ts`
- `frontend/src/utils/markdownPreprocessor.mdt265.test.ts`
- `package.json`
- `bun.lock`
- `docs/architecture/project-identity-and-worktrees.md`
**Deletes**: None.
**Must Not Touch**: cloud coordination, CLI, production preference policy.
**Exclude**: sanitizer weakening, runtime JSDOM, duplicate branch extraction.
**Anti-duplication**: use domain pattern body and WorktreeService branch parser.
**Duplication Guard**: real-hook rendering tests replace the copied pipeline.
**Re-plan Trigger**: supported-DOM probe cannot preserve markup/remove unsafe URIs.
**Verify**:
```bash
bun run fe:test
bun run --cwd shared jest --runInBand --testPathPattern='TitleExtractionService|WorktreeService'
bun run --cwd server jest --runInBand tests/unit/PathWatcherService.test.ts tests/PathWatcherService.file-creation.test.ts
bun run build:all
bun run validate:ts
```
**Observe**: the same focused shared/server tests exercise real watcher dispatch,
root mapping, removal and shared identity; rendering tests exercise the real hook.
**Done when**:
- [x] Red-to-green evidence recorded.
- [x] Full frontend suite, focused backend/shared tests, builds and lint pass.
- [x] Ownership and mutation scope reviewed.

Task 2 architecture coverage: 15 additional unique canonical paths plus three
already-owned paths; every path appears above, with zero orphan leaf paths.

### Task 3: Resolve architect review findings before commit

**Skills**: mdt-frontend
**Makes GREEN**: TEST-1, TEST-8 (C7, C8).
**Scope**: lifetime-owned watcher operations, Git metadata and documents-context restoration.
**Boundary**: existing owners; no new routing authority or public HTTP contract.
**Creates**:
- `docs/CRs/MDT-265/architect-review.md`
**Modifies**:
- `server/services/fileWatcher/PathWatcherService.ts`
- `server/tests/unit/PathWatcherService.test.ts`
- `shared/services/WorktreeService.ts` (stale comment only)
- `frontend/src/utils/markdownPreprocessor.ts`
- `frontend/src/utils/markdownPreprocessor.mdt265.test.ts`
- `docs/architecture/project-identity-and-worktrees.md`
**Deletes**: None.
**Must Not Touch**: cloud, CLI, production preference policy, runtime sanitizer.
**Exclude**: duplicate document resolvers, watcher-owned CRUD path routing.
**Anti-duplication**: shared branch parser and existing document resolver.
**Duplication Guard**: lifetime state belongs to PathWatcherService only.
**Re-plan Trigger**: owner docs require changing public contracts or persistence.
**Verify**:
```bash
bun test --isolate frontend/src/utils/markdownPreprocessor.mdt265.test.ts
bun run --cwd server jest --runInBand tests/unit/PathWatcherService.test.ts tests/PathWatcherService.file-creation.test.ts
bun run fe:test
bun run build:all
bun run validate:ts
```
**Observe**: deferred promises resolve after disposal without recreating watchers;
old cleanup preserves replacements; complete filenames resolve in documents view.
**Done when**:
- [x] Regression tests RED-to-GREEN.
- [x] Relevant suites, builds, typecheck and scoped lint pass.
- [x] Architect re-review accepts the corrections.
