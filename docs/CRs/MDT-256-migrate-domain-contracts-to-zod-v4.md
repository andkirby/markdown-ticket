---
code: MDT-256
status: Proposed
dateCreated: 2026-10-22T00:00:00.000Z
type: Technical Debt
priority: High
---

# Migrate domain-contracts to Zod v4

> Gates [MDT-255](MDT-255-enforce-boundary-validation-with-ci-drift-gates.md) schema-writing phases (0→). Sequenced first: MDT-255 authors ~30 new boundary schemas; writing them in v3 idiom then re-auditing post-migration is double work. Evidence: [MDT-255/drift-tooling-research.md](MDT-255/drift-tooling-research.md) §"Zod 3→4 note".

## 1. Problem

- `domain-contracts` pins zod `^3.22.4` (resolves to 3.25.76) — the only real consumer (14 files, 217 tests). `shared` declares `^4.3.6` (phantom, cross-major). `mcp-server` declares `^3.22.4` (phantom until MDT-255 phase 1).
- Now is the minimum blast radius: one consumer package; MCP SDK accepts `^3.25 || ^4.0`; v3-only production API usage is **2 sites**.

## 2. Work items

1. `domain-contracts`: bump `zod` to `^4.6.x`; fix the two v3-only sites:
   - `src/config/schema.ts:21` — `errorMap` → v4 error customization (`error` option / `message`)
   - `src/app-config/schema.ts:207` — single-arg `z.record(...)` → `z.record(z.string(), ...)`; audit `.default({})` input/output split
2. Add **type-equality tests** (`Expect<Equal<HandWritten, z.infer<Schema>>>` under existing tsc) for the main entity/input schemas — created here, reused as MDT-255 CI gate 3 and future upgrade safety net.
3. Fix downstream tsc fallout from v4 inferred-type changes (`z.unknown()`/`z.any()` key optionality, `.default()` semantics) in server/mcp-server/frontend/cli — compile-time only, no runtime changes expected.
4. Dependency hygiene: delete `shared`'s phantom `zod ^4.3.6`; bump `mcp-server` to `^4` (becomes a real import in MDT-255 phase 1).
5. Update zod skills post-migration: `~/.agents/skills/zod` gets a "Targets Zod v3 (legacy)" header; `zod-validation-utilities` (v4, 2 known defects: `error.errors`→`.issues` at SKILL.md L184, missing `safeParseAsync` note) becomes the primary skill for new schema code.

## 3. Out of scope

- MDT-255 validation wiring (separate ticket, proceeds on v4 after this lands)
- `server/mcp-dev-tools`'s stale SDK copy pinning zod ^3.23 (dev sidebar; replace when touched next)
- Any schema semantics tightening — this is a version migration, not a policy change

## 4. Acceptance criteria

- [ ] `domain-contracts` builds + 217 tests green on zod ^4 (v3-only APIs fixed, not suppressed)
- [ ] Type-equality tests exist and pass for entity + input schemas
- [ ] `bun run validate:ts:all` clean across all consumers
- [ ] Lockfile shows one zod major (^4); zero phantom zod declarations
- [ ] No runtime behavior change (invalid inputs still fail the same way; only error-message internals may differ)
