# MDT Requirements Specification Workflow (v2)

Generate requirements from CR context. Produces `{TICKETS_PATH}/{CR-KEY}/requirements.md`.

**Core Principle**: Requirements describe WHAT the system does, not WHERE or HOW. Architecture decides implementation details.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

## Output Location

`{TICKETS_PATH}/{CR-KEY}/requirements.md`

## Requirements Scope Detection

**Priority**: Check for explicit `**Requirements Scope**` field in CR content FIRST.

### Step 1: Check for Explicit Scope

Look for this pattern in CR content (typically after the H1 title):
```markdown
**Requirements Scope**: {full|brief|preservation|none}
```

If found, use that value directly:

| Scope | Action | Output Format |
|-------|--------|---------------|
| `full` | Generate full requirements | EARS + FR + NFR + Config |
| `brief` | Generate minimal requirements | Bug description + fix criteria |
| `preservation` | Generate behavior preservation specs | Behavior lock tests for refactoring |
| `none` | **Exit early** | Recommend `/mdt:architecture` directly |

### Step 2: Fallback to CR Type Detection

**Only if `Requirements Scope` field is missing**, infer from CR type:

| CR Type | Inferred Scope | EARS Format | Sections to Generate |
|---------|----------------|-------------|---------------------|
| **Feature Enhancement** | `full` | Pure behavioral | EARS + FR + NFR + Config |
| **Enhancement** | `full` | Pure behavioral | EARS + FR + NFR + Current Context |
| **Bug Fix** | `brief` | Minimal, targeted | Bug description + fix criteria |
| **Refactoring** | `none` | **Skip** | Recommend `/mdt:architecture` |
| **Tech Debt** | `none` | **Skip** | Recommend `/mdt:architecture` |
| **Architecture** | `none` | **Skip** | Recommend `/mdt:architecture` |
| **Documentation** | `none` | **Skip** | No requirements needed |
| **Migration** | `full` | Hybrid | EARS + Migration Map |

### Step 3: Content Analysis Override

**Only if scope is `none` (from type inference)**, check for behavioral signals:

| Signal | Found In | Override To |
|--------|----------|-------------|
| "Open Questions" with behavior questions | Section 3 | `full` |
| New capabilities mentioned | Problem/Scope | `full` |
| "adds", "enables", "new feature" language | Throughout | `full` |
| Size limits, eviction, config hot-reload | Acceptance Criteria | `full` |

If behavioral signals detected, **ask user**:
```markdown
This CR is labeled {type} but contains behavioral requirements:
- {signal 1}
- {signal 2}

Generate requirements? (yes → full, no → skip to architecture)
```

### When to Skip `/mdt:requirements`

**Exit early** with scope = `none` for:
- **Explicit scope = "none"**: Author declared no requirements needed
- **Refactoring CRs**: EARS describes behavior; refactoring preserves behavior
- **Tech Debt CRs** (no new behaviors): Focus is structure, not behavior
- **Simple bug fixes**: Single-file scope with obvious fix
- **Documentation-only**: No behavioral requirements
- **CRs with <3 behavioral needs**: CR Acceptance Criteria suffices

## EARS Syntax Reference

EARS (Easy Approach to Requirements Syntax) provides templates for unambiguous requirements:

| Type | Template | Use When |
|------|----------|----------|
| **Ubiquitous** | The system shall `<action>` | Always true, no trigger |
| **Event-Driven** | WHEN `<trigger>` the system shall `<action>` | Response to event |
| **State-Driven** | WHILE `<state>` the system shall `<action>` | Behavior during condition |
| **Unwanted** | IF `<condition>` THEN the system shall `<action>` | Error/exception handling |
| **Optional** | WHERE `<feature>` the system shall `<action>` | Feature-dependent behavior |
| **Complex** | WHILE `<state>` WHEN `<trigger>` the system shall `<action>` | Combined conditions |

**Keywords**: WHEN, WHILE, IF...THEN, WHERE, SHALL

## Code Reference Rules

### For New Features and Enhancements (Pure Behavioral)

EARS statements must be **implementation-agnostic**:

```markdown
# ✅ Correct (pure behavioral)
WHEN user clicks a tab, the system shall display the corresponding document.
WHEN cache entry age exceeds TTL, the system shall invalidate the entry.
IF upload fails, THEN the system shall display an error message.

# ❌ Avoid (constrains architecture)
WHEN user clicks a tab, the `useSubDocuments` hook shall call the API.
The `CacheModule.ts` shall provide TTL-based expiration.
IF upload fails, THEN the `TicketTabs` component shall display error.
```

