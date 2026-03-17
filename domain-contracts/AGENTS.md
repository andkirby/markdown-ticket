# domain-contracts

LLM helper for `/domain-contracts`.

## Purpose

This package is the canonical source of truth for shared contracts:
- runtime schemas
- exported TypeScript contract types
- boundary validation helpers
- test fixtures in `src/testing/`

## Best Practices

- 👍 Define schema first, then export the paired TypeScript type from the same module.
- 👍 Keep one owner for each canonical shape. Downstream packages should import or derive, not redeclare.
- 👍 Use explicit module roles when helpful:
  - `entity.ts` for normalized runtime shape
  - `input.ts` for create/update variants
  - `frontmatter.ts` for persisted or boundary format
  - `schema.ts` for the stable public barrel
  - `validation.ts` for `parse` / `safeParse` wrappers
- 👍 Derive variants with schema operations like `.pick()`, `.omit()`, `.partial()`, and `.extend()` instead of copying fields.
- 👍 Keep fixtures derived from the real contracts. `src/testing/*.fixtures.ts` must not become a second source of truth.
- 👍 Keep contracts pure: shape, validation, and naming only.

## Keep Out

- 👎 service logic
- 👎 filesystem or path policy
- 👎 controller or transport wrappers
- 👎 UI-specific defaults
- 👎 repo layout constants like `docs/CRs`

## Current Ownership

- `ticket/`: ticket contracts, including subdocuments
- `project/`: project, local-config, registry, and worktree contracts
- `types/`: shared primitives and enums
- `app-config/`: app and user config contracts
- `config/`: MCP-specific config contracts

## Change Flow

1. Update the canonical module in `src/{entity}/`
2. Update `validation.ts` if boundary helpers changed
3. Update `src/testing/*` fixtures
4. Build `domain-contracts`
5. Update downstream consumers to import or derive from the contract

## Verify

- `bun run --cwd domain-contracts build`
- `bun run validate:ts`
- `bun run build:all`
