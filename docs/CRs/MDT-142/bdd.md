# BDD: MDT-142

**Source**: [MDT-142](../MDT-142-fix-filewatcher-recursive-watching-worktree-exclus.md)
**Generated**: 2026-03-17

## Overview

BDD scenarios for filewatcher architecture improvements. This ticket focuses on two core capabilities:
1. **Subdocument SSE events in main project** - real-time updates for nested ticket files
2. **Subdocument SSE events in worktree** - same real-time behavior for worktree users

## Acceptance Strategy

| Scenario | Priority | Coverage | Context |
|----------|----------|----------|---------|
| subdocument_sse_event_main_project | High | BR-1.1, BR-1.4 | Main project |
| subdocument_sse_event_worktree | High | BR-1.1, BR-1.4, BR-1.2 | Worktree |
| worktree_add_auto_detects | High | BR-1.2 | Worktree auto-discovery |
| no_duplicate_events_worktree | High | BR-1.3 | Duplicate prevention |

## E2E Framework

- **Framework**: Playwright
- **Directory**: `tests/e2e/`
- **Command**: `bun run test:e2e`

## Test-Facing Contract Notes

### SSE Event Structure
Tests must verify the SSE event payload contains:
```typescript
{
  subdocument: {
    code: string,      // e.g., "architecture"
    filePath: string   // e.g., "MDT-095/architecture.md"
  },
  source: 'main' | 'worktree'
}
```

### Main Project Subdocument Tests
- Create subdocument in `docs/CRs/MDT-XXX/subdoc.md`
- Verify SSE event received with `source='main'`
- Verify UI updates without full refresh

### Worktree Subdocument Tests
- Create worktree for ticket
- Modify subdocument in worktree
- Verify SSE event received with `source='worktree'`
- Verify UI updates in main project

### Duplicate Event Prevention
- File exists in both main and worktree
- Modify file in either location
- Verify exactly ONE SSE event received

## Execution Notes

- Worktree scenarios require test isolation
- Consider serial mode for worktree setup/teardown
- SSE/WebSocket helpers may be needed for event verification

---
*Rendered by /mdt:bdd via spec-trace*
