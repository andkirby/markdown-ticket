# MDT BDD Specification Workflow (v1)

Generate BDD acceptance tests from requirements. Produces user-visible behavior tests that validate the system from the outside.

**Core Principle**: BDD tests specify WHAT the system does from user perspective, independent of internal architecture. They are written BEFORE architecture decisions.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

## Output Location

| Mode | Output |
|------|--------|
| Normal | `{TICKETS_PATH}/{CR-KEY}/bdd.md` + E2E test files |
| Prep (`--prep`) | `{TICKETS_PATH}/{CR-KEY}/prep/bdd.md` + E2E test files |

## Mode Detection

| Mode | Flag | Input Source | Test State | Purpose |
|------|------|--------------|------------|---------|
| **Normal** | (none) | requirements.md | RED | Specify new behavior |
| **Prep** | `--prep` | existing system | GREEN | Lock existing behavior before refactoring |

## Problem This Solves

Without explicit acceptance tests:
- Implementation may satisfy unit tests but miss user-visible behavior
- Refactoring may break user journeys that weren't explicitly tested
- Architecture decisions aren't validated against actual user needs
- "Done" is ambiguous — no clear acceptance criteria

BDD tests written BEFORE architecture ensure:
- User needs drive design, not implementation convenience
- Refactoring has safety net at user-visible level
- Clear definition of "done" exists before coding starts

## When to Use

**Use `/mdt:bdd`:**
- New features with user-facing behavior
- Enhancements that change user experience
- Before architecture to capture behavioral requirements
- Before refactoring to lock existing user journeys (`--prep`)
- **Required for Feature Enhancement CRs** unless there is no user-visible behavior

**Do NOT use:**
- Pure technical refactoring with no user-visible changes (use `/mdt:tests --prep`)
- Documentation-only changes
- Internal API changes with no UI/UX impact
- When requirements.md doesn't exist and no existing behavior to lock

## Critical Rules

1. **Tests from user perspective** — describe what user sees/does, not internal mechanics
2. **No architecture assumptions** — BDD tests don't reference components, services, or files
3. **Gherkin format** — Given/When/Then for clarity and tool compatibility
4. **E2E focus** — test through real interfaces (browser, API, CLI)
5. **Normal mode = RED** — tests should fail until feature is implemented
6. **Prep mode = GREEN** — tests must pass against current system (locking behavior)
7. **Feature acceptance gate** — feature work is not complete until BDD scenarios are GREEN
8. **Constraint boundary** — configuration and internal constraints belong in `/mdt:tests`, not BDD scenarios unless explicitly user-visible
9. **Requirement IDs** — map scenarios to requirement sections (e.g., "BR-1", "BR-2") or explicit IDs in requirements.md
10. **Coverage honesty** — do not mark a requirement/constraint as covered unless a scenario explicitly validates it
11. **No invented behaviors** — if a scenario depends on behavior not in requirements, stop and recommend updating requirements or running `/mdt:clarification`

## Execution Steps

### Step 1: Detect Mode and Load Context

**1a. Check for prep mode:**

```yaml
# If --prep flag in arguments
if "--prep" in ARGUMENTS:
  mode: "prep"
  output_dir: "{TICKETS_PATH}/{CR-KEY}/prep/"
  bdd_file: "{TICKETS_PATH}/{CR-KEY}/prep/bdd.md"
  test_expectation: "GREEN"  # Must pass against current system
else:
  mode: "normal"
  output_dir: "{TICKETS_PATH}/{CR-KEY}/"
  bdd_file: "{TICKETS_PATH}/{CR-KEY}/bdd.md"
  test_expectation: "RED"  # Should fail until implemented
```

**1b. Load CR:**

```
mdt-all:get_cr mode="full"
```

Extract:
- CR title and type
- Problem statement (user needs)
- Scope (what changes)
- Acceptance criteria (existing conditions)

**1c. Load requirements (normal mode):**

