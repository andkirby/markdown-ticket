# MDT BDD Specification Workflow (v2)

Generate BDD acceptance tests from requirements. Produce user-visible behavior tests that validate the system from the outside.

**Core Principle**: BDD tests specify WHAT the system does from the user perspective, independent of internal architecture. They are written before architecture decisions.

## Skill Discovery

Check `AGENTS.md` for skills matching this workflow. If found, invoke via Skill tool before proceeding.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it is not defined, read `ticketsPath` from `.mdt-config.toml`).

## Output Location

| Mode | Output |
|------|--------|
| Normal | `{TICKETS_PATH}/{CR-KEY}/bdd.md` + E2E test files (when executable framework exists) |
| Prep (`--prep`) | `{TICKETS_PATH}/{CR-KEY}/prep/bdd.md` + E2E test files (when executable framework exists) |

## Mode Detection

| Mode | Flag | Input Source | Test State | Purpose |
|------|------|--------------|------------|---------|
| Normal | (none) | requirements.md | RED (when executable) | Specify new behavior |
| Prep | `--prep` | existing system | GREEN (when executable) | Lock behavior before refactoring |

## Usage Guardrails

Use `/mdt:bdd` for:
- New or changed user-visible behavior
- Feature enhancements before architecture
- Prep behavior locking (`--prep`) before major refactoring

Do not use `/mdt:bdd` for:
- Pure technical refactoring with no user-visible behavior (use `/mdt:tests --prep`)
- Documentation-only work
- Internal-only changes with no user-visible impact

If this is a Feature Enhancement with user-visible behavior, BDD is required unless the user explicitly waives executable acceptance gating.

## Critical Rules

1. Write tests from user perspective only (no internal mechanics).
2. Do not assume architecture (no components/services/file-level details in scenarios).
3. Use Gherkin (`Given/When/Then`) syntax.
4. Keep focus on end-to-end interfaces (browser/API/CLI).
5. Enforce scenario budget:
   - normal: max 12 total, max 3 per journey
   - prep: max 8 total, max 2 per journey
6. Deduplicate aggressively; use `Scenario Outline` for mirrored variants.
7. If `framework: "none"`, generate spec-only output (no executable placeholders).
8. RED/GREEN execution state is required only when executable E2E framework exists.
9. Feature acceptance gate: executable BDD scenarios must be GREEN before completion (unless user waiver for spec-only mode).
10. Internal constraints belong in `/mdt:tests`, unless explicitly user-visible.
11. Tag scenarios with sub-requirement IDs (`BR-X.Y`), not only parent IDs.
12. Coverage honesty: do not claim coverage unless a scenario explicitly validates it.
13. No invented behaviors: if needed behavior is absent from requirements, stop and route to `/mdt:requirements` or `/mdt:clarification`.
14. Non-functional thresholds in BDD are opt-in: include only when requirements define measurable thresholds and acceptance method.

## Execution Steps

### Step 1: Detect Mode and Load Context

**1a. Detect mode**

```yaml
if "--prep" in ARGUMENTS:
  mode: "prep"
  output_dir: "{TICKETS_PATH}/{CR-KEY}/prep/"
  bdd_file: "{TICKETS_PATH}/{CR-KEY}/prep/bdd.md"
  scenario_budget:
    total_max: 8
    per_journey_max: 2
  test_expectation: "GREEN"  # executable tests must pass
else:
  mode: "normal"
  output_dir: "{TICKETS_PATH}/{CR-KEY}/"
  bdd_file: "{TICKETS_PATH}/{CR-KEY}/bdd.md"
  scenario_budget:
    total_max: 12
    per_journey_max: 3
  test_expectation: "RED"  # executable tests should fail until implemented
```

**1b. Load CR**

```text
mdt-all:get_cr mode="full"
```

Extract:
- CR title and type
- problem statement (user needs)
- scope (what changes)
- acceptance criteria

**1c. Normal mode input (requirements.md)**