**Why**: Requirements should not constrain naming, file structure, or component design. The architect decides WHERE behavior lives.

### For Bug Fixes (Code Refs Allowed)

Bug fixes target specific code—precision matters:

```markdown
# ✅ Acceptable for bug fixes
The race condition in `useProjectManager` state updates shall be resolved.
WHEN `projectsRef.current` is accessed in callbacks, it SHALL reflect latest state.
```

### Current Implementation Context (Separate Section)

If code references add context, place them in a **separate section**—not in EARS:

```markdown
## Current Implementation Context
> Informational only. Architecture may restructure as needed.

| Behavior | Current Location | Notes |
|----------|------------------|-------|
| Project caching | `ProjectService.ts:45-60` | Hardcoded 30s TTL |
| File metadata cache | `TicketService.ts:120-150` | No size limit |
```

## Execution Steps

### Step 1: Load CR Context and Determine Scope

1. `mdt-all:get_cr` with `mode="full"` — abort if CR doesn't exist

2. **Check for explicit Requirements Scope** in CR content:
   - Search for pattern: `**Requirements Scope**: {value}`
   - If found, use that value as `SCOPE`
   - Store: `SCOPE_SOURCE = "explicit"`

3. **If no explicit scope**, infer from CR type:
   - Read `type` field from YAML frontmatter
   - Apply mapping from "Step 2: Fallback to CR Type Detection" table
   - Store: `SCOPE_SOURCE = "inferred"`

4. **If inferred scope = "none"**, check for behavioral signals:
   - Scan for "Open Questions" with behavior questions
   - Check for new capabilities in Problem/Scope
   - Look for behavioral language ("adds", "enables", "new capability")
   - If signals found: Ask user to confirm scope override
   - Store: `SCOPE_SOURCE = "override"` if user changes scope

5. **Exit early if SCOPE = "none"**:
   ```markdown
   ## Requirements Workflow Skipped

   **CR Type**: {type}
   **Requirements Scope**: none ({SCOPE_SOURCE})
   **Reason**: {refactoring/tech-debt/documentation-only/author-specified}
   **Recommendation**: Use `/mdt:architecture {CR-KEY}` directly.
   ```

6. **Extract from CR** (if continuing):
   - **Problem** — behavioral needs, user goals
   - **Scope** — what changes, what doesn't
   - **Affected/New Artifacts** — system components (for Artifact Mapping, not EARS)
   - **Acceptance Criteria** — existing testable conditions
   - **Architecture Design** (if exists) — structure context

### Step 2: Identify Requirement Sources

Scan CR for behavioral statements to transform:

| Source Section | Look For | Transforms To |
|----------------|----------|---------------|
| Problem | "Users need to...", "System should..." | Functional requirements |
| Problem | "Currently fails when...", "Error occurs..." | Unwanted behavior requirements |
| Scope - Changes | "Add capability to...", "Enable..." | Feature requirements |
| Scope - Unchanged | "Must continue to...", "Preserve..." | Constraint requirements |
| Acceptance Criteria | Existing checkboxes | Verify coverage, refine syntax |

### Step 3: Group Requirements by Feature

Organize into logical groups based on:
- User-facing features (UI interactions, API endpoints)
- System behaviors (background processes, integrations)
- Data operations (CRUD, validation, persistence)
- Error handling (failures, edge cases, recovery)

Each group becomes a `### Requirement N: {Feature Name}` section.

### Step 4: Transform to EARS Syntax

For each identified behavioral need:

**4a. Identify trigger/condition:**
- Event? → WHEN template
- Ongoing state? → WHILE template  
- Error/failure? → IF...THEN template
- Always true? → Ubiquitous template
- Feature flag? → WHERE template

**4b. Identify system component:**
- Map to artifact from CR Section 4
- Use component name, not behavioral description
- Example: "the `ProfileService`" not "the profile handling system"

**4c. Specify action with measurable outcome:**
- Include timing constraints where relevant
- Include state changes
- Include output/response expectations

**4d. Write requirement:**
```
WHEN user clicks "Save" button
the `ProfileService` shall persist changes to database within 200ms.
```

### Step 5: Create Artifact Mapping

For each requirement, identify:
- **Primary Artifact**: Main component implementing the requirement
- **Integration Points**: Other artifacts involved
- **Test Location**: Where verification test should live

### Step 6: Generate Requirements Document

Use the appropriate template based on `SCOPE`:

| SCOPE | Template | Use When |
|-------|----------|----------|
| `full` | Template A: Full Requirements | New features, enhancements |
| `brief` | Template B: Bug Fix | Bug fixes, targeted changes |
| `preservation` | Template C: Behavior Preservation | Refactoring, must preserve behavior |
| `full` + migration | Template D: Migration | Moving/reorganizing with new behavior |
| `none` | Exit early (no template) | Structural changes only |

