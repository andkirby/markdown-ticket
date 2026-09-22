# Skills Reference

Skills recommended for this project, grouped by task. Entries must match the
skills actually available in your session — when a skill is added, renamed, or
removed, update this file in the same change.

**Where skills live:** `repo` = tracked under `.agents/skills/` (allowlisted in
`.gitignore`, ships with every clone) · `local` = `.agents/skills/` on this
machine only · `global` = user-level skill directory.

## MDT Workflow & Tickets

| Skill | Lives | Use when |
|-------|-------|----------|
| `mdt` | global | The MDT workflow entry point: creating/updating CRs or ADRs, any single stage (requirements, BDD, architecture, tests, tasks, UAT, implement), and end-to-end lifecycle orchestration via its bundled `mdt:pipeline-e2e` — subsumes the retired standalone `mdt-pipeline*` skills |
| `mdt-cli` | global | Quick terminal lookups of tickets/projects; prefer over MCP for single-entity reads |
| `rename-cr` | local | Renaming a ticket key with validation and reference updates |
| `idea-intake` | local | Triaging a raw idea ("what if we…") before it becomes committed work |
| `mdt-release` | local | Publishing a release to GitHub |

## Frontend

| Skill | Lives | Use when |
|-------|-------|----------|
| `mdt-frontend` | repo | Any work in `frontend/src/` — STYLING.md patterns, CSS layering, modal conventions, semantic-class rules, build checks |
| `frontend-react-component` | global | Designing or refactoring React components |
| `shadcn` | local | Adding, fixing, debugging, or composing shadcn/ui components |
| `frontend-design` | global | Aesthetic direction for new UI (typography, visual identity, avoiding templated defaults) |

## Design & UX

| Skill | Lives | Use when |
|-------|-------|----------|
| `ux-designer-specifier` | global | Writing or reviewing UX specs, mockups, state tables, composition diagrams |
| `mdt-ux-designer` | local | MDT-specific design context; pairs with `ux-designer-specifier` |
| `wireframe` | local | Rendering wireframes/mockups from Markdown via wiremd |
| `product-intent` | global | Clarifying product intent, actors, and MVP boundaries before design |
| `information-architect` | global | Defining or auditing cross-surface information architecture |

## Testing & Verification

| Skill | Lives | Use when |
|-------|-------|----------|
| `test-all` | local | "Run all tests" / monorepo-wide pass-fail report |
| `fix-eslint` | local | Lint failures or rule cleanup across MDT packages |
| `playwright-cli` | global | Writing E2E tests, browser automation |
| `spec-trace-cli` | global | Ticket traceability: scenarios, BR coverage, stage validation |
| `debug-mermaid` | global | A Mermaid diagram shows "Syntax error in text" in the UI |
| `validation-protocol` | global | Recording proven runtime workflows into DEBUG.md |
| `web-perf` | global | Core Web Vitals / rendering performance audits |

**Project E2E docs:** See [tests/AGENTS.md](../tests/AGENTS.md) and
[tests/e2e/AGENTS.md](../tests/e2e/AGENTS.md) for project-specific conventions.

## Quality & Review

| Skill | Lives | Use when |
|-------|-------|----------|
| `code-review` | global | Verify-only review of diffs, commits, or another agent's work with PASS/FAIL evidence |
| `torvalds-doctrine` | global | Adversarial review passes (data-structure-first, proof over hand-waving) |
| `controlled-refactor` | global | Behavior-preserving refactors with scope, evidence, and authorization gates |
| `commit` | global | Preparing conventional commits and staging (repo rule: no AI attribution) |
| `security-best-practices` | local | Explicitly requested security reviews (auth, config, cloud surfaces) |

## Documentation

| Skill | Lives | Use when |
|-------|-------|----------|
| `documentation-onboarding` | global | Bootstrapping or repairing the durable documentation system |

Not sure which skill fits? `find-skills` (global) discovers and installs skills
by task.