```yaml
if mode == "normal":
  requirements_file: "{TICKETS_PATH}/{CR-KEY}/requirements.md"
  if not exists(requirements_file):
    warn: "No requirements.md found. Generating BDD from CR acceptance criteria."
    source: "CR"
  else:
    source: "requirements.md"
```

If requirements.md is missing and this is a Feature Enhancement with user-visible behavior, recommend `/mdt:requirements` first unless user explicitly waives.

**1d. Prep mode input (existing behavior)**

In prep mode, identify current user-visible behavior to preserve:
- UI flows in CR scope
- affected API endpoints
- impacted CLI commands
- user journeys touching changed code

**1e. Detect E2E framework**

Only browser/API automation frameworks qualify as E2E:

| Category | Examples | Qualifies? |
|----------|----------|------------|
| Browser E2E | Playwright, Cypress, Puppeteer, Selenium, WebdriverIO, TestCafe | Yes |
| API E2E | Supertest+app, Hurl, Bruno, k6 | Yes |
| BDD runners | Cucumber.js, behave (with E2E step defs) | Yes |
| Unit/integration runners | Jest, Vitest, Bun Test, Mocha, pytest, go test, cargo test | No |

Detection steps:
1. Check dependency manifests (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.).
2. Check E2E config files (`playwright.config.*`, `cypress.config.*`, `wdio.conf.*`, etc.).
3. Check E2E directories (`e2e/`, `tests/e2e/`, `cypress/`, `features/`, etc.).

If only a unit runner exists, set `framework: "none"`.

Record:

```yaml
e2e:
  framework: {framework name or "none"}
  directory: {path if known}
  pattern: {file pattern if known}
  command: {run command if known}
  filter: {optional CR-scoped filter, or "n/a"}
```

If no E2E framework is detected:
- Generate Gherkin specs only (Spec-Only mode)
- Set:
  - `framework: "none"`
  - `command: "n/a"`
  - `filter: "n/a"`
- Mark scenario status as `🟡 Spec-Only`
- Add follow-up note: `/mdt:architecture` should decide whether to add an E2E framework
- Do not invent framework-specific commands

**1f. Capture acceptance-gating waiver state**

Record a structured waiver flag in workflow state:

```yaml
acceptance_gating:
  executable_required: {true|false}
  waiver:
    granted: {true|false}
    reason: {text or "n/a"}
```

Rules:
- If executable framework exists, `executable_required: true` and waiver is normally `granted: false`.
- If `framework: "none"`, set `executable_required: false`.
- If user explicitly waives executable gating, set `waiver.granted: true` with reason.

### Step 2: Extract User Behaviors

**Normal mode (requirements-driven)**

Transform EARS requirements to user-visible behavior. Preserve existing requirement IDs; if absent, use section-based IDs (`BR-1`, `BR-2`, etc.).

| EARS statement | BDD transformation |
|----------------|--------------------|
| WHEN user clicks X, system shall Y | When I click X, Then I should see Y |
| IF validation fails, system shall show error | When I submit invalid data, Then I see error message |
| WHILE session active, system shall refresh | Given I am logged in, Then my session stays active |

Group scenarios by journeys:
- authentication/session
- core workflows
- user-visible errors
- visible edge cases

**Prep mode (current behavior)**

List the behavior to preserve:
1. user actions
2. current outcomes
3. error states
4. boundary behavior

### Step 3: Generate Gherkin Scenarios

Use this structure:

```gherkin
Feature: {Feature name from journey}
  As a {user role}
  I want to {goal}
  So that {benefit}

  Background:
    Given {common setup}

  @requirement:{BR-X.Y} @priority:{high|medium|low}
  Scenario: {descriptive_name}
    Given {user-visible context}
    When {user action}
    Then {visible outcome}
    And {additional visible assertion}

  @requirement:{BR-X.Y}
  Scenario Outline: {parameterized_name}
    Given {context with <placeholder>}
    When {action with <placeholder>}
    Then {outcome with <placeholder>}

    Examples:
      | placeholder | expected |
      | value1      | result1  |
      | value2      | result2  |
```

