# Assessment: MDT-261

## Verdict

**Recommendation**: Option 2 — Redesign Inline.

## Feature Pressure

### Target Feature Needs
- One creation diagnostic across CLI, MCP, HTTP and CLI-backed native tools.
- One deterministic content policy shared by creation and staged validation.
- A distributable local hook that evaluates index content and fails explicitly when validation is unavailable.

### Current System Assumptions
- shared/services/TicketService.ts returns a Ticket; generation is in formatCRAsMarkdown, with templates selected by TemplateService.
- CLI has a diagnostics envelope but creation leaves it empty; MCP independently constructs template text.
- TemplateService has file-loaded and independent fallback templates. MDT-233 matches the fallback architecture instructions.
- plugins/_lib/mdt-tools.js already forwards optional body input for BB and DSH; both consume CLI output.
- HTTP ProjectController forwards the service creation result directly; frontend creation consumers currently treat it as a Ticket and require careful compatibility handling.
- The existing remote unchecked-task hook reads working-tree state; it is not an index-validation seam.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Healthy | Existing domain-contracts/shared/adapter ownership fits the feature |
| Extension Fit | Concerning | Need additive operation results and metadata propagation through each adapter |
| Dependency Fit | Healthy | Existing Git, Bun, schemas, Markdown parser and Lefthook are sufficient |
| Verification Fit | Concerning | CLI harness exists; staged-snapshot and cross-transport diagnostics need new coverage |
| Redesign Scope | Concerning | Template ownership and operation metadata require a bounded redesign within this ticket |

## Mismatch Points

### Creation result and adapters
- Current system assumes: a returned entity fully describes creation.
- Feature needs: successful creation plus actionable non-persisted metadata.
- Mismatch: adapters currently lose metadata or invent their own template message.
- Adjustment required: additive shared creation-result API preserving createCR compatibility, consumed at presentation boundaries.
- Scope: bounded.

### Templates and content inspection
- Current system assumes: file and fallback template text can evolve independently.
- Feature needs: generated instructions cannot evade inspection.
- Mismatch: checking only current template files misses the motivating regression.
- Adjustment required: one versioned template source/catalog, explicit markers for future generated instructions and conservative legacy recognition; separate pure detector from filesystem/template loading.
- Scope: bounded.

### Commit execution
- Current system assumes: working files can stand in for staged state.
- Feature needs: complete index snapshots, including project configuration, with safe path handling.
- Mismatch: partial staging and renames invalidate working-tree checks.
- Adjustment required: shared Git-index adapter plus thin CLI validation command; tracked Lefthook integration proven against the actual merged config.
- Scope: bounded.

## Dependency and Tooling Pressure

- New packages: none planned; use existing schema, TOML and Markdown support.
- Runtime/config impact: additive offline CLI validation capability; local hook wiring only initially.
- Testing/E2E impact: isolated process/Git fixtures and adapter contract tests; preserve existing creation results.
- Main risk introduced: false positives in quoted examples and loss of success metadata through transport transformations.

## Verification Gaps

- Preservation tests needed: legacy createCR return shape, HTTP creation response, MCP success semantics, CLI JSON/YAML validity and native raw-output preservation.
- E2E/contract drift risks: built CLI versus source helper; actual Lefthook merging; runtime-loaded versus packaged template availability.
- Safe-to-refactor now?: yes after acceptance examples and focused preservation tests are in place; do not touch unrelated cloud coordination internals.

## Recommendation

### Option 1: Integrate As-Is
Not selected: independent template sources and entity-only creation results need explicit redesign.

### Option 2: Redesign Inline
Selected: redesign the creation metadata and template-policy slice inside MDT-261. Scope already includes these changes; no additional product capability or prerequisite ticket is needed.

### Option 3: Redesign First
Not selected: no foundational runtime, storage, or cloud coordination replacement is required.
