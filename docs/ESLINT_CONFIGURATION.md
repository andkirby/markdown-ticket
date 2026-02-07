# ESLint Configuration

This repo uses flat ESLint config (`eslint.config.ts`) with per-workspace configs.

## Config Files

- Root/frontend: `eslint.config.ts`
- Server: `server/eslint.config.ts`
- Shared: `shared/eslint.config.ts`
- Domain contracts: `domain-contracts/eslint.config.ts`
- MCP server: `mcp-server/eslint.config.ts`

## Lint Command Model

- `npm run lint`: lint all areas (frontend + all workspaces)
- `npm run lint:frontend`: lint frontend/root `src/**`
- `npm run lint:server|lint:shared|lint:domain|lint:mcp`: lint one workspace
- `npm run lint:fix`: run `--fix` across all areas
- `npm run lint:frontend:fix|lint:server:fix|lint:shared:fix|lint:domain:fix|lint:mcp:fix`: fix one area

## Standards Applied

- Markdown ignored by default in all configs: `**/*.md`
- Test title casing is not forced to lowercase:
  - `test/prefer-lowercase-title: 'off'` for `*.test.*` / `*.spec.*`
  - This preserves BDD naming like `GIVEN/WHEN/THEN`
- `@typescript-eslint/no-explicit-any` is currently `warn`
- Lint scripts enforce strict output:
  - `--report-unused-disable-directives`
  - `--max-warnings 0`

## Import Rule for Shared Code

Root/frontend config enforces:

- Disallow relative imports like `../shared/**`
- Use alias imports instead: `@mdt/shared/*`

Reason: relative shared-source imports break TypeScript project reference expectations.

## Server `console` Policy

`server/eslint.config.ts` keeps `no-console` off only for:

- tests (`tests/**/*.ts`)
- dev tooling (`mcp-dev-tools/**/*.ts`)
- `routes/devtools.ts`

For normal server app code, `no-console` remains active.
