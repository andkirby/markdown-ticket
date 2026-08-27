# UAT Refinement Brief — MDT-237 (2026-08-24)

## Objective
Fold user feedback from live verification into MDT-237: correct resolution of
project-root file references ('src/THEME.md') and make CONFIG_DIR/config.toml
link defaults actually reach the rendering pipeline.

## Approved Changes
1. **Project-root fallback (BR-2.4)** — inline-code refs that provably name an
   existing project file (per the document index) resolve to the documents
   route instead of a dead ticket-relative URL. Explicit '..' refs are never
   re-anchored. Relative path math remains the fallback when the index is
   unknown or the root file does not exist.
2. **Config merge (C6)** — getLinkConfig() now merges
   localStorage > config.toml [links] (/api/config/global) > defaults;
   useMarkdownProcessor and SmartLink re-render when globals arrive.

## Changed Requirement IDs
- Added: BR-2.4 (behavior), C6 (constraint)
- Unchanged: BR-1.1…BR-4.1, C1–C5, Edge-1

## Affected Downstream Trace
- requirements/bdd/architecture/tests/tasks re-validated (all stages clean) and re-rendered
- New test plans: TEST-unit-fallback, TEST-e2e-fallback, TEST-unit-config-merge
- New task: TASK-followup-fallback (done)

## Verification
- Unit: 940 pass / 0 fail (17 MDT-237 preprocessor + 4 cache cases)
- Lint + validate:ts clean
- E2E: 6/6 MDT-237 scenarios (incl. project-root fallback) + 4/4 adjacent regressions

3. **Non-.md passthrough (C7)** — LinkNormalizer (MDT-150 amendment): only .md is
   processed; every other allowed path passes through as a valid file link.
   The old extension allowlist flagged authored links like THEME.md's
   components/Badge/badge.css as broken ('Unsupported file type'). Traversal
   and configured-paths boundaries unchanged. Negative tests added in
   linkNormalization.mdt150.test.ts.

4. **Unique-basename disambiguation (BR-2.5, D10)** — a bare filename
   unverifiable relative to the source resolves to the only project file with
   that basename (THEME.md -> src/THEME.md); ambiguous names keep relative
   resolution. Basename map built once per index load — zero extra fetches.
5. **.html parity (C8)** — inline-code .html refs are processed exactly like
   .md (qualification, fallback, basename, documents-route rendering);
   classifyLink recognizes .html subdoc/document URLs.

6. **URL-bearing code spans (D11/C9)** — `git clone https://git.example.com/some/path`
   spans link ONLY the URL part — surrounding code stays a code span
   (ASCII-hostname guard: pseudo-URLs like https://… stay verbatim); fixed authoring bug where escaped backticks in
   artifacts turned code examples into plain text (assess.md restored).
7. **Plain-text .md favors real files** — plain-text tokens route to
   provably-existing project files (root/unique-basename) before the legacy
   relative wrap; legacy behavior is kept when the index has no positive
   knowledge (ticket-relative targets are unverifiable by design).

## Implementation Slices
Both changes implemented in this round; no remaining execution work.
