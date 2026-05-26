# Assessment: MDT-155

## Verdict

**Recommendation**: Option 1 — Integrate As-Is

## Feature Pressure

### Target Feature Needs
- Use discovered subdocument metadata as the source-path authority.
- Tighten document-reference matching without changing link resolution rules.
- Preserve document classification for resolved and relative `.md#anchor` links.
- Keep MDT-152 quick-search tests outside this work.

### Current System Assumptions
- `SubDocument.filePath` is already the navigation source of truth for ticket subdocuments.
- `MarkdownContent` expects a source path relative to `ticketsPath`.
- Existing preprocessor protection handles markdown links and code before document auto-linking.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Healthy | Changes stay in existing TicketViewer and markdown preprocessor owners. |
| Extension Fit | Healthy | Existing helper patterns already recurse over subdocuments and resolve API paths. |
| Dependency Fit | Healthy | No package, runtime, or config changes are required. |
| Verification Fit | Healthy | Existing Bun tests cover TicketViewer and link processing. |
| Redesign Scope | Healthy | Local hardening only. |

## Mismatch Points

### TicketViewer sourcePath
- Current system assumes: selected API path can be interpolated back into a source path.
- Feature needs: discovered `SubDocument.filePath` must be used directly for subdocuments.
- Mismatch: interpolation silently drifts if API path formatting changes.
- Adjustment required: resolve the selected subdocument and pass its `filePath`.
- Scope: local.

### Document reference regex
- Current system assumes: `\S+\.md` is acceptable after link/code protection.
- Feature needs: only standalone relative markdown references should auto-link.
- Mismatch: broad matching can catch punctuation-heavy or URL-like tokens.
- Adjustment required: replace with a boundary-aware relative markdown-reference pattern.
- Scope: local.

### Link classification with anchors
- Current system assumes: `.md#anchor` hrefs and absolute ticket subdocument routes classify as documents.
- Feature needs: that behavior must remain explicit regression coverage.
- Mismatch: hardening can be completed while accidentally losing trace coverage for anchor classification.
- Adjustment required: preserve linkProcessor regression tests for relative and absolute document links with anchors.
- Scope: local.

## Dependency and Tooling Pressure

- New packages: none.
- Runtime/config impact: none.
- Testing/E2E impact: focused Bun frontend tests.
- Main risk introduced: over-tightening the regex and dropping valid relative references.

## Verification Gaps

- Preservation tests needed: TicketViewer sourcePath propagation, negative regex cases, `.md#anchor` classification, and existing frontend suite regression.
- E2E/contract drift risks: low; behavior is covered at component/unit level.
- Safe-to-refactor now?: yes.

## Recommendation

### Option 1: Integrate As-Is
Use when: current ownership is coherent and the change is local.
Architecture impact: minimal.

### Option 2: Redesign Inline
Use when: not needed.
Architecture must redesign: n/a.
Expected scope added: none.

### Option 3: Redesign First
Use when: not needed.
Reason redesign cannot wait: n/a.
Preferred path: n/a.
