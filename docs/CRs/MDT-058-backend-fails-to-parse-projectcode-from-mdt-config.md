---
code: MDT-058
title: Backend fails to parse project.code from .mdt-config.toml for specific projects
status: Implemented
dateCreated: 2025-10-02T15:23:43.508Z
type: Bug Fix
priority: High
implementationDate: 2025-10-02T22:45:11.167Z
implementationNotes: Status changed to Implemented on 10/3/2025
---


# Backend fails to parse project.code from .mdt-config.toml for specific projects

# Backend fails to parse project.code from .mdt-config.toml for specific projects

## Description

The backend API returns `null` for `project.code` field for specific projects (`goto_dir` and `sentence-breakdown`) despite having valid `.mdt-config.toml` files with correct `code` values.

## Problem Statement

**Affected Projects:**
- `goto_dir` (should return `code: "GT"`)
- `sentence-breakdown` (should return `code: "SEB"`)

**Working Projects:**
- `markdown-ticket` (correctly returns `code: "MDT"`)
- `LlmTranslator` (correctly returns `code: "CR"`)
- `debug` (correctly returns `code: "DEB"`)

## Evidence

**Config files contain correct codes:**
```bash
$ cat ~/home/{sentence-breakdown,goto_dir}/.mdt-config.toml | grep code
code = "SEB"
code = "GT"
```

**Backend API returns null:**
```bash
$ curl -s http://localhost:3001/api/projects | jq '.[] | select(.id == "goto_dir" or .id == "sentence-breakdown") | {id, "project.code": .project.code}'
{
  "id": "goto_dir",
  "project.code": null
}
{
  "id": "sentence-breakdown",
  "project.code": null
}
```

## Impact

- **URL routing broken**: Shows `/prj/goto_dir` instead of `/prj/GT`
- **User experience**: Inconsistent project code display
- **Frontend workaround**: Requires hardcoded mappings (technical debt)

## Current Workaround

Temporary hotfix in `ProjectSelector.tsx`:
```typescript
const hotfixMap: Record<string, string> = {
  'goto_dir': 'GT',
  'sentence-breakdown': 'SEB'
};
```

## Investigation Needed

1. **Config parsing logic**: Why do some projects parse correctly while others don't?
2. **File permissions**: Check if there are permission differences
3. **TOML format**: Validate if there are subtle format differences
4. **Caching issues**: Verify if backend caches old project data
5. **Path resolution**: Check if project path affects config reading

## Acceptance Criteria

- [ ] `goto_dir` project returns `project.code: "GT"` from API
- [ ] `sentence-breakdown` project returns `project.code: "SEB"` from API
- [ ] All existing working projects continue to work
- [ ] Frontend hotfix can be removed
- [ ] URLs show correct project codes: `/prj/GT`, `/prj/SEB`

## Technical Notes

- Backend restart did not resolve the issue
- Config file formats appear identical between working/non-working projects
- No parsing errors visible in backend logs
- Issue discovered during MDT-017 URL routing implementation