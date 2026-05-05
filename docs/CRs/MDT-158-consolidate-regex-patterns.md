---
code: MDT-158
status: Implemented
dateCreated: 2026-05-04T16:49:57.625Z
type: Technical Debt
priority: Medium
phaseEpic: Backlog
---

# Consolidate duplicated regex patterns into domain-contracts

## Problem

Project code and ticket key regex patterns are duplicated across 8+ files with subtle inconsistencies. Some allow digits as first char, some don't; some enforce length limits, some don't. This causes bugs like simplified ticket keys (`MDT-42`) not matching zero-padded storage (`MDT-042`).

## Current State

### Canonical patterns (domain-contracts)
- `PROJECT_CODE_PATTERN = /^[A-Z][A-Z0-9]{1,4}$/` — `domain-contracts/src/project/schema.ts`
- `CR_CODE_PATTERN = /^[A-Z][A-Z0-9]{1,4}-\d{3,4}$/` — `domain-contracts/src/ticket/frontmatter.ts`

### Duplicated/inconsistent patterns to eliminate
1. `shared/utils/constants.ts` — `PATTERNS.PROJECT_CODE = /^[A-Z0-9]{2,5}$/` (allows leading digit, drifts from canonical)
2. `shared/utils/constants.ts` — `PATTERNS.TICKET_CODE = /^[A-Z0-9]{2,5}-\d{3,}$/` (unused in prod)
3. `shared/tools/ProjectValidator.ts` — inline `/^[A-Z][A-Z0-9]{1,4}$/` (dup of canonical)
4. `src/hooks/useQuickSearch.ts` — inline `/^([A-Za-z]{2,5})-(\d{1,5})$/i` (no alphanumeric support)
5. `src/hooks/useQuickSearch.ts` — inline `/^@([A-Za-z]{2,5}) (.*)$/i` (no alphanumeric support)
6. `server/services/TicketService.ts` — inline `/^([A-Za-z][A-Za-z0-9]*)-(\d+)$/i` (no length limits)
7. `cli/src/commands/delete.ts` — inline `/^[A-Z][A-Z0-9]*-\d+$/` (no length limits)
8. `server/tests/mocks/shared/utils/constants.ts` — stale mock

## Target State

4 regex patterns, all in `domain-contracts`:

| # | Name | Pattern | Purpose |
|---|------|---------|---------|
| 1 | `PROJECT_CODE_PATTERN` | `/^[A-Z][A-Z0-9]{1,4}$/` | Validate project code (existing) |
| 2 | `CR_CODE_PATTERN` | `/^[A-Z][A-Z0-9]{1,4}-\d{3,4}$/` | Validate CR code in storage (existing) |
| 3 | `TICKET_KEY_INPUT_PATTERN` | `/^([A-Z][A-Z0-9]{1,4})-(\d{1,5})$/i` | Parse user input (loose: case-insensitive, non-padded) |
| 4 | `PROJECT_SCOPE_INPUT_PATTERN` | `/^@([A-Z][A-Z0-9]{1,4})\s+(.*)$/i` | Parse @CODE query syntax |

## Scope

- Add patterns 3 & 4 to `domain-contracts`, export from index
- Replace all 8 inline/duplicated regexes with imports from domain-contracts
- Remove `PATTERNS.PROJECT_CODE` and `PATTERNS.TICKET_CODE` from `shared/utils/constants.ts`
- Update `keyNormalizer.ts` to import from domain-contracts instead of PATTERNS
- Remove stale mock in `server/tests/mocks/`
- Update unit tests to use canonical patterns

## Affected Areas

- `domain-contracts/` — add 2 new patterns
- `shared/` — remove PATTERNS, update keyNormalizer
- `server/` — update TicketService
- `src/` — update useQuickSearch
- `cli/` — update delete command
- `mcp-server/` — check for duplicates

## Verification

- All existing unit tests pass
- All existing E2E tests pass
- `bun run build` clean
