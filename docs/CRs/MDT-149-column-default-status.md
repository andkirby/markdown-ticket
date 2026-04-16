---
code: MDT-149
status: Proposed
dateCreated: 2026-04-06T12:34:31.558Z
type: Research
priority: Medium
---

# Formalize column-default status concept

## 1. Description

### Research Objective
Investigate whether the implicit "column default status" convention (`statuses[0]` in `BOARD_COLUMNS`) should be formalized as a named concept shared between the web UI, CLI, and domain contracts — enabling friendly CLI aliases like `status=done` → Implemented.

### Research Context
- Board drag-drop already uses `column.statuses[0]` as the implicit default when dropping a ticket onto a column (`src/components/Column/index.tsx:186`)
- The CLI's `STATUS_ALIASES` map (`cli/src/utils/aliases.ts`) normalizes input tokens to canonical values, but has no awareness of column semantics
- `BOARD_COLUMNS` in `src/config/statusConfig.ts` couples column labels to status arrays, but this is frontend-only
- There is no shared concept of "column name → default status" across the domain layer

### Scope
- **In scope**: Whether to extract a column-default-status concept into shared/domain-contracts; how CLI friendly names should relate to it
- **Out of scope**: Implementing the feature itself; changing the board column model

## 2. Research Questions

| ID | Research Question | Success Criteria | Priority |
|----|-------------------|------------------|----------|
| RQ1 | Does the implicit `statuses[0]` convention hold everywhere, or are there edge cases? | Audit all consumers of BOARD_COLUMNS confirming first-element default | High |
| RQ2 | Should friendly aliases (`done`, `wip`, `backlog`) derive from a shared column config or remain CLI-only? | Clear recommendation with trade-off analysis | High |
| RQ3 | What is the minimal shared-domain change needed to support column-aware status resolution? | Concrete API surface (types, exports) proposal | Medium |
| RQ4 | Are there ambiguous column-name → status mappings that would require disambiguation? | List of conflicts with proposed resolution | Medium |

## 3. Validation Approach

### Research Method
- RQ1: Code analysis — grep all usages of `BOARD_COLUMNS`, `getColumnForStatus`, `statuses[0]` across all packages
- RQ2: Trade-off analysis — compare 3 options (CLI-only aliases, shared column config, domain-contracts enum extension)
- RQ3: API proposal — draft the minimal type/export changes needed
- RQ4: Collision analysis — enumerate all column labels against all statuses

### Data Sources
- `src/config/statusConfig.ts` (column definitions)
- `src/components/Column/index.tsx` (drop handler)
- `cli/src/utils/aliases.ts` (current normalization)
- `domain-contracts/` (canonical enums)

## 4. Acceptance Criteria

- [ ] RQ1 answered: audit of all `statuses[0]` usages confirms or denies the convention
- [ ] RQ2 answered: recommendation with trade-off table
- [ ] RQ3 answered: proposed shared API surface (or confirmed CLI-only is sufficient)
- [ ] RQ4 answered: list of ambiguous mappings with resolution strategy

### Decision Outcomes
- **If shared concept justified**: Create feature CR to extract column-default into domain-contracts, wire CLI aliases to it
- **If CLI-only is sufficient**: Create UAT refinement on MDT-143 to add friendly aliases to `STATUS_ALIASES`
- **If inconclusive**: Expand research with prototype in a branch

## 5. Dependencies & Next Steps

### Prerequisites
- Access to all three packages (src/, cli/, domain-contracts/)

### Next Steps After Research
- Positive: Feature CR or MDT-143 UAT refinement
- Negative: Close as "not needed"