```yaml
# Normal mode: requirements.md is primary input
if mode == "normal":
  requirements_file: "{TICKETS_PATH}/{CR-KEY}/requirements.md"
  if not exists(requirements_file):
    # Can proceed with CR acceptance criteria, but warn
    warn: "No requirements.md found. Generating BDD from CR acceptance criteria."
    source: "CR"
  else:
    source: "requirements.md"

If requirements.md is missing and this is a Feature Enhancement with user-visible behavior, recommend running `/mdt:requirements` first unless the user explicitly waives it.
```

**1d. Identify existing behavior (prep mode):**

```yaml
# Prep mode: analyze current system behavior
if mode == "prep":
  # Identify user-facing entry points from CR scope
  # These are the behaviors we need to lock
  analyze:
    - UI flows mentioned in CR
    - API endpoints affected
    - CLI commands impacted
    - User journeys that touch affected code
```

**1e. Detect E2E test framework:**

Identify an existing E2E/acceptance framework from the repo (if any), and record:
```yaml
e2e:
  framework: {existing framework name or "none"}
  directory: {path if known}
  pattern: {file pattern if known}
  command: {run command if known}
  filter: {optional filter expression to scope to CR-KEY, or "n/a"}
```

If no E2E framework detected:
```markdown
⚠️ No E2E test framework detected.

**Options**:
1. Generate Gherkin specs only (no executable tests)
2. Ask for preferred framework or test runner
3. Use existing integration test harness (if any)
```

### Step 2: Extract User Behaviors

**For Normal Mode (from requirements.md):**

Parse EARS specifications and transform to user perspective. Track section IDs:

- Use headings as IDs: `BR-1`, `BR-2`, etc.
- If requirements.md already has explicit IDs, preserve them.

| EARS Statement | BDD Transformation |
|----------------|-------------------|
| WHEN user clicks X, system shall Y | When I click X, Then I should see Y |
| IF validation fails, system shall show error | When I submit invalid data, Then I see error message |
| WHILE session active, system shall refresh | Given I am logged in, Then my session stays active |

**Group by user journey:**
- Authentication (login, logout, session)
- Core feature workflows
- Error handling from user perspective
- Edge cases visible to user

**For Prep Mode (from existing system):**

Identify user-visible behaviors to preserve:

1. **UI Flows**: What can user currently do?
2. **Expected Outcomes**: What does user see after actions?
3. **Error States**: What errors can user encounter?
4. **Edge Cases**: What happens at boundaries?

```markdown
## Discovered User Behaviors (Prep Mode)

| User Action | Current Outcome | Preserve? |
|-------------|-----------------|-----------|
| Click "Login" with valid creds | Redirect to dashboard | ✅ Yes |
| Click "Login" with invalid creds | Error message shown | ✅ Yes |
| Session timeout | Redirect to login | ✅ Yes |
```

### Step 3: Generate Gherkin Scenarios

**Feature File Structure:**

```gherkin
Feature: {Feature name from requirement group}
  As a {user role}
  I want to {goal}
  So that {benefit}

  Background:
    Given {common setup - e.g., "I am on the login page"}

  @requirement:{REQ-ID} @priority:{high|medium|low}
  Scenario: {descriptive_scenario_name}
    Given {initial context from user perspective}
    When {user action}
    Then {expected outcome visible to user}
    And {additional assertions}

  @requirement:{REQ-ID}
  Scenario Outline: {parameterized_scenario_name}
    Given {context with <placeholder>}
    When {action with <placeholder>}
    Then {outcome with <placeholder>}

    Examples:
      | placeholder | expected |
      | value1      | result1  |
      | value2      | result2  |
```

**Gherkin Best Practices:**

| Do | Don't |
|-----|-------|
| `When I click the "Submit" button` | `When the onClick handler fires` |
| `Then I see "Welcome, John"` | `Then the DOM contains welcome div` |
| `Given I am logged in as admin` | `Given JWT token is valid` |
| `Then the error message appears` | `Then setState is called with error` |

