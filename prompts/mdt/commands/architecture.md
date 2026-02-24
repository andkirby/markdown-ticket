# MDT Architecture Design Workflow (v11)

Surface architectural decisions before implementation. Output is minimal but complete.

**Core Principle**: Capture decisions that matter. Skip ceremony that duplicates code.

## Skill Discovery

Check `AGENTS.md` for skills matching this workflow. If found, invoke via Skill tool before proceeding.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

## Output Location

| Mode | Output | Criteria |
|------|--------|----------|
| **Prep** (`--prep` flag) | `{TICKETS_PATH}/{CR-KEY}/prep/architecture.md` | Preparatory refactoring design |
| **Simple** | `## Architecture Design` in CR | Single component or tightly scoped change; fits cleanly as a CR section |
| **Complex** | `{TICKETS_PATH}/{CR-KEY}/architecture.md` | Multiple components, cross-module coordination, or needs a standalone artifact |

Don't pre-calculate complexity scores. Write the architecture, then decide where it goes based on scope.

## What Good Architecture Output Looks Like

**Must have**:
- Overview (2-3 sentences)
- Pattern name + why
- One canonical runtime flow per critical behavior
- One owner module per critical behavior (no duplicates)
- Structure (file tree)
- Scope boundaries per module
- Runtime vs test scaffolding separation
- Architecture invariants
- Extension rule

**Include only if needed**:
- Build vs Use decisions (if evaluated)
- Component diagram (if >3 components with non-obvious relationships)
- Runtime prerequisites (if external deps exist)
- Error philosophy (if non-trivial failure modes)

**Never include**:
- Requirement-to-component mapping tables (code is the mapping)
- Implementation code snippets (they drift from reality)
- Bug fix history (git tracks this)
- Exhaustive domain alignment tables (2-3 key concepts max)

## Execution Steps

### Step 0: Detect Mode

Check for `--prep` flag in `$ARGUMENTS`. If present, mode is `prep`.

### Step 1: Load Context

