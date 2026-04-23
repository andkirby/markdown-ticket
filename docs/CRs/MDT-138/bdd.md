# BDD: MDT-138

**Source**: [MDT-138](../MDT-138-add-dot-notation-namespace-system-for-sub-document.md)
**Generated**: 2026-03-12

## Overview

BDD scenarios for dot-notation namespace system. Users can organize related documents using filename patterns like `architecture.approve-it.md` which appear as nested tabs `[architecture >] [approve-it]`.

## Acceptance Strategy

| Journey | Scenarios | Coverage |
|---------|-----------|----------|
| Tab Display | 3 | BR-1, BR-3, BR-4 |
| Namespace Grouping | 2 | BR-2, BR-5 |
| Navigation | 1 | BR-6 |
| Real-time Updates | 2 | BR-7 |
| Coexistence | 2 | BR-8, Edge-3, Edge-4 |

## Test-Facing Contract Notes

### Tab Structure Selectors

```typescript
// Namespace tab with expansion indicator
const namespaceTab = '[data-testid="subdoc-tab-{namespace}"]'
const expandedIndicator = '[data-testid="tab-expansion-indicator"]'

// Sub-tabs within namespace
const subTab = '[data-testid="subdoc-subtab-{subkey}"]'

// Folder content indicator (gray slash)
const folderPrefix = '[data-testid="folder-prefix"]'
```

### URL Path Format

```
/prj/{code}/ticket/{ticket}/{type}.md              # root document
/prj/{code}/ticket/{ticket}/{type}.{semantic}.md   # dot-notation sub-document
/prj/{code}/ticket/{ticket}/{type}/{subfile}.md    # folder-based sub-document

Examples:
/prj/MDT/ticket/MDT-138/architecture.md           # root
/prj/MDT/ticket/MDT-138/architecture.approve-it.md # dot-notation
/prj/MDT/ticket/MDT-138/bdd/legacy.md             # folder-based
```

### SSE Event Contract

```typescript
// Event: subdocuments-updated
// Payload: { ticketKey: string, subdocuments: Subdocument[] }
// Expected latency: < 1000ms after file system change
```

## Execution Notes

- **Framework**: Playwright
- **Directory**: `tests/e2e/`
- **Command**: `npx playwright test tests/e2e/ticket/namespace.spec.ts`
- **Filter**: `--grep "namespace"`

---
*Trace projection: [bdd.trace.md](./bdd.trace.md)*
