# CLI Package

## Architecture

The `cli/` package is a thin presentation shell over shared services (see root AGENTS.md "CLI Business Logic Boundary").

- Commands live in `src/commands/` — one file per action.
- Output formatting lives in `src/output/formatter.ts` — commands call formatter functions, never format inline.
- Shortcut normalization in `src/utils/args.ts` — rewrites known shortcut patterns before commander parses argv.

## Skill Contract

`cli/mdt-cli/SKILL.md` is the **canonical agent-facing reference** for CLI usage.

When adding or changing a command's interface (name, arguments, flags, aliases, or output format), **you must update `cli/mdt-cli/SKILL.md`** so that agents consuming the skill stay in sync with reality. This includes new commands, changed argument syntax, new shortcuts, and modified output formats.

## Build

```bash
bun run --cwd cli build    # TypeScript compile (required after code changes)
```

## Testing

See `cli/tests/e2e/AGENTS.md` for E2E test conventions.
