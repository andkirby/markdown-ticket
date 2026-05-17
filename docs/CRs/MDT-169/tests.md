# Tests: MDT-169

## Module -> Test Mapping

| Module | Test File | Test Plan |
|--------|-----------|-----------|
| `shared/services/filenameNamespace.ts` | `shared/tests/services/filenameNamespace.test.ts` | `TEST-shared-filename-namespace` |
| `shared/services/ticket/subdocuments/namespace.ts` | `shared/tests/services/ticket/namespace.test.ts` | `TEST-ticket-namespace-adapter` |
| `src/components/DocumentsView/documentFilenameTabModel.ts` | `src/components/DocumentsView/documentFilenameTabs.test.ts` | `TEST-document-filename-tabs-model` |
| `src/components/DocumentsView/DocumentFilenameTabs.tsx` | `src/components/DocumentsView/DocumentFilenameTabs.test.tsx` | `TEST-document-filename-tabs-component` |
| `src/components/DocumentsView/MarkdownViewer.tsx` | `src/components/DocumentsView/MarkdownViewer.test.tsx` | `TEST-document-metadata-presentation` |
| `src/components/shared/RelativeTimestamp.tsx` | `src/components/shared/RelativeTimestamp.test.tsx` | `TEST-document-metadata-presentation` |
| `server/services/DocumentService.ts` | `server/tests/api/documents.test.ts` | `TEST-document-content-path-safety` |
| Documents view integration | `tests/e2e/documents/filename-tabs.spec.ts` | `TEST-documents-filename-tabs-e2e` |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| First-dot split | `filenameNamespace`, ticket namespace adapter | base `some-name`, variant `alpha.beta` |
| Similar prefix isolation | document resolver | `some-name.one.md` does not group with `some-name-extra.one.md` |
| Root and variants | document resolver and E2E | `main`, `one`, `two`, `alpha.beta` reachable |
| Lone variant | document resolver | single dot-notation file still returns a grouped variant |
| Numeric-aware ordering | namespace helpers | `1`, `2`, `10`, `one`, `two` |
| Active physical path | component and E2E | clicking a tab returns/selects the tab file path |
| Shared metadata timestamp | `RelativeTimestamp`, Documents viewer | created/updated timestamp display, tooltip, floating wrapper, and sync badge use the ticket-view shared component/classes |
| Native document SSE tab reconciliation | E2E | document-change add/change/unlink refreshes filename tabs from the physical tree |
| Deleted active grouped file | E2E | removing active variant through document watcher refresh selects an available sibling |
| Nonblocking grouping resolution | E2E | document tree and filename tabs render while active content fetch is still pending |

## External Dependency Tests

| Dependency | Real Test | Behavior When Absent |
|------------|-----------|----------------------|
| Filesystem-backed document content | `TEST-document-content-path-safety`, `TEST-documents-filename-tabs-e2e` | Requests outside configured document paths are rejected; missing implementation remains RED |

## Constraint Coverage

| Constraint ID | Test Plan(s) |
|---------------|--------------|
| `C1` | `TEST-shared-filename-namespace`, `TEST-ticket-namespace-adapter` |
| `C2` | `TEST-shared-filename-namespace`, `TEST-ticket-namespace-adapter`, `TEST-document-filename-tabs-component` |
| `C3` | `TEST-document-filename-tabs-model`, `TEST-documents-filename-tabs-e2e` |
| `C4` | `TEST-document-filename-tabs-model`, `TEST-documents-filename-tabs-e2e` |
| `C5` | `TEST-shared-filename-namespace`, `TEST-ticket-namespace-adapter` |
| `C6` | `TEST-document-content-path-safety` |
| `C7` | `TEST-documents-filename-tabs-e2e` |
| `C8` | `TEST-document-filename-tabs-component`, `TEST-document-metadata-presentation`, `TEST-documents-filename-tabs-e2e` |
| `C9` | `TEST-document-filename-tabs-model`, `TEST-documents-filename-tabs-e2e` |
| `C10` | `TEST-document-metadata-presentation`, `TEST-documents-filename-tabs-e2e` |
| `C11` | `TEST-documents-filename-tabs-e2e` |
| `C12` | `TEST-document-metadata-presentation`, `TEST-documents-filename-tabs-e2e` |
| `Edge-3` | `TEST-documents-filename-tabs-e2e` |

## Behavior Coverage

| Behavior ID | Test Plan(s) |
|-------------|--------------|
| `BR-1.8` | `TEST-documents-filename-tabs-e2e` |

## Verify

```bash
bun run --cwd shared jest tests/services/filenameNamespace.test.ts tests/services/ticket/namespace.test.ts --runInBand
bun test src/components/DocumentsView/documentFilenameTabs.test.ts src/components/DocumentsView/DocumentFilenameTabs.test.tsx src/components/DocumentsView/MarkdownViewer.test.tsx src/components/shared/RelativeTimestamp.test.tsx
bun run --cwd server jest tests/api/documents.test.ts --runInBand
bunx playwright test tests/e2e/documents/filename-tabs.spec.ts --project=chromium
spec-trace validate MDT-169 --stage tests
spec-trace render tests MDT-169
```