1. `mdt-all:get_cr` with `mode="full"` — abort if CR doesn't exist
2. Load optional context if exists:
   - `{TICKETS_PATH}/{CR-KEY}/poc.md` — use validated decisions directly
   - `{TICKETS_PATH}/{CR-KEY}/requirements.md` — understand scope (don't map exhaustively)
   - `{TICKETS_PATH}/{CR-KEY}/bdd.md` — if it reports `framework: "none"` for UI/API behavior, decide E2E approach in Key Dependencies or mark as Decision Needed
   - `{TICKETS_PATH}/{CR-KEY}/domain.md` — respect aggregate boundaries
   - `{TICKETS_PATH}/{CR-KEY}/domain-audit.md` — **PRIMARY for prep mode** (structural diagnosis)
3. If requirements.md exists, extract constraint IDs (C1, C2...) and carry them into architecture sections
4. Extract from CR: problem, affected files, new files, scope
5. If the CR has a References section, read those docs for authoritative context (API specs, interface definitions, roadmaps). These may specify scope details (endpoints, methods, contracts) not captured in the CR description.
6. Check project CLAUDE.md for conventions
7. If `{TICKETS_PATH}/{CR-KEY}/architecture.md` already exists, read it as context — but the output **replaces it entirely**. Never append to or merge with an existing architecture document.

### Step 2: Identify Decisions

**2.1 Check what's already decided in CR**

Read CR Section 2 (Decision) and Section 3 (Alternatives). Don't re-evaluate these.

**2.2 Build vs Use (for sizable capabilities)**

| Capability | Build | Use Existing | Decision |
|------------|-------|--------------|----------|
| {capability} | {effort} | {package + fit} | {Build/Use: why} |

Only evaluate capabilities that are:
- Common solved problems (CLI parsing, HTTP, validation, dates)
- Would require non-trivial custom implementation
- Test infrastructure needs (E2E frameworks, mocking libraries, test runners) not already in the project
- Gaps surfaced by bdd.md test-strategy context (for example, `framework: "none"` on user-visible UI/API flows)

**2.3 Structural decisions**

Surface implicit choices:
- Single file vs multiple files?
- Where does logic live?
- How to extend later?

Present max 5 questions with recommendations.

**2.4 Canonical flow + ownership decisions (required)**

For each critical behavior:
- Define exactly one canonical runtime flow (single processing path).
- Assign exactly one owner module responsible for behavior logic.
- If multiple modules currently own the same behavior, choose one owner and mark merge/refactor as required.
- Identify any test-only helpers currently in runtime paths and plan extraction to test-only locations.

**2.5 Runtime bootstrap viability (required)**

Before finalizing Structure, verify the design includes what is required to execute the feature in this project context:
- Project/runtime manifest or equivalent dependency declaration
- Runtime/tooling configuration required by the chosen stack
- At least one concrete runtime entry path (for example: app entrypoint, route entrypoint, service entrypoint, or command entrypoint)

If any required bootstrap artifact is missing, include it explicitly in **Structure** and (when relevant) **Runtime Prerequisites**.

### Step 3: Generate Architecture

Write the architecture as a **complete, self-contained document** using the output template. Only include sections defined in the template — do not invent additional sections. Each `##` heading appears exactly once.

---

## Output Template

```markdown
# Architecture: {CR-KEY}

**Source**: [{CR-KEY}](../{CR-KEY}.md)
**Generated**: {YYYY-MM-DD}

## Overview

{2-3 sentences: what this achieves, key constraint, design philosophy}

## Constraint Carryover

{If requirements exist, list constraint IDs and where they are enforced in architecture}

| Constraint ID | Enforcement |
|---------------|-------------|
| C1 | Runtime Prerequisites / Error Philosophy |
| C2 | Module Boundaries |

## Pattern

**{Pattern name}** — {why it fits}

## Canonical Runtime Flows

| Critical Behavior | Canonical Runtime Flow (single path) | Owner Module |
|-------------------|--------------------------------------|--------------|
| {behavior} | {entry -> orchestration -> state transition -> output} | `{path}` |

Rules:
- One behavior = one canonical flow
- One behavior = one owner module
- No duplicate owners

## Alternatives (if proposing simplifications)

Use this section only when suggesting a simpler implementation that would change a requirement. Mark as **Decision Needed** and list tradeoffs. Do not change requirements without explicit approval.

## Key Dependencies

{Only if Build vs Use decisions were made. Include runtime + dev dependencies (for example E2E frameworks and test tooling)}

| Capability | Decision | Scope | Rationale |
|------------|----------|-------|-----------|
| {capability} | {package or "Build custom"} | {runtime/dev} | {one line why} |

{Or omit section entirely if no significant decisions}

## Runtime Prerequisites

{Only if feature depends on external configuration, tools, or services}

| Dependency | Type | Required | When Absent |
|------------|------|----------|-------------|
| `{ENV_VAR}` | env var | {Yes/No} | {concrete behavior} |
| `{tool}` | CLI tool | {Yes/No} | {concrete behavior} |

## Test vs Runtime Separation

| Runtime Module | Test Scaffolding | Separation Rule |
|----------------|------------------|-----------------|
| `{src/path}` | `{test/path}` | {what must stay out of runtime} |

## Structure

```
{project_root}/
  ├── {runtime/bootstrap artifacts: manifest, config, entrypoints}
  └── {source_dir}/
      ├── {runtime source tree, 5-15 entries total across both levels}
```

## Module Boundaries

| Module | Owns | Must Not |
|--------|------|----------|
| `{path}` | {responsibility} | {out of scope} |

## Architecture Invariants

- `one transition authority`: exactly one module decides state transitions for each critical behavior.
- `one processing orchestration path`: each critical behavior has exactly one runtime orchestration path.
- `no test-only logic in runtime files`: test scaffolding, fixtures, and test adapters stay outside runtime modules.

## Error Philosophy

{Only if non-trivial failure handling}

{1-3 sentences describing the error handling approach, not a table of every scenario}

If specifying silent degradation, state exactly what the user sees in the degraded state. The degraded state must not be worse than pre-feature behavior.

Example: "Detection failures return undefined and do not add a language constraint. Output follows the user's input language as before the feature."

## Extension Rule

To add {X}: {concrete steps and boundary}

---
*Generated by /mdt:architecture*
```

**That's it.** No component boundary tables, no requirement coverage matrices, no implementation notes with code blocks.

---

## Output Location Decision

After writing:
- **Prep mode**: Always save to `{TICKETS_PATH}/{CR-KEY}/prep/architecture.md`
- **Embed**: Use CR section for concise, single-scope architecture
- **Extract**: Save to `{TICKETS_PATH}/{CR-KEY}/architecture.md`, add summary link in CR when multi-component or cross-module

## CR Summary (when extracting)

```markdown
## Architecture Design

See [architecture.md](./{CR-KEY}/architecture.md)

- **Pattern**: {name}
- **Key constraint**: {most important limit}
- **Extension**: {one-liner}
```

## Save

**Prep mode**: Write to `{TICKETS_PATH}/{CR-KEY}/prep/architecture.md` (creates `prep/` directory)

**Embed**: `mdt-all:manage_cr_sections` to insert after Section 2

**Extract**: Write file, then add summary link to CR

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Requirement mapping tables | Let code be the mapping |
| Code snippets in architecture | Describe intent, not implementation |
| Every error scenario in a table | State the error philosophy in prose |
| Domain alignment for every concept | Mention 2-3 key aggregates if relevant |
| "Bug fixes" or "Refinements" sections | Architecture describes target state only |
| Component tables repeating the file tree | File tree with comments is enough |

## Quality Check

Before saving, verify:
- [ ] Each `##` heading appears exactly once — no duplicate sections
- [ ] Only sections from the template are present — no invented sections
- [ ] Overview is 2-3 sentences (not a paragraph)
- [ ] Canonical Runtime Flows exists and each critical behavior has exactly one flow
- [ ] Each critical behavior has exactly one owner module (no duplicate owners)
- [ ] Structure shows concrete paths (not abstract names), 5-15 entries
- [ ] Structure comments enumerate the public interface (endpoints, methods, exports) — not vague labels
- [ ] Structure includes required runtime/bootstrap artifacts (manifest/config/entrypoints) when the feature must be executable
- [ ] Error Philosophy is prose (not a table of every scenario)
- [ ] No code snippets anywhere (describe intent, not implementation)
- [ ] Runtime prerequisites defined (if external deps exist)
- [ ] Test vs Runtime Separation explicitly lists runtime modules and test scaffolding boundaries
- [ ] Architecture Invariants section is present and concrete
- [ ] Constraint IDs from requirements are carried into sections (or explicitly N/A)
- [ ] If bdd.md reports `framework: "none"` for user-visible UI/API behavior, architecture includes an explicit E2E decision (Key Dependencies or Alternatives as Decision Needed)
- [ ] Examples and wording are framework-agnostic unless CR scope explicitly requires a specific stack

## Completion

**Prep mode**:
```markdown
## Prep Architecture Complete

**CR**: {CR-KEY}
**Output**: prep/architecture.md

**Next**: `/mdt:tests {CR-KEY} --prep`
```

**Feature mode**:
```markdown
## Architecture Complete

**CR**: {CR-KEY}
**Output**: {CR section | architecture.md}

**Pattern**: {name}
**Key constraint**: {most important}

**Next**: `/mdt:tests {CR-KEY}`
```

Context: $ARGUMENTS