**Constraint Handling:**
- If a constraint is user-visible (e.g., "system must display warning"), it may be a BDD scenario.
- Internal constraints (e.g., config parsing, input truncation, command substitution) belong in `/mdt:tests`.

**Coverage Requirements:**

| Requirement Type | Minimum Scenarios |
|------------------|-------------------|
| Happy path | 1 primary + 1 variation |
| Error handling | 1 per user-visible error |
| Edge cases | 1 per boundary condition |
| Permissions | 1 per role (if applicable) |

### Step 4: Generate Executable Test Files

**4a. Determine test file structure:**

```
{e2e_directory}/
└── {CR-KEY}/                    # or feature-based organization
    ├── {feature-a}.spec.{ext}
    └── {feature-b}.spec.{ext}
```

For prep mode, consider separate folder:
```
{e2e_directory}/
└── preservation/
    └── {CR-KEY}/
        └── {feature}.spec.{ext}
```

**4b. Generate test code (framework-specific):**

Use the project's existing acceptance/E2E framework. If none exists, generate Gherkin specs only and skip executable code.

**Language reference** (load if generating executable tests):
- TypeScript/Node.js: `mdt/references/typescript.md`
- Python: `mdt/references/python.md`

Follow patterns from the appropriate reference file for test structure, assertions, and selectors.

### Step 5: Verify Test State

**For Normal Mode (expect RED):**

```bash
{e2e_command} {filter}
```

Expected: All tests fail (feature not implemented yet)

If any tests pass → investigate:
- Is there existing code that satisfies this?
- Is the test too loose?
- Is this duplicate functionality?

If tests are generated as TODO or skipped, mark status as **Spec-Only** and do not treat as acceptance gating. Prefer executable failing tests for Normal mode.

**For Prep Mode (expect GREEN):**

```bash
{e2e_command} {filter}
```

Expected: All tests pass (locking existing behavior)

If any tests fail → investigate:
- Is the test incorrect?
- Is there a bug in current system?
- Is this behavior actually broken?

### Step 6: Generate bdd.md

```markdown
# BDD Acceptance Tests: {CR-KEY}

**Mode**: {Normal | Prep (Behavior Lock)}
**Source**: {requirements.md | existing system analysis}
**Generated**: {timestamp}
**Status**: {🔴 RED (implementation pending) | 🟢 GREEN (behavior locked)}

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | {framework name or "none"} |
| Directory | `{path}` |
| Command | `{command}` |
| Filter | `{filter command or "n/a"}` |

## User Journeys

### Journey 1: {Journey Name}

**User Goal**: {what user wants to achieve}
**Entry Point**: {where user starts}

```gherkin
Feature: {Feature name}
  As a {user role}
  I want to {goal}
  So that {benefit}
```

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| {scenario_name} | Happy path | R1.1 | 🔴 |
| {error_scenario} | Error | R1.2 | 🔴 |
| {edge_case} | Edge case | R1.3 | 🔴 |

### Journey 2: {Journey Name}

{Continue for all journeys...}

---

## Scenario Specifications

### Feature: {Feature Name}

**File**: `{e2e_directory}/{feature}.spec.{ext}`
**Covers**: R1.1, R1.2

#### Scenario: {scenario_name}

```gherkin
Given {context}
When {action}
Then {outcome}
```

**Test**: `describe('{Feature}') > it('{scenario}')`
**Requirement**: R1.1

---

## Generated Test Files

| File | Scenarios | Status |
|------|-----------|--------|
| `{path/to/feature.spec.{ext}}` | {N} | {🔴 RED / 🟢 GREEN} |
| `{path/to/feature2.spec.{ext}}` | {N} | {🔴 RED / 🟢 GREEN} |

## Requirement Coverage

| Req ID | Description | Scenarios | Covered? |
|--------|-------------|-----------|----------|
| BR-1 | {brief} | 2 | ✅ |
| BR-2 | {brief} | 1 | ✅ |
| BR-3 | {brief} | 0 | ❌ Gap |

{If gaps exist}
### Coverage Gaps

| Requirement | Reason | Action |
|-------------|--------|--------|
| BR-3 | Not user-visible | Cover in `/mdt:tests` |
| BR-4 | Need clarification | Flag for `/mdt:clarification` |

## Verification

Run BDD tests:
```bash
{e2e_command} {filter}
```

**Expected Result**: 
{Normal mode}: `{N} failed, 0 passed` (RED until implemented)
{Prep mode}: `{N} passed, 0 failed` (GREEN, behavior locked)

---

## Integration Notes

### For `/mdt:architecture`

These user journeys inform component boundaries:
- {Journey 1} suggests {component need}
- {Journey 2} requires {capability}

### For `/mdt:implement`

After each implementation task:
1. Run unit/integration tests (from `/mdt:tests`)
2. Run BDD tests for affected scenarios
3. Scenarios should progressively turn GREEN

---
*Generated by /mdt:bdd v1*
```

