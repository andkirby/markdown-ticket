# Configuration Defaults Architecture

## Investigation Finding

Use `domain-contracts` for contract-level configuration defaults.

`domain-contracts` is already the lowest shared package for schemas and validation. The frontend, server, shared package, CLI, and MCP can consume it without reversing dependencies. `shared` already imports `domain-contracts`, so putting config defaults in `shared` would either block frontend/direct contract usage or create pressure for circular imports.

## Recommended Boundary

| Default type | Owner | Reason |
|--------------|-------|--------|
| Global config defaults | `domain-contracts` | Already defined with global config schemas |
| User config defaults | `domain-contracts` | Already defined with user config schemas |
| Project document config defaults | `domain-contracts` | Part of local project config contract and needed by API/UI/runtime |
| Project identity defaults such as ticket path/start number | Prefer `domain-contracts`, migrate carefully from `shared` | They describe project config semantics, but are widely used today through `shared/utils/constants` |
| Runtime filesystem paths such as `CONFIG_DIR` resolution | `shared` or server runtime layer | Depends on environment/filesystem behavior, not pure config contract |
| Browser-only UI defaults | Frontend config helpers | Not backend contract unless promoted |

## Architectural Rule

If a default describes the shape or fallback value of a persisted configuration field, it belongs with the schema that validates that field. If a default depends on runtime environment, filesystem, process state, or UI-only browser behavior, it does not belong in `domain-contracts`.

## Required Change

Add project document defaults to the contract layer, for example:

```ts
export const PROJECT_DOCUMENT_CONFIG_DEFAULTS = {
  paths: [] as string[],
  excludeFolders: [] as string[],
  maxDepth: 5,
} as const
```

Then consume that value from:

- project config schema defaults
- server config loading fallback
- document tree builder fallback
- configuration API metadata
- UI reset-to-default behavior
- docs/OpenAPI examples

## Decision

Do not create a generic defaults bucket in `shared`. Use `domain-contracts` for config-contract defaults and keep runtime-only defaults in runtime-owned modules.
