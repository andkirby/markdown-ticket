# Architecture: MDT-147

## Overview

Defense-in-depth fix in `resolveCurrentProject()`: when `detectProjectContext()` finds a local `.mdt-config.toml` but no matching project exists in the global registry or auto-discovery results, the method now builds a `Project` from the local config, registers it as a minimal reference in the global registry, and returns it — instead of silently falling through to path-containment matching that resolves the parent project.

## Pattern

**Fallback Auto-Registration** — a guard clause between detection-match and path-containment. The existing flow is preserved; a new branch handles the "detected but unknown" state.

## Code Changes Required

Three changes, all in `shared/`:

| File | Change |
|------|--------|
| `shared/services/ProjectService.ts` | Add `ProjectFactory` import; insert fallback block after `existingProject` check in `resolveCurrentProject()` |
| `shared/services/project/types.ts` | Add `outOfDiscoveryRange?: boolean` to `ResolveCurrentProjectFoundContext` |
| `shared/services/project/__tests__/ProjectService.resolve.test.ts` | New test file covering the fallback path |

## Module Boundaries

- **ProjectService** owns the resolution logic and the new fallback branch
- **ProjectFactory** is used read-only (`createFromConfig()`) — no changes to factory
- **ProjectDiscoveryService** receives the `registerProject()` call — no changes to discovery
- **projectDetector** is untouched — detection already works correctly

## Canonical Runtime Flow

```
resolveCurrentProject(cwd)
  ├── detectProjectContext(cwd)     → found + projectRoot
  ├── getProjectConfig(projectRoot) → config
  ├── allProjects.find(by path)     → existingProject?
  │   ├── YES → return existing (unchanged)
  │   └── NO  → NEW: factory.createFromConfig() + register + return with outOfDiscoveryRange
  └── (path-containment fallback)   → unchanged for no-detection case
```

## Invariants

- One project per local `.mdt-config.toml` — the factory deduplicates by directory name
- Registry entry is Strategy 2 (minimal reference: path + metadata only)
- `clearCache()` is called after registration to ensure next `getAllProjects()` includes the new entry
- The `outOfDiscoveryRange` flag appears only on first resolution; subsequent calls find the project in registry

## Extension Rule

If nested project support is added later (e.g., `--project` flag), the fallback branch will be superseded by explicit project selection. The auto-registration behavior should remain as a safety net for unselected resolution.

> Architecture trace projection: [architecture.trace.md](./architecture.trace.md)
