# AGENTS.md — Writing CLI E2E Tests

Use repo-native CLI E2E tests here.

## Runner

- Run this suite with `bun test`.
- Keep tests in TypeScript and use the same repo helpers and process utilities as the other E2E slices.
- Treat these as black-box process tests for `mdt-cli`.

## Harness

- Use `@mdt/shared/test-lib` for temp dirs, isolated config, project factories, and process helpers.
- Run the built `mdt-cli` as a real child process.
- Assert on `stdout`, `stderr`, exit code, and resulting files.

## Structure

Prefer command folders over flat filenames:

```text
cli/tests/e2e/
  helpers/
  ticket/
    get.spec.ts
    list.spec.ts
    create.spec.ts
    attr.spec.ts
  project/
    current.spec.ts
    list.spec.ts
    get.spec.ts
    init.spec.ts
  smoke/
    cli-bootstrap.spec.ts
```

Rule:
- Use `cli/tests/e2e/{command}/{verb}.spec.ts` for canonical commands.
- Group tests by operator domain when that is clearer than raw argv shape.
  Example: `mdt-cli attr ...` belongs in `ticket/attr.spec.ts`.
- Keep shortcut coverage in the canonical command file.
  Example: `mdt-cli 12` belongs in `ticket/get.spec.ts`, not in a separate `shortcuts/` tree.
- Use flat `command-subcommand` names only for truly one-off cases. Default to folders.

## Scope

- One file should cover one operator journey.
- Test canonical commands first.
- Then add alias and shortcut cases in the same file when they resolve to the same behavior.
- Keep parser-only edge cases near the owning command, not in a global parser suite.

## Boundaries

- Reuse `shared/test-lib` fixtures rather than hand-rolling temp project setup.
- Keep the focus on real process execution, isolated projects, and observable CLI behavior.
- Prefer black-box assertions over internal implementation assertions.
