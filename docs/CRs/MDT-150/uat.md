# UAT Refinement Brief — MDT-150

## Objective

Close the documents-view resolution gap. MDT-150 shipped relative `.md` link resolution for the **ticket view** but never extended it to the **documents view**. Symptom: a relative link like `[x](relative.md)` in a document at `/prj/ABC/documents?file=docs/architecture/aaaa.md` renders as a raw relative href that the browser resolves against the URL root, producing `/prj/ABC/documents/relative.md` (broken — drops the source directory).

## Approved Changes

1. **Requirement BR-1 refined**: The relative `.md` resolution obligation now explicitly applies in **both** ticket and documents views, resolving against the source document's directory in the documents-view case.
2. **New requirement BR-5 added**: `resolveDocumentRef` must accept a source context anchored to either `ticketsPath` (ticket view) or the documents root (documents view), and must route documents-view resolutions to `/prj/:code/documents/:path` — never to a ticket subdoc URL.
3. **New scenario `documents_view_relative_reference`** added to BDD (covers BR-1, BR-5).
4. **Architecture addendum**: `DocumentsView/MarkdownViewer.tsx` added to module boundaries as **Modified**. `resolveDocumentRef` gains a documents-mode branch, auto-detected via `sourcePath` not matching `^[A-Z]+-\d+/`. No new mode parameter — form is inferred from path shape.
5. **Tasks rebuilt as current remaining work**: Historical Tasks 1–4 (shipped in `fe8613c9`, hardened by MDT-155) marked `done` in `.tasks-status.yaml`. Two new pending tasks: `TASK-documents-view-resolve` and `TASK-regression-lock`.
6. **Tests expanded**: 2 new unit tests (`TEST-preprocessor-documents-mode`), 1 new E2E (`TEST-e2e-documents-relative-link`). C5 regression scope clarified — documents-mode branch must be additive, ticket-mode branches unchanged.

## Changed Requirement IDs

| ID | Change | Identity |
|----|--------|----------|
| BR-1 | Refined: relative resolution applies in both ticket and documents views | refine_in_place |
| BR-5 (new) | New: resolver accepts both ticket-relative and documents-relative sourcePath | additive_change |
| C1–C5 | Unchanged (regression guards) | — |

## Affected Downstream Trace

| Stage | Changes |
|-------|---------|
| requirements | BR-1 refined, BR-5 added, R6 added, verification list extended |
| bdd | New scenario `documents_view_relative_reference`, resolution table extended |
| architecture | Addendum added, module boundary for `MarkdownViewer` added, new artifact `ART-documents-viewer`, new obligation `OBL-documents-viewer-sourcepath`, `OBL-preprocessor-resolve` refined to cover BR-5, invariant #4 added |
| tests | New test plans `TEST-preprocessor-documents-mode`, `TEST-e2e-documents-relative-link`; C3/C5 coverage extended |
| tasks | Rebuilt as current remaining work: 2 pending tasks (historical 4 marked done) |

## Execution Slices

### Slice 1: Documents-view resolution (TASK-documents-view-resolve, M1)

- **Objective**: Make relative `.md` references in documents-view markdown resolve against the source document's directory.
- **Direct artifacts/files**:
  - `src/components/DocumentsView/MarkdownViewer.tsx` (line ~214-219): add `sourcePath={selectedFile}` prop to `<MarkdownContent>`.
  - `src/utils/markdownPreprocessor.ts`: add documents-mode branch to `resolveDocumentRef`. Detection: `sourcePath` does not match `^[A-Z]+-\d+/`. Behavior: resolve href against sourcePath's directory using existing `resolveRelativePath`, route to `buildDocumentPathWithAnchor`.
- **Direct GREEN targets**: `TEST-preprocessor-documents-mode` (2 new unit tests), `TEST-e2e-documents-relative-link` (1 new E2E), `documents_view_relative_reference` (BDD scenario).
- **Impacted canonical task**: `TASK-documents-view-resolve`.
- **Why this slice exists**: Two-layer bug — (a) `MarkdownViewer` doesn't pass `sourcePath`, (b) `resolveDocumentRef` silently no-ops on documents-relative sourcePaths. Both must land together for any test to pass. ~30 lines of code.

**Proof target** (must pass before slice is done):
```bash
bun -e "
const { preprocessMarkdown } = require('./src/utils/markdownPreprocessor.ts')
const cfg = { enableAutoLinking: true, enableTicketLinks: true, enableDocumentLinks: true }
const out = preprocessMarkdown('see [x](relative.md)', 'ABC', cfg, 'docs/architecture/aaaa.md', 'docs/CRs')
console.log(out)
// expect: see [x](/prj/ABC/documents?file=docs%2Farchitecture%2Frelative.md)
// (URL format is ?file= because buildDocumentPath uses the established query-param
//  format consumed by DocumentsLayout; path-style output is out of scope.)
"
```

