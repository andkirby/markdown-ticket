---
code: MDT-109
status: Proposed
dateCreated: 2025-12-28T19:13:17.813Z
type: Bug Fix
priority: Medium
---

# Fix document path configuration parsing in ConfigRepository and PathSelector

## 1. Description

### Requirements Scope
`brief` — Bug description + fix criteria

### Problem

- `ConfigRepository` line 38 checks `parsed.document?.paths` but TOML uses `[project.document]` table, so `parsed.project.document.paths` is never read
- `PathSelector` line 37 checks `data.config?.document?.paths` but API returns `config.project.document.paths`, so pre-selection fails
- Both issues prevent configured document paths from being recognized, causing 404 on `/api/documents` and unselected checkboxes in Edit modal

### Affected Artifacts

- `server/repositories/ConfigRepository.ts` (lines 37-47) - TOML parsing for document paths
- `src/components/DocumentsView/PathSelector.tsx` (line 37) - API response path access

### Scope

- **Changes**: Update path access patterns to match actual data structures
- **Unchanged**: All other config parsing, UI components, API endpoints

## 2. Decision

### Chosen Approach

Add `parsed.project?.document?.paths` and `data.config?.project?.document?.paths` as first options to check in respective access chains.

### Rationale

- TOML `[project.document]` table maps to `parsed.project.document.paths` in JavaScript
- API `/api/projects/{id}/config` returns `config.project.document.paths` structure
- Checking correct path first prevents fallback to legacy patterns that never match
- Maintains backward compatibility by keeping legacy paths as fallbacks

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Add correct path as first option | **ACCEPTED** - Fixes both issues with minimal change |
| Change TOML structure | Modify `.mdt-config.toml` to use `[document]` | Breaking change, affects all projects using current format |
| Change API response | Modify API to flatten `config.document.paths` | Would require updating all consumers of this API |

## 4. Artifact Specifications

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `server/repositories/ConfigRepository.ts:38` | Expression updated | Add `parsed.project?.document?.paths` as first option |
| `server/repositories/ConfigRepository.ts:44` | Expression updated | Add `parsed.project?.document?.excludeFolders` as first option |
| `src/components/DocumentsView/PathSelector.tsx:37-38` | Expression updated | Change to `data.config?.project?.document?.paths` |

## 5. Acceptance Criteria

### Functional

- [ ] `ConfigRepository._parseConfig()` reads paths from `[project.document]` TOML table
- [ ] `/api/documents?projectId=markdown-ticket` returns document tree (not 404)
- [ ] PathSelector checkboxes show pre-selected when Edit clicked
- [ ] Configured paths display correctly in Documents view

### Non-Functional

- [ ] No breaking changes to existing configurations using legacy formats
- [ ] No changes to API contracts or response structures

### Testing

- Unit: Mock TOML content with `[project.document]` table, verify `documentPaths` populated
- Integration: Call `/api/documents` endpoint, verify 200 response with document tree
- Manual: Click Edit in Documents view, verify configured paths are checked

## 6. Verification

### By CR Type

- **Bug Fix**: `/api/documents` returns 200 with document tree for project with `[project.document]` config; PathSelector shows checked paths on Edit

## 7. Deployment

- Simple npm restart required for backend (no migration needed)
- Frontend changes hot-reload via Vite