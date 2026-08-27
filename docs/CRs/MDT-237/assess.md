# Assessment: MDT-237

## Verdict

**Recommendation**: Option 1 — Integrate As-Is

## Feature Pressure

### Target Feature Needs
- Inline-code spans (`path/to/doc.md`) in rendered markdown must become clickable, client-side navigable links to the referenced document
- Non-existent references must be visibly flagged; traversal/out-of-scope targets must be blocked — reusing MDT-150 scope rules
- Existing inline-code protection for genuine code (commands, flags, examples) must be preserved
- Works on already-authored documents with no reformatting required (render-side detection, not authoring convention)

### Current System Assumptions
- `src/utils/markdownPreprocessor.ts` owns all linkification: a protect → convert → restore pipeline where inline code is unconditionally protected (line 72-78, `protectInlineCode`) and restored verbatim (line 306-309)
- MDT-150 already implements `.md` reference resolution to absolute app URLs (`resolveDocumentRef`, line 169-258) with ticket-context and documents-view modes, anchor support, and traversal handling — but only for plain-text and existing markdown links
- Inline code is deliberately excluded from conversion (MDT-150/MDT-059 decision) — this CR narrows that exclusion to *genuine code*, not `.md`-shaped references
- Rendering uses Showdown; links use absolute URL paths produced by `src/routes.ts` builders (`buildTicketPath`, `buildTicketSubDocPath`, `buildDocumentPathWithAnchor`)

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Healthy | Change lives entirely inside the existing preprocessor seam; no ownership moves |
| Extension Fit | Healthy | `protectInlineCode` is the single insertion point; `resolveDocumentRef` is directly reusable |
| Dependency Fit | Healthy | No new packages, runtime, config, or tooling |
| Verification Fit | Healthy | Colocated unit tests exist (`markdownPreprocessor*.test.ts`, `linkNormalization.mdt150.test.ts`) and lock current behavior; new cases slot in beside them |
| Redesign Scope | Healthy | Local: one function gains a conditional branch; no redesign |

## Mismatch Points

### Inline code protection is unconditional
- Current system assumes: every inline-code span is genuine code and must survive verbatim
- Feature needs: spans whose *entire* content is a `.md` path (optionally with `#anchor`) are document references and should convert
- Mismatch: the exclusion rule is too broad for the new requirement
- Adjustment required: in `protectInlineCode`, test each span's content against the document-reference shape; convert qualifying spans via `resolveDocumentRef` (same resolution as plain-text refs) instead of placeholder-protecting them
- Scope: local

### False-positive risk (command/example `.md` paths)
- Current system assumes: protection is the only false-positive guard
- Feature needs: genuine code like `git mv old.md new.md` must stay verbatim
- Mismatch: a bare command word never matches the `.md` path shape, but a whole-span path like `README.md` inside a sentence about a command *would* convert
- Adjustment required: whole-span-content matching (the span must be *only* a path, not contain one) plus the same disambiguation semantics already accepted for plain-text refs; fenced code remains protected upstream
- Scope: local

### Non-existent document flagging
- Current system assumes: linkValidator (`src/utils/linkValidator.ts`) already skips inline code and validates rendered links against document scope
- Feature needs: converted links participate in the same validation/flagging as other document links
- Mismatch: none expected — converted inline-code refs become ordinary markdown links, so the existing validation surface applies unchanged
- Adjustment required: verify linkValidator's inline-code skip happens on raw markdown *before* conversion ordering, or operates on rendered HTML where spans no longer exist; align ordering
- Scope: local

## Dependency and Tooling Pressure

- New packages: none
- Runtime/config impact: none
- Testing/E2E impact: new colocated unit tests in `src/utils/`; optional Playwright spec under `tests/e2e/`
- Main risk introduced: false-positive conversions of `.md`-shaped inline code that the author intended as code — mitigated by whole-span matching

## Verification Gaps

- Preservation tests needed: existing `markdownPreprocessor` tests already lock fenced-code and inline-code behavior; add cases for (a) genuine-code spans preserved, (b) `.md` spans converted, (c) anchor fragments, (d) traversal/out-of-scope, (e) spaces/URL-encoded paths
- E2E/contract drift risks: low — link HTML shape unchanged
- Safe-to-refactor now?: yes (baseline: 919 fe tests pass, lint clean at HEAD dd68133)

## Recommendation

### Option 1: Integrate As-Is
Use when: the preprocessor seam and MDT-150 resolution already provide every capability the feature needs; the change is one conditional branch plus tests
Architecture impact: minimal — placement decision (inside `protectInlineCode` vs. a sibling pass) belongs to `mdt:architecture`

**Next**: `mdt:architecture MDT-237`
