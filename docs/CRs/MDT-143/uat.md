# UAT Refinement Brief

**Ticket**: MDT-143
**Round**: 2026-04-14 (r5)

## Objective

When creating a ticket via `mdt-cli ticket create --stdin`, the CLI-provided title must be the **sole authoritative H1** in the generated markdown file. Any H1 header present in the stdin content body must be stripped and replaced by the CLI title.

## Approved Changes

| # | Change | Reason | Impact |
|---|--------|--------|--------|
| 1 | `formatCRAsMarkdown()` now always emits `# {ticket.title}` as H1, regardless of whether `data.content` starts with `# ` | Content H1 was silently overriding the CLI title, producing incorrect ticket titles (e.g., `# 1. Description` instead of the user-provided title) | Behavior — write path only |

## Changed Requirement IDs

- **BR-6** — `refine_in_place`: Implementation bug fix only. The spec already states "Add H1 header with title" from the CLI parameter; the code was not honoring this when stdin content contained its own H1.

## Affected Downstream Trace

| Stage | Impact |
|-------|--------|
| requirements | None (BR-6 scope clarified, no text change) |
| bdd | None |
| architecture | None (write path in `TicketService.formatCRAsMarkdown`) |
| tests | Existing 503 shared + 400 server tests pass — no regression |
| tasks | None — single-point fix |

## Execution Slices

### Slice 1: Fix `formatCRAsMarkdown` write path ✅ DONE

- **Objective**: Ensure CLI title is always the H1, stripping any content H1
- **Artifacts**: `shared/services/TicketService.ts` — `formatCRAsMarkdown()` method
- **GREEN targets**:
  - `mdt-cli ticket create --stdin` with content starting `# 1. Description` → file H1 is the CLI title, not `1. Description`
  - `mdt-cli ticket create --stdin` with content that has no H1 → file H1 is the CLI title (no regression)
  - All existing tests pass
- **Impacted task IDs**: N/A (implementation fix)
- **Why**: Single-root-cause fix — the `if/else` branch that preserved content H1 was the only code path with the bug

## Validation

### Manual Test Evidence

```bash
# Test 1: Content with H1 — CLI title wins
$ printf "feature 'Align process lifecycle'\nalign-lifecycle" | \
  mdt-cli ticket create --stdin <<< '# 1. Description\n\nBody text.'
# Result: H1 = "Align process lifecycle" ✓ (was "1. Description" ✗)

# Test 2: Content without H1 — no regression
$ printf "bug 'Fix login'\nfix-login" | \
  mdt-cli ticket create --stdin <<< '## Problem\n\nLogin times out.'
# Result: H1 = "Fix login" ✓
```

### Automated Test Results

- **Shared**: 37 suites, 503 tests passed
- **Server**: 23 suites, 392 passed, 8 skipped

## Watchlist

- **MCP `create_cr` tool**: Shares `TicketService.createCR` → `formatCRAsMarkdown`, so the fix applies there too.
- **Frontend display**: `processContentForDisplay()` strips first H1 for UI rendering — already correct, no change needed.

## Open Decisions

None — fix is complete and verified.
