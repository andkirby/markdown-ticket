# Tests: MDT-182

**Source**: [MDT-182](../MDT-182-wireloom-annotation-toggle.md)
**Generated**: 2026-06-09

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `wireloomAnnotationToggle` | `src/utils/wireloomAnnotationToggle.test.ts` | 18 |
| E2E annotation toggle | `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` | 11 |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Annotation target position | `wireloomAnnotationToggle` | marker placed at correct SVG coordinates |
| Marker sequencing | `wireloomAnnotationToggle` | numbered 1, 2, 3... per block |
| Tooltip text content | `wireloomAnnotationToggle` | annotation body text displayed correctly |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `wireloomAnnotationToggle.test.ts` | compact mode does not expand SVG canvas |
| C2 | `wireloomAnnotationToggle.test.ts` | markers focusable with ARIA labels |
| C3 | `wireloomAnnotationToggle.test.ts` | malformed source shows error without toggle |
| C4 | `wireloomAnnotationToggle.test.ts` | missing Wireloom fallback has no toggle |
| C5 | `wireloomAnnotationToggle.test.ts` | compact mode persists through theme re-render |
| C6 | `wireloomAnnotationToggle.test.ts` | compact mode persists through fullscreen toggle |

## Verify

```bash
# Unit tests
bun test src/utils/wireloomAnnotationToggle.test.ts

# E2E tests (will fail until implementation)
bun run test:e2e -- tests/e2e/documents/wireloom-annotation-toggle.spec.ts
```

---
*Rendered by mdt:tests via spec-trace*
