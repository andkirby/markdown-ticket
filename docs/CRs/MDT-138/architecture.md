# Architecture: MDT-138

## Overview
Dot-notation namespace system extends MDT-093 sub-document navigation. Files like `architecture.approve-it.md` appear as nested tabs under their parent namespace without creating directories. Backend parses filenames into virtual folders in the existing `subdocuments` API response.

## Design Pattern
**Pattern**: Virtual Folders

Dot-notation files are presented as virtual folders in the existing `subdocuments` array. Frontend renders them identically to folder-based subdocuments.

## Runtime Flow

```
File Watcher → DocumentService → parseFilename() → virtual folder
                                            ↓
                            SubDocumentTabs → render nested tabs
```

## Module Boundaries
| Module | Owner | Responsibility |
|--------|------|---------------|
| DocumentService | Backend | Parse dot-notation, create virtual folders |
| SubDocumentTabs | Frontend | Render nested tabs, handle sub-tab clicks |
| Document.ts | Shared | Type definitions for Subdocument, NamespacedSubdocument |

## Invariants
- Namespace parsing completes in < 10ms (C-1)
- Virtual folders maintain backward compatibility (C-4)
- Tab structure reflects current URL (C-6)
- Folder content displays with gray `/` prefix when coexisting (Edge-4)

- Sorting is alphanumerical within each namespace

## Extension Rule
To add new document types: extend `affectedDocumentTypes` array in `.mdt-config.toml` under `project.ticketSubdocuments`.

To add new namespace patterns: update `namespaceRules` configuration with parsing logic.

## URL Routing
| URL Pattern | Tab Display |
|--------------|-------------|
| `/prj/{code}/ticket/{ticket}/{type}.md` | `[{type}]` (single tab) |
| `/prj/{code}/ticket/{ticket}/{type}.{semantic}.md` | `[{type} >]` with `[{semantic}]` subtab |
| `/prj/{code}/ticket/{ticket}/{type}/{subfile}.md` | `[{type} >]` with `[{/subfile}]` subtab (gray `/`) |

---
*Trace projection: [architecture.trace.md](./architecture.trace.md)*
