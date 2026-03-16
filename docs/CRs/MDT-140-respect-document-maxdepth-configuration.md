---
code: MDT-140
status: Implemented
dateCreated: 2026-03-16T15:07:27.420Z
type: Bug Fix
priority: Medium
implementationDate: 2026-03-16
implementationNotes: Parsed project.document.maxDepth in the server config repository, propagated it through document discovery and path-selection tree building, fixed the API test mock import blocker needed for verification, and added regression coverage for config parsing plus /api/documents and /api/filesystem depth behavior. Verified with: bun run --cwd server jest server/tests/unit/ConfigRepository.test.ts server/tests/api/documents.test.ts server/tests/api/system.test.ts --runInBand
---

# Respect document maxDepth configuration

## 1. Description
### Problem
- `project.document.maxDepth` is part of the documented local config contract, but document discovery was not honoring it.
- Projects with shallow or deep document trees could not rely on configured scan boundaries.

### User Impact
- Expected nested documents could be missing when a project intended a deeper scan.
- Unwanted deeper documents could appear when a project intended a shallow scan.
- The configuration appeared valid while silently having no effect.

### Scope
- Respect `project.document.maxDepth` for project document discovery.
- Respect the same setting for path-selection tree generation.
- Preserve existing behavior when the setting is omitted.
- Keep global discovery depth behavior unchanged.
## 2. Rationale
### Why This Change Matters
- The shipped behavior should match the documented configuration contract.
- Per-project document depth is a separate concern from global project auto-discovery depth.
- Silent config drift is harder to debug than an explicit unsupported setting.

### Intent
- Make the configured depth effective without broadening the change beyond document-tree behavior.
## 3. Solution Analysis
### Considered Options
| Option | Decision | Reason |
|--------|----------|--------|
| Honor `project.document.maxDepth` in the document pipeline | Accepted | Matches the existing per-project contract with minimal scope. |
| Reuse global `discovery.maxDepth` | Rejected | Wrong scope; global discovery and document browsing solve different problems. |
| Leave the current default behavior in place | Rejected | Keeps a documented setting ineffective and misleading. |
## 4. Implementation Specification
### Outcome
- The project document depth setting is now treated as part of the effective runtime behavior for document browsing.
- The change remains limited to document-related tree generation.
- Default behavior is preserved when the setting is not present.

### Verification
- Unit coverage confirms the config value is parsed.
- API coverage confirms document discovery respects the configured depth.
- API coverage confirms path-selection trees respect the configured depth.
## 5. Acceptance Criteria
### Functional
- [x] `project.document.maxDepth` is parsed from `.mdt-config.toml` during document configuration loading.
- [x] Document discovery respects the configured `project.document.maxDepth` for project document paths.
- [x] Path selection tree generation respects the configured `project.document.maxDepth`.
- [x] Projects without `project.document.maxDepth` continue to use the current default scan depth.

### Non-Functional
- [x] Existing document discovery APIs remain backward-compatible for projects that do not set `project.document.maxDepth`.
- [x] Regression coverage exists for config parsing and document-tree depth behavior.
- [x] The fix does not change global project auto-discovery depth semantics.

### Edge Cases
- [x] Shallow depth configuration limits recursion to the configured boundary while keeping explicit top-level document paths available.
- [x] Invalid `project.document.maxDepth` values continue to follow existing validation behavior rather than being silently coerced.
- [x] Ticket directories remain excluded from documents view regardless of configured scan depth.