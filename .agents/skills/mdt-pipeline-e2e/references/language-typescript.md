# TypeScript And JavaScript Reference

Prefer project docs and manifest scripts over these defaults.

## Detect

Use when the project has `package.json`, `tsconfig.json`, Bun/npm/pnpm/yarn
lockfiles, React/Vite/Next config, or `.ts`/`.tsx` sources.

## Discovery

- Inspect `package.json` scripts.
- Prefer workspace-level scripts for monorepos.
- Check project instructions for required package manager.
- If multiple package managers appear, follow the lockfile and docs.

## Common Commands

Use exact project scripts when available:

```bash
bun run build
bun run test
bun run lint
npm run build
npm test
npm run lint
pnpm build
pnpm test
pnpm lint
```

## Review Focus

- Type safety gaps: `any`, unsafe casts, unchecked JSON, nullable values.
- Async bugs: unawaited promises, stale closures, timer/listener leaks.
- API boundary drift between frontend, backend, shared packages, and generated types.
- React state ownership, effect dependencies, accessibility, and responsive behavior.
- Monorepo import boundaries and duplicated shared logic.