Scenario authoring rules:
- Keep steps user-visible; avoid implementation details.
- Keep internal constraints/performance internals in `/mdt:tests`.
- Use `Scenario Outline` when cases differ only by data permutations.
- Prefer one representative happy path per journey plus targeted error/edge coverage.

Coverage minimums:

| Requirement type | Minimum scenarios |
|------------------|-------------------|
| Happy path | 1 primary + 1 variation |
| Error handling | 1 per user-visible error |
| Edge cases | 1 per boundary condition |
| Permissions | 1 per role (if applicable) |

Budget gate (blocking):
- If scenarios exceed `scenario_budget.total_max`, merge with outlines or route lower-level checks to `/mdt:tests`.
- If any journey exceeds `scenario_budget.per_journey_max`, collapse redundant variants before proceeding.

### Step 4: Generate Executable Test Files

If executable framework exists, generate test files in the project E2E structure.

Typical layout:

```text
{e2e_directory}/
└── {CR-KEY}/
    ├── {feature-a}.spec.{ext}
    └── {feature-b}.spec.{ext}
```

Prep mode may use preservation folder:

```text
{e2e_directory}/
└── preservation/
    └── {CR-KEY}/
        └── {feature}.spec.{ext}
```

If `e2e.framework == "none"`:
- Do not generate executable `.spec` implementation files.
- Keep planned file targets in `Generated Test Files` with `🟡 Spec-Only` status.
- Do not add runnable verification commands.

Language references (only when generating executable tests):
- TypeScript/Node.js: `mdt/references/typescript.md`
- Python: `mdt/references/python.md`

### Step 5: Verify Test State

Branch by framework availability.

If `e2e.framework == "none"` (Spec-Only):
- Skip command execution.
- Set verification status to `🟡 Spec-Only`.
- Record verification command as `n/a`.
- Note acceptance gating is deferred until E2E framework exists (or user waives executable gating).
- Ensure `acceptance_gating` metadata is populated in output.

Normal mode with executable framework (expect RED):

```bash
{e2e_command} {filter}
```

Expected: generated tests fail until implementation.

If tests unexpectedly pass, investigate:
- behavior already implemented
- test too loose
- duplicate behavior

Prep mode with executable framework (expect GREEN):

```bash
{e2e_command} {filter}
```

Expected: generated tests pass against current system.

If tests fail, investigate:
- incorrect test
- existing defect
- misunderstood baseline behavior

### Step 6: Generate `bdd.md`

```markdown
# BDD Acceptance Tests: {CR-KEY}

**Mode**: {Normal | Prep (Behavior Lock)}
**Source**: {requirements.md | existing system analysis}
**Generated**: {timestamp}
**Status**: {🔴 RED (implementation pending) | 🟢 GREEN (behavior locked) | 🟡 Spec-Only (framework unavailable)}

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | {framework name or "none"} |
| Directory | `{path}` |
| Command | `{command or "n/a"}` |
| Filter | `{filter or "n/a"}` |

## User Journeys

### Journey 1: {Journey Name}

**User Goal**: {goal}
**Entry Point**: {entry point}

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| {scenario_name} | Happy path | BR-1.1 | {🔴|🟢|🟡} |
| {error_scenario} | Error | BR-1.2 | {🔴|🟢|🟡} |
| {edge_case} | Edge case | BR-1.3 | {🔴|🟢|🟡} |

## Scenario Specifications

### Feature: {Feature Name}

**File**: `{e2e_directory}/{feature}.spec.{ext}`
**Covers**: BR-1.1, BR-1.2

```gherkin
Given {context}
When {action}
Then {outcome}
```

## Generated Test Files

| File | Scenarios | Status |
|------|-----------|--------|
| `{path/to/feature.spec.{ext}}` | {N} | {🔴 RED / 🟢 GREEN / 🟡 Spec-Only} |

## Requirement Coverage

Track at sub-requirement level (`BR-X.Y`).

| Req ID | Scenarios | Routed To | Covered? |
|--------|-----------|-----------|----------|
| BR-1.1 | scenario_a, scenario_b | bdd | ✅ |
| BR-1.2 | scenario_c | bdd | ✅ |
| C2 | - | tests | ✅ Routed |
| BR-2.2 | - | clarification | ❌ Gap |

### Coverage Gaps (if any)

| Requirement | Reason | Action |
|-------------|--------|--------|
| BR-2.2 | Not user-visible | Cover in `/mdt:tests` |
| BR-3.1 | Need clarification | Flag for `/mdt:clarification` |

## Verification

If executable framework exists:

```bash
{e2e_command} {filter}
```

**Expected Result**:
- Normal mode: `{N} failed, 0 passed` (RED until implemented)
- Prep mode: `{N} passed, 0 failed` (GREEN baseline)

If `framework: "none"`:
- Omit runnable verification command block entirely.
- Include: `Verification: n/a (Spec-Only)`.

## Acceptance Gating

| Field | Value |
|-------|-------|
| Executable Required | `{true|false}` |
| Waiver Granted | `{true|false}` |
| Waiver Reason | `{reason or "n/a"}` |

## Implementation Handoff

For `/mdt:implement`:
1. Run unit/integration tests from `/mdt:tests`
2. Run BDD scenarios for affected journeys (if executable)
3. Scenarios should progressively turn GREEN
4. If spec-only, treat BDD as acceptance contract until E2E framework is added

*Generated by /mdt:bdd v2*
```

