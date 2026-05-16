---
code: MDT-147
status: Implemented
dateCreated: 2026-04-05T15:23:16.553Z
type: Bug Fix
priority: Medium
---

# resolveCurrentProject falls through to parent when project is out of discovery range

## 1. Description

### Problem Statement
- `ProjectService.resolveCurrentProject()` detects a local `.mdt-config.toml` in CWD but finds no matching project in the global registry or auto-discovery results
- Instead of returning the detected project, the method silently falls through to path-containment matching, which resolves to the nearest parent project
- Tickets created in a sub-project with its own config get filed under the parent project's code and counter

### Current Behavior (Wrong)

```text
# Working directory: /projects/parent/docs/child-project/
# Has .mdt-config.toml with code=CH1
$ mdt-cli ticket create bug 'test'
Created PAR-006  # ← parent project code, wrong
```

### Expected Behavior

```text
$ mdt-cli ticket create bug 'test'
Created CH1-001  # ← local project code, correct
```

### Root Cause Analysis
Two contributing factors:
1. Scanner off-by-one: `ProjectScanner.scanDirectoryForConfigs()` returns at `maxDepth <= 0` before checking the boundary directory, so projects beyond depth 3 from search paths are never discovered
2. No fallback in `resolveCurrentProject()`: when detection finds a config but no matching project exists in `allProjects`, the method falls through to `isPathWithinProject()` which matches the parent

### Impact Assessment
- Tickets created in the wrong project namespace
- Counter pollution in parent project
- Users in deeply nested directories lose project isolation
- Affects both CLI and MCP (shared service)

## 2. Affected Areas
- `shared/` — `ProjectService.ts`, `project/types.ts`

## 3. Solution Analysis
Defense in `resolveCurrentProject()`: when `detectProjectContext()` finds a local config but no matching project in registry or auto-discovery, build a `Project` from the local config via `ProjectFactory.createFromConfig()`, register it as a minimal reference in the global registry, and return it with `outOfDiscoveryRange: true` in the context.

## 4. Acceptance Criteria
- [ ] Ticket created in out-of-range project directory uses the local project code, not the parent's
- [ ] Out-of-range project is auto-registered in `~/.config/markdown-ticket/projects/{id}.toml` as a minimal reference (Strategy 2 pattern)
- [ ] Subsequent operations in the same directory resolve without the fallback path (found in registry)
- [ ] `resolveCurrentProject` result context includes `outOfDiscoveryRange: true` for the first resolution
- [ ] Existing in-range projects continue to resolve normally (no regression)

## 5. Verification
- Manual: create a project beyond depth 3 from search paths, create a ticket, verify correct project code
- Automated: unit test for `resolveCurrentProject` with mocked detection returning out-of-range config