### Slice 2: Regression lock (TASK-regression-lock, M2)

- **Objective**: Verify the documents-mode branch is additive and did not regress ticket-mode resolution.
- **Direct artifacts/files**: None (test verification only; code touch only if a regression is found).
- **Direct GREEN targets**: `TEST-link-processor-regression`, `TEST-link-builder-regression`, `TEST-preprocessor-regression`, `TEST-link-normalization-resolution`.
- **Impacted canonical task**: `TASK-regression-lock`.
- **Why this slice exists**: C1–C5 are load-bearing constraints. The new branch runs *after* the ticket-mode branches in `resolveDocumentRef`, but only because sourcePath-form detection happens first — a subtle ordering dependency that needs explicit regression proof.

## Validation

- [x] `spec-trace validate MDT-150 --stage all` passes clean (run after each stage update)
- [x] All 5 trace projections re-rendered
- [x] Human-owned docs updated (requirements.md, bdd.md, architecture.md, tests.md, tasks.md)
- [x] `.tasks-status.yaml` synced (historical 4 marked done, 2 new pending)
- [x] Unit tests for documents-mode (6 new) — shipped
- [x] E2E test for documents-view relative link (1 new) — shipped
- [x] 61 existing unit tests remain GREEN — proof target for Slice 2 (verified: 67/67 GREEN)

## Watchlist

- **Detection rule fragility**: `^[A-Z]+-\d+/` correctly classifies `MDT-150/requirements.md` as ticket-mode and `docs/architecture/aaaa.md` as documents-mode. But a document stored *inside* a ticket folder and viewed via documents view (e.g. sourcePath = `docs/CRs/MDT-150/requirements.md` viewed as a generic document) would still be classified as documents-mode because the path doesn't start with the ticket key. Verify this is the desired behavior — I believe yes (if you're in documents view, you want documents-view resolution regardless of where the file lives).
- **`MarkdownViewer` prop chain**: `selectedFile` is already in component state (sourced from `useParams`), so passing it as `sourcePath` is one line. Confirm `selectedFile` is the project-relative path (`docs/architecture/aaaa.md`), not a URL-encoded or absolute variant.
- **Empty sourcePath case**: When documents view has no file selected, `selectedFile` is `null`. Passing `undefined` is safe — `resolveDocumentRef` already early-returns on falsy sourcePath. No new guard needed.
- **Anchor scrolling**: Path-style URLs would make `#fragment` scrolling work natively, but `?file=` URLs do not scroll reliably. This UAT does **not** fix anchor scrolling in documents view — it's a separate follow-up. The current slice only ensures the fragment is *preserved* in the resolved URL (BR-3), not that the browser scrolls to it.
- **C5 strictness**: The documents-mode branch is technically new code in `resolveDocumentRef`, which the original C5 framed as "preprocessor unchanged". The refined C5 framing: "ticket-mode branches unchanged; documents-mode branch is additive". Make sure the regression tests reflect this — they should assert ticket-mode outputs specifically, not just "preprocessor output matches snapshot".

## Open Decisions

None unresolved. All architectural questions resolved during this UAT session:

- ~~Should `resolveDocumentRef` take an explicit `mode: 'ticket' | 'documents'` parameter?~~ **RESOLVED**: No. Form is detected from sourcePath shape. Adding a mode parameter would be enterprise sludge for a trivial dispatch (doctrine §6).
- ~~Should we migrate the documents URL scheme from `?file=` to path-style as part of this fix?~~ **RESOLVED**: No. Path-style routing already ships (BR-4, TASK-docs-path-route done). The bug is in link *resolution*, not URL *scheme*. URL scheme migration is a separate concern and out of scope.
- ~~Should `linkNormalization.ts` tests be rewritten for the new mode?~~ **RESOLVED**: No. `linkNormalization.ts` is unchanged. New tests live alongside existing MDT-150 preprocessor tests.

## Suggested Next Commands

- `mdt:implement MDT-150` — execute Slice 1 + Slice 2.
- `mdt:tech-debt MDT-150` — after implementation, if any drift surfaces.
- `mdt:reflection MDT-150` — final retrospective once the fix ships.

---

## Previous Round Reference (UAT Session 2, 2026-04-30)

The prior `uat.md` brief covered the architecture simplification (preprocessor resolves, SmartLink renders; `useParams`-only approach reverted in favor of sourcePath threading). That work shipped. Durable history for both prior sessions lives in `MDT-150-smartlink-doc-urls.md` Section 8.