### Step 7: Save and Report

1. Create output directory:

```bash
mkdir -p "{output_dir}"
```

2. Save executable E2E files when framework exists; otherwise keep spec-only entries in `bdd.md`.
3. Save `bdd.md`:
- normal: `{TICKETS_PATH}/{CR-KEY}/bdd.md`
- prep: `{TICKETS_PATH}/{CR-KEY}/prep/bdd.md`

4. Report summary:

```markdown
## BDD Tests Generated: {CR-KEY}

| Metric | Value |
|--------|-------|
| Mode | {Normal / Prep} |
| Source | {requirements.md / existing system} |
| User Journeys | {N} |
| Scenarios | {N} |
| Test Files | {N} |
| Expected State | {🔴 RED / 🟢 GREEN / 🟡 Spec-Only} |
| Executable Required | {true / false} |
| Waiver Granted | {true / false} |
| Waiver Reason | {reason or "n/a"} |

**Output**: `{bdd_file}`

**Test files**:
- `{path/to/test1.spec.ext}`
- `{path/to/test2.spec.ext}`

**Verify** (only when executable framework exists):
```bash
{e2e_command} {filter}
```
If Spec-Only: `n/a`

**Next**:
- Normal: `/mdt:architecture {CR-KEY}`
- Prep: `/mdt:architecture {CR-KEY} --prep`
```

## Validation Checklist

Before completing `/mdt:bdd`:

- [ ] Mode detected correctly (normal vs prep)
- [ ] Source loaded (`requirements.md` or existing system)
- [ ] E2E framework detected (or `framework: "none"` set)
- [ ] Scenario count within budget (total + per-journey)
- [ ] Mirrored variants collapsed into `Scenario Outline` where possible
- [ ] Scenarios use user perspective only
- [ ] Non-functional checks included only when explicitly required and user-visible
- [ ] Gherkin format valid (`Given/When/Then`)
- [ ] Requirement traceability complete at `BR-X.Y` level
- [ ] Coverage routing includes `bdd`/`tests`/`clarification` where relevant
- [ ] Every journey table scenario has a matching Gherkin spec
- [ ] Scenario-spec file paths match `Generated Test Files` table
- [ ] Executable test files generated when framework exists (or skipped correctly in Spec-Only)
- [ ] Expected state verified (RED normal, GREEN prep, Spec-Only when no framework)
- [ ] `bdd.md` saved to correct location

## Integration

**Input**:
- normal: `requirements.md` (or CR acceptance criteria fallback)
- prep: CR scope + existing system behavior

**Output consumed by**:
- `/mdt:architecture` (acceptance scope + E2E strategy context)
- `/mdt:tasks` (milestones from BR-X.Y scenarios)
- `/mdt:implement` and `/mdt:implement-agentic` (acceptance gating)

Context: $ARGUMENTS