### Step 7: Save and Report

**7a. Create output directory:**
```bash
mkdir -p "{output_dir}"
```

**7b. Save test files** to E2E test directory

**7c. Save bdd.md** to appropriate path:
- Normal: `{TICKETS_PATH}/{CR-KEY}/bdd.md`
- Prep: `{TICKETS_PATH}/{CR-KEY}/prep/bdd.md`

**7d. Report:**

```markdown
## BDD Tests Generated: {CR-KEY}

| Metric | Value |
|--------|-------|
| Mode | {Normal / Prep} |
| Source | {requirements.md / existing system} |
| User Journeys | {N} |
| Scenarios | {N} |
| Test Files | {N} |
| Expected State | {🔴 RED / 🟢 GREEN} |

**Output**: `{bdd_file}`

**Test files**:
- `{path/to/test1.spec.ext}`
- `{path/to/test2.spec.ext}`

**Verify**:
```bash
{e2e_command} {filter}
# Expected: {N} {failed|passed}
```

**Next Steps**:
{Normal mode}:
- Review scenarios for completeness
- Run `/mdt:architecture {CR-KEY}` — user journeys inform design

{Prep mode}:
- Verify all tests pass (behavior locked)
- Run `/mdt:architecture {CR-KEY} --prep` — design refactoring
```

---

## Examples

### Example 1: Normal Mode (New Feature)

**Input**: `/mdt:bdd MDT-101`

**requirements.md contains**:
```markdown
### Requirement 1: User Authentication

WHEN user submits login form with valid credentials,
the system shall authenticate and redirect to dashboard.

IF credentials are invalid,
THEN the system shall display error message.
```

**Output bdd.md**:
```markdown
# BDD Acceptance Tests: MDT-101

**Mode**: Normal
**Status**: 🔴 RED (implementation pending)

## User Journeys

### Journey 1: User Login

**User Goal**: Access my account
**Entry Point**: /login

#### Scenarios

| Scenario | Type | Requirement | Status |
|----------|------|-------------|--------|
| successful_login | Happy path | R1.1 | 🔴 |
| invalid_credentials | Error | R1.2 | 🔴 |
| empty_form_submission | Edge case | R1.2 | 🔴 |
```

### Example 2: Prep Mode (Lock Before Refactoring)

**Input**: `/mdt:bdd MDT-102 --prep`

**CR describes**: Refactoring authentication service

**Output bdd.md**:
```markdown
# BDD Acceptance Tests: MDT-102

**Mode**: Prep (Behavior Lock)
**Status**: 🟢 GREEN (behavior locked)

## User Journeys

### Journey 1: Existing Login Flow

**User Goal**: Verify current login still works after refactoring
**Entry Point**: /login

#### Scenarios (Must Stay GREEN)

| Scenario | Type | Current Behavior | Status |
|----------|------|------------------|--------|
| successful_login | Happy path | Redirects to /dashboard | 🟢 |
| invalid_credentials | Error | Shows "Invalid credentials" | 🟢 |
| session_timeout | Edge case | Redirects to /login after 30min | 🟢 |

⚠️ **These tests must remain GREEN throughout refactoring.**
If any fail, refactoring has broken user-visible behavior.
```

