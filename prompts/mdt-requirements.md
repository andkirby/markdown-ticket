# MDT Requirements Specification Workflow (v1)

Generate EARS-formatted requirements from CR context. Produces `docs/CRs/{CR-KEY}/requirements.md`.

**Core Principle**: Transform behavioral needs into testable requirements using EARS syntax. Every requirement maps to concrete artifacts.

## User Input

```text
$ARGUMENTS
```

## Output Location

`docs/CRs/{CR-KEY}/requirements.md`

## EARS Syntax Reference

EARS (Easy Approach to Requirements Syntax) provides templates for unambiguous requirements:

| Type | Template | Use When |
|------|----------|----------|
| **Ubiquitous** | The `<system>` shall `<action>` | Always true, no trigger |
| **Event-Driven** | WHEN `<trigger>` the `<system>` shall `<action>` | Response to event |
| **State-Driven** | WHILE `<state>` the `<system>` shall `<action>` | Behavior during condition |
| **Unwanted** | IF `<condition>` THEN the `<system>` shall `<action>` | Error/exception handling |
| **Optional** | WHERE `<feature>` the `<system>` shall `<action>` | Feature-dependent behavior |
| **Complex** | WHILE `<state>` WHEN `<trigger>` the `<system>` shall `<action>` | Combined conditions |

**Keywords**: WHEN, WHILE, IF...THEN, WHERE, SHALL

## Execution Steps

### Step 1: Load CR Context

1. `mdt-all:get_cr` with `mode="full"` — abort if CR doesn't exist
2. Extract from CR:
   - **Problem** — behavioral needs, user goals
   - **Scope** — what changes, what doesn't
   - **Affected/New Artifacts** — system components
   - **Acceptance Criteria** — existing testable conditions
   - **Architecture Design** (if exists) — structure context
3. Parse CR type — affects requirement focus:
   - Feature Enhancement → functional requirements
   - Bug Fix → unwanted behavior requirements
   - Architecture → structural/constraint requirements

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

```markdown
# Requirements: {CR-KEY}

**Source**: [{CR-KEY}](../../../docs/CRs/{PROJECT}/{CR-KEY}.md)
**Generated**: {YYYY-MM-DD}
**CR Type**: {type}

## Introduction

{2-3 sentences describing the feature/change scope from CR Problem section}

## Requirements

### Requirement 1: {Feature/Behavior Name}

**Objective**: As a {user type}, I want to {goal}, so that {benefit}.

#### Acceptance Criteria

1. WHEN {trigger}, the `{Component}` shall {action}.
2. WHILE {state}, the `{Component}` shall {behavior}.
3. IF {error condition}, THEN the `{Component}` shall {recovery action}.

### Requirement 2: {Feature/Behavior Name}

**Objective**: As a {user type}, I want to {goal}, so that {benefit}.

#### Acceptance Criteria

1. {EARS requirement}
2. {EARS requirement}

{Continue for all requirements...}

---

## Artifact Mapping

| Req ID | Requirement Summary | Primary Artifact | Integration Points |
|--------|---------------------|------------------|-------------------|
| R1.1 | {brief} | `{file/component}` | `{other artifacts}` |
| R1.2 | {brief} | `{file/component}` | `{other artifacts}` |
| R2.1 | {brief} | `{file/component}` | `{other artifacts}` |

## Traceability

| Req ID | CR Section | Acceptance Criteria |
|--------|------------|---------------------|
| R1.1 | Problem | AC-1 |
| R1.2 | Scope | AC-2 |

## Non-Functional Requirements

### Performance
- {EARS requirement with timing constraint}

### Reliability  
- {EARS requirement for error handling}

### Consistency
- {EARS requirement for state management}

---
*Generated from {CR-KEY} by /mdt:requirements*
```

### Step 7: Validate Requirements

Before saving, verify each requirement:

- [ ] Uses correct EARS template for the trigger type
- [ ] References concrete artifact (component name in backticks)
- [ ] Has measurable/observable outcome
- [ ] Maps to at least one artifact in Section 4
- [ ] No behavioral descriptions ("the system that handles...")
- [ ] No vague terms ("quickly", "properly", "correctly")
- [ ] Timing constraints where applicable

**Quality check:**
```
✓ WHEN user clicks "Save", the `ProfileService` shall persist within 200ms.
✗ The system should save data properly when the user wants to save.
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
   - [`docs/CRs/{CR-KEY}/requirements.md`](./requirements.md) — EARS-formatted requirements
   ```

### Step 9: Save and Report

Save to `docs/CRs/{CR-KEY}/requirements.md`

```markdown
## Requirements Generated: {CR-KEY}

**Output**: `docs/CRs/{CR-KEY}/requirements.md`

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
- Run `/mdt:architecture {CR-KEY}` — requirements inform structure
- Run `/mdt:tasks {CR-KEY}` — tasks implement requirements
```

## EARS Examples by Type

### Event-Driven (WHEN)
```
WHEN user submits login form,
the `AuthService` shall validate credentials within 500ms.

WHEN API receives POST /users request,
the `UserController` shall create user record and return 201 status.

WHEN file upload completes,
the `StorageService` shall trigger `FileProcessor` webhook.
```

### State-Driven (WHILE)
```
WHILE user session is active,
the `SessionManager` shall refresh token every 15 minutes.

WHILE offline mode is enabled,
the `SyncQueue` shall store mutations locally.

WHILE bulk import is running,
the `ImportService` shall display progress percentage.
```

### Unwanted Behavior (IF...THEN)
```
IF database connection fails,
THEN the `ConnectionPool` shall retry 3 times with exponential backoff.

IF validation returns errors,
THEN the `FormHandler` shall display error messages within 100ms.

IF rate limit exceeded,
THEN the `RateLimiter` shall return 429 status with retry-after header.
```

### Ubiquitous (no trigger)
```
The `PasswordService` shall hash passwords using bcrypt with cost factor 12.

The `AuditLogger` shall record all database mutations with timestamp and user ID.

The `ConfigLoader` shall validate environment variables on startup.
```

### Complex (Combined)
```
WHILE user is authenticated,
WHEN session idle exceeds 30 minutes,
the `SessionManager` shall terminate session and redirect to login.

WHILE feature flag "dark-mode" is enabled,
WHEN user opens settings,
the `ThemeSelector` shall display dark mode toggle.
```

## Behavioral Rules

1. **One requirement = one SHALL** — don't combine multiple behaviors
2. **Concrete artifacts only** — backtick component names from CR
3. **Measurable outcomes** — timing, counts, states, not adjectives
4. **EARS keywords capitalized** — WHEN, WHILE, IF, THEN, WHERE, SHALL
5. **User stories optional** — include Objective only if it adds clarity
6. **Map every requirement** — must trace to artifact and CR section
7. **Skip if trivial** — simple bug fixes may not need formal requirements

## Integration

**Before**: CR exists with Problem/Scope defined
**After**: 
- `/mdt:architecture` — requirements inform structure decisions
- `/mdt:tasks` — tasks implement requirements
- `/mdt:implement` — verify requirements met

**Workflow position:**
```
/mdt:ticket-creation → /mdt:requirements → /mdt:architecture → /mdt:tasks → /mdt:implement
                              ↑
                         (optional)
```

## When to Skip

Don't generate requirements.md for:
- Simple bug fixes with single-file scope
- Documentation-only changes
- Trivial refactoring without behavioral changes
- CRs with fewer than 3 behavioral needs

Instead, ensure CR Acceptance Criteria (Section 5) covers the needs directly.

Context: $ARGUMENTS
