---
code: MDT-155
status: Approved
dateCreated: 2026-04-30T21:25:57.990Z
type: Feature Enhancement
priority: Medium
---

# Harden MDT-150 sourcePath construction and regex safety

## Problem

MDT-150 implementation review identified hardening concerns before final ship:

1. **sourcePath string interpolation is fragile** — TicketViewer constructs sourcePath via `${code}/${selectedPath}.md` instead of using `subdocument.filePath` directly. If the API path format changes, this breaks silently.

2. **convertDocumentReferences regex is broad** — `((?:\.\.\/|\.\/)*[^\s]+\.md(?:#\S+)?)` could match `.md` references that slip through code-block protection edge cases. Should be tighter.

3. **MDT-152 RED test files pollute MDT-150 diff** — `useQuickSearch.test.ts` and `modal.spec.ts` contain failing tests for MDT-152 that are mixed into the MDT-150 branch. They should be on a separate branch to keep the MDT-150 diff clean.

4. **Resolved ticket subdocument links with anchors are classified as broken** — Markdown such as `[BR-1.3](requirements.trace.md#br-13)` is a normal same-ticket subdocument link. The preprocessor resolves it to an app route like `/prj/MDT/ticket/MDT-175/requirements.trace.md#br-13`, but `linkProcessor` only recognizes `/prj/<project>/ticket/<ticket>#anchor` and bare `.md` links without anchors. The rendered link is then treated as unknown/broken even though both the target subdocument and heading anchor exist.

## Affected Areas

- `src/components/TicketViewer/index.tsx`
- `src/utils/markdownPreprocessor.ts`
- `src/utils/linkProcessor.ts`

## Scope

**In scope:**
- Use `subdocument.filePath` for sourcePath construction
- Tighten `convertDocumentReferences` regex
- Classify absolute ticket subdocument routes with optional heading anchors as document links
- Preserve `.md#anchor` document classification for relative markdown links
- Separate MDT-152 test files onto their own branch

**Out of scope:**
- Any changes to resolution logic itself
- Reworking SmartLink rendering behavior
- Adding security or file-existence validation to SmartLink

## Acceptance Criteria

- [ ] sourcePath is constructed from `subdocument.filePath` (not string interpolation)
- [ ] `convertDocumentReferences` regex doesn't over-match
- [x] `[label](requirements.md#section)` and `[label](requirements.trace.md#section)` render as working same-ticket subdocument links
- [x] Resolved routes shaped `/prj/<project>/ticket/<ticket>/<subdocument>.md#section` classify as document links, not broken links
- [x] Relative `.md#section` hrefs preserve the anchor during classification
- [ ] MDT-152 test files are not in the MDT-150 diff
- [ ] All 77+ existing tests still pass