### Example 3: Language-Specific Implementation

For executable test code, load the appropriate language reference:

| Language | Reference File |
|----------|---------------|
| TypeScript/Node.js | `mdt/references/typescript.md` |
| Python | `mdt/references/python.md` |

These references contain:
- Test file naming conventions
- Framework-specific test structure
- Selector patterns (stable vs brittle)
- Assertion patterns
- Filter commands for running specific tests

---

## Behavioral Rules

1. **User perspective only** — no technical implementation details in scenarios
2. **One scenario = one user goal** — don't combine multiple outcomes
3. **Gherkin keywords** — Given, When, Then, And, But (capitalize)
4. **Requirement traceability** — every scenario links to requirement
5. **Normal = RED, Prep = GREEN** — verify expected state after generation
6. **No architecture assumptions** — BDD tests don't know about services, components, files
7. **Stable selectors** — when UI testing, use stable selectors (e.g., data-testid) instead of CSS classes or DOM structure
8. **No invented behaviors** — if a scenario depends on behavior not in requirements, stop and route to requirements/clarification

## Anti-Patterns to Avoid

❌ **Implementation details in scenarios**:
```gherkin
When the AuthService validates the JWT token
When the database query returns results
```
✅ **User perspective**:
```gherkin
When I submit my login credentials
When I search for "keyword"
```

❌ **Testing internal state**:
```gherkin
Then the session store contains user object
Then the cache is populated
```
✅ **Testing visible outcome**:
```gherkin
Then I see my username in the header
Then search results appear within 2 seconds
```

❌ **Brittle selectors** (any language):
```
# Avoid CSS classes or DOM structure
click('.btn.btn-primary.submit-form')
find('div > form > button')
```
✅ **Stable selectors**:
```
# Use semantic identifiers
click(testId='submit')
find(role='button', name='Submit')
```

See `mdt/references/{language}.md` for language-specific selector patterns.

❌ **Combined scenarios**:
```gherkin
Scenario: Login and update profile and logout
```
✅ **Focused scenarios**:
```gherkin
Scenario: Successful login
Scenario: Update profile name
Scenario: Logout from dashboard
```

## Validation Checklist

Before completing `/mdt:bdd`:

- [ ] Mode correctly detected (normal vs prep)
- [ ] Source loaded (requirements.md or existing system)
- [ ] E2E framework detected (or alternative chosen)
- [ ] All user journeys identified
- [ ] Scenarios written from user perspective (no tech details)
- [ ] Gherkin format correct (Given/When/Then)
- [ ] Requirement traceability complete
- [ ] Test files generated
- [ ] Expected state verified (RED for normal, GREEN for prep)
- [ ] bdd.md saved to correct location

## Integration

**Input**: 
- Normal mode: `requirements.md` (from `/mdt:requirements`)
- Prep mode: CR scope + existing system analysis

**Output consumed by**:
- `/mdt:architecture` — user journeys inform component boundaries
- `/mdt:implement` — scenarios turn GREEN as features complete

**Workflow position**:
```
/mdt:requirements
        ↓
/mdt:bdd ←────────── User-visible behavior (before architecture)
        ↓
/mdt:architecture
        ↓
/mdt:tests ←──────── Part-specific tests (after architecture)
        ↓
/mdt:tasks
        ↓
/mdt:implement
```

**Prep workflow position**:
```
/mdt:assess
        ↓
/mdt:bdd --prep ←─── Lock existing E2E behavior (optional)
        ↓
/mdt:architecture --prep
        ↓
/mdt:tests --prep ←─ Lock existing unit/integration
        ↓
/mdt:tasks --prep
        ↓
/mdt:implement --prep
```

Context: $ARGUMENTS