#### Template A: Full Requirements (SCOPE = "full")

```markdown
# Requirements: {CR-KEY}

**Source**: [{CR-KEY}](../{CR-KEY}.md)
**Generated**: {YYYY-MM-DD}
**CR Type**: {type}

## Introduction

{2-3 sentences describing the feature/change scope from CR Problem section}

## Behavioral Requirements (EARS)

### Requirement 1: {Feature/Behavior Name}

**Objective**: As a {user type}, I want to {goal}, so that {benefit}.

#### Acceptance Criteria

1. WHEN {trigger}, the system shall {action}.
2. WHILE {state}, the system shall {behavior}.
3. IF {error condition}, THEN the system shall {recovery action}.

### Requirement 2: {Feature/Behavior Name}

**Objective**: As a {user type}, I want to {goal}, so that {benefit}.

#### Acceptance Criteria

1. {EARS requirement - pure behavioral, no component names}
2. {EARS requirement - pure behavioral, no component names}

{Continue for all requirements...}

---

## Functional Requirements

> Specific capabilities the system must provide.

| ID | Requirement | Rationale |
|----|-------------|-----------|
| FR-1 | {Capability statement} | {Why needed} |
| FR-2 | {Capability statement} | {Why needed} |
| FR-3 | {Capability statement} | {Why needed} |

## Non-Functional Requirements

> Quality attributes and constraints.

### Performance
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-P1 | {Performance requirement} | {Metric} | {Why this target} |

### Reliability
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-R1 | {Reliability requirement} | {Metric} | {Why this target} |

### Usability
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-U1 | {Usability requirement} | {Metric} | {Why this target} |

## Configuration Requirements

> Include only if feature has configurable settings.

| Setting | Description | Default | Valid Range | Rationale |
|---------|-------------|---------|-------------|-----------|
| `{ENV_VAR_NAME}` | {What it controls} | {Default value} | {Constraints} | {Why configurable} |

## Current Implementation Context

> Informational only. Architecture may restructure as needed.
> Include only for enhancements to existing features.

| Behavior | Current Location | Notes |
|----------|------------------|-------|
| {Existing behavior} | `{file:lines}` | {Issue or context} |

---

## Artifact Mapping

> Maps requirements to implementation. Architecture decides final structure.

| Req ID | Requirement Summary | Primary Artifact | Integration Points |
|--------|---------------------|------------------|-------------------|
| R1.1 | {brief} | `{file/component}` | `{other artifacts}` |
| R1.2 | {brief} | `{file/component}` | `{other artifacts}` |

## Traceability

| Req ID | CR Section | Acceptance Criteria |
|--------|------------|---------------------|
| R1.1 | Problem | AC-1 |
| R1.2 | Scope | AC-2 |

---
*Generated from {CR-KEY} by /mdt:requirements (v3)*
```

#### Template B: Bug Fix (SCOPE = "brief")

```markdown
# Requirements: {CR-KEY}

**Source**: [{CR-KEY}](../{CR-KEY}.md)
**Generated**: {YYYY-MM-DD}
**CR Type**: Bug Fix

## Bug Description

{Description of the bug, including specific code location if known}

## Fix Requirements

1. {EARS requirement with code refs as needed}
2. {EARS requirement with code refs as needed}

## Verification

- [ ] {How to verify the fix}
- [ ] {Regression test needed}

---
*Generated from {CR-KEY} by /mdt:requirements (v3)*
```

#### Template C: Behavior Preservation (SCOPE = "preservation")

```markdown
# Requirements: {CR-KEY}

**Source**: [{CR-KEY}](../{CR-KEY}.md)
**Generated**: {YYYY-MM-DD}
**CR Type**: {type}
**Scope**: Behavior Preservation

## Introduction

{Description of refactoring scope and why behavior preservation is critical}

## Behaviors to Preserve

> These behaviors MUST remain unchanged after refactoring.
> Tests should be GREEN before and after changes.

### Behavior Group 1: {Feature/Area Name}

| ID | Current Behavior | Verification |
|----|------------------|--------------|
| BP-1.1 | {WHEN X happens, Y results} | {How to verify} |
| BP-1.2 | {WHILE X state, Y behavior} | {How to verify} |
| BP-1.3 | {IF X error, THEN Y recovery} | {How to verify} |

### Behavior Group 2: {Feature/Area Name}

| ID | Current Behavior | Verification |
|----|------------------|--------------|
| BP-2.1 | {behavior} | {verification} |

## Integration Contracts

> External interfaces that must remain stable.

| Interface | Contract | Consumers |
|-----------|----------|-----------|
| {API endpoint/method} | {Input → Output contract} | {Who depends on it} |

## Excluded from Preservation

> Behaviors explicitly allowed to change.

- {Behavior that may change and why}
- {Internal implementation detail not part of contract}

---

## Test Coverage Requirements

| Behavior ID | Test Type | Test Location | Current Status |
|-------------|-----------|---------------|----------------|
| BP-1.1 | Unit | `{test file}` | {Exists/Needed} |
| BP-1.2 | Integration | `{test file}` | {Exists/Needed} |

## Verification Checklist

Before refactoring:
- [ ] All behavior preservation tests exist
- [ ] All tests pass (GREEN)
- [ ] Integration contracts documented

After refactoring:
- [ ] All behavior preservation tests still pass (GREEN)
- [ ] No test was deleted or weakened
- [ ] Integration contracts unchanged

---
*Generated from {CR-KEY} by /mdt:requirements (v3)*
```

#### Template D: Migration (SCOPE = "full" with migration)

```markdown
# Requirements: {CR-KEY}

**Source**: [{CR-KEY}](../{CR-KEY}.md)
**Generated**: {YYYY-MM-DD}
**CR Type**: Migration

## Introduction

{Description of migration scope}

## Behavioral Requirements (EARS)

{Pure behavioral requirements for new behavior}

## Migration Map

| From | To | Status |
|------|-----|--------|
| `{old location}` | `{new location}` | Pending |
| `{old location}` | `{new location}` | Pending |

## Backward Compatibility

| Concern | Mitigation |
|---------|------------|
| {Breaking change risk} | {How to preserve compatibility} |

---
*Generated from {CR-KEY} by /mdt:requirements (v3)*
```

### Step 7: Validate Requirements

Before saving, verify based on CR type:

#### For New Features / Enhancements (Pure Behavioral)

- [ ] EARS statements use "the system shall" — no component/file names
- [ ] Uses correct EARS template for the trigger type
- [ ] Has measurable/observable outcome
- [ ] No vague terms ("quickly", "properly", "correctly")
- [ ] Timing constraints where applicable
- [ ] FR table captures specific capabilities
- [ ] NFR table has measurable targets
- [ ] Code refs ONLY in "Current Implementation Context" section (if present)
- [ ] Artifact Mapping is separate from EARS statements

**Quality check (New Feature):**
```
✓ WHEN user clicks "Save", the system shall persist changes within 200ms.
✓ IF validation fails, THEN the system shall display field-specific errors.

✗ WHEN user clicks "Save", the `ProfileService` shall persist...  (constrains architecture)
✗ The `useForm` hook shall validate inputs...  (names specific component)
✗ The system should save data properly...  (vague, no measurable outcome)
```

#### For Bug Fixes (Code Refs Allowed)

- [ ] Bug location is clearly identified
- [ ] Fix requirements are specific and testable
- [ ] Verification steps are clear
- [ ] Component names allowed when precision matters

**Quality check (Bug Fix):**
```
✓ The race condition in `useProjectManager` state closure shall be resolved.
✓ WHEN callback accesses `projectsRef.current`, it SHALL reflect latest state.
```

### Step 8: Update CR with Reference

Use `mdt-all:manage_cr_sections` to add reference in CR:

1. In Section 5 (Acceptance Criteria), add note:
   ```markdown
   > Full EARS requirements: [requirements.md](./requirements.md)
   ```

2. Optionally add to Section 4 (Artifact Specifications):
   ```markdown
   ### Requirements Specification
   - [`{TICKETS_PATH}/{CR-KEY}/requirements.md`](./requirements.md) — EARS-formatted requirements
   ```

### Step 9: Save and Report

Save to `{TICKETS_PATH}/{CR-KEY}/requirements.md`

```markdown
## Requirements Generated: {CR-KEY}

**Output**: `{TICKETS_PATH}/{CR-KEY}/requirements.md`

| Metric | Count |
|--------|-------|
| Total Requirements | {N} |
| Functional | {N} |
| Error Handling | {N} |
| Performance | {N} |

### Requirement Groups
| Group | Requirements | Primary Artifacts |
|-------|--------------|-------------------|
| {name} | R1.1-R1.{N} | `{artifacts}` |
| {name} | R2.1-R2.{N} | `{artifacts}` |

### EARS Distribution
| Type | Count |
|------|-------|
| WHEN (Event) | {N} |
| WHILE (State) | {N} |
| IF...THEN (Unwanted) | {N} |
| Ubiquitous | {N} |

### Next Steps
- Review requirements for completeness
- Run `/mdt:bdd {CR-KEY}` — generate E2E acceptance tests from requirements
- Run `/mdt:architecture {CR-KEY}` — requirements + BDD inform structure
- Run `/mdt:tests {CR-KEY}` — generate module tests from architecture
```

## EARS Examples by Type

### Event-Driven (WHEN) — Pure Behavioral
```
WHEN user submits login form,
the system shall validate credentials within 500ms.

WHEN API receives POST /users request,
the system shall create user record and return 201 status.

WHEN file upload completes,
the system shall process the file and notify the user.
```

### State-Driven (WHILE) — Pure Behavioral
```
WHILE user session is active,
the system shall refresh authentication token every 15 minutes.

WHILE offline mode is enabled,
the system shall store mutations locally for later sync.

WHILE bulk import is running,
the system shall display progress percentage to the user.
```

### Unwanted Behavior (IF...THEN) — Pure Behavioral
```
IF database connection fails,
THEN the system shall retry 3 times with exponential backoff.

IF validation returns errors,
THEN the system shall display field-specific error messages within 100ms.

IF rate limit is exceeded,
THEN the system shall return 429 status with retry-after header.
```

### Ubiquitous (no trigger) — Pure Behavioral
```
The system shall hash passwords using bcrypt with cost factor 12.

The system shall record all database mutations with timestamp and user ID.

The system shall validate environment variables on startup.
```

### Complex (Combined) — Pure Behavioral
```
WHILE user is authenticated,
WHEN session idle exceeds 30 minutes,
the system shall terminate session and redirect to login.

WHILE feature flag "dark-mode" is enabled,
WHEN user opens settings,
the system shall display dark mode toggle.
```

### Bug Fix Examples (Code Refs Allowed)
```
The stale closure in `useProjectManager.ts:145` shall be fixed
by using refs for frequently-changing state.

WHEN `onDragEnd` callback executes,
the `ticketsRef.current` SHALL contain the latest ticket state.

IF `ProjectService.getProjects()` returns cached data,
THEN the cache entry SHALL be less than TTL seconds old.
```

## Behavioral Rules

1. **One requirement = one SHALL** — don't combine multiple behaviors
2. **Pure behavioral for new features** — use "the system shall", not component names
3. **Code refs allowed for bug fixes** — precision matters when fixing specific code
4. **Measurable outcomes** — timing, counts, states, not adjectives
5. **EARS keywords capitalized** — WHEN, WHILE, IF, THEN, WHERE, SHALL
6. **User stories optional** — include Objective only if it adds clarity
7. **Artifact Mapping is separate** — don't embed file paths in EARS statements
8. **Current Context is informational** — architecture may restructure
9. **Skip if not behavioral** — refactoring/tech-debt CRs don't need EARS

## Integration

**Before**: CR exists with Problem/Scope defined
**After**:
- `/mdt:bdd` — generate E2E acceptance tests from requirements (next step)
- `/mdt:architecture` — requirements + BDD inform structure decisions
- `/mdt:tests` — generate module tests from architecture
- `/mdt:implement` — verify all tests pass

**Workflow position:**
```
/mdt:ticket-creation → /mdt:requirements → /mdt:bdd → /mdt:architecture → /mdt:tests → /mdt:tasks → /mdt:implement
                              ↑               ↑
                         (optional)      (next step)
```

## When to Skip (Quick Reference)

| CR Type | Skip? | Alternative |
|---------|-------|-------------|
| Simple bug fix (single file) | ✅ Yes | CR Acceptance Criteria |
| Documentation-only | ✅ Yes | No requirements needed |
| Refactoring | ✅ Yes | `/mdt:assess` → `/mdt:architecture` |
| Tech Debt | ✅ Yes | `/mdt:architecture` directly |
| CRs with <3 behaviors | ✅ Yes | CR Acceptance Criteria |
| New feature | ❌ No | Generate full requirements |
| Enhancement | ❌ No | Generate requirements |
| Complex bug fix | ❌ No | Generate brief requirements |
| Migration | ❌ No | Generate with Migration Map |

## Summary: Code Reference Decision

| Situation | Code Refs in EARS? | Code Refs Location |
|-----------|-------------------|-------------------|
| New feature | ❌ No | Artifact Mapping only |
| Enhancement | ❌ No | Current Context + Artifact Mapping |
| Bug fix | ✅ Yes | In EARS (precision) |
| Migration | ✅ Yes | Migration Map section |

**Principle**: Requirements describe WHAT. Architecture decides WHERE.

Context: $ARGUMENTS
