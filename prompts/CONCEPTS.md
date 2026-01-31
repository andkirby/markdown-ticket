# MDT Concepts

## Debt Prevention Chain

Debt prevention is a chain across four workflows that progressively enforce constraints:

```
┌─────────────────────────────────────────────────────────────┐
│ /mdt:architecture                                           │
│                                                             │
│ Defines:                                                    │
│ - Pattern (structural approach)                             │
│ - Shared Patterns (extract FIRST to prevent duplication)    │
│ - Structure (file paths)                                    │
│ - Scope Boundaries (what each module owns)                  │
│ - Extension Rule                                            │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ /mdt:tasks                                                  │
│                                                             │
│ Inherits:                                                   │
│ - Scope boundaries → Task constraints (flag/STOP thresholds)│
│ - Shared patterns → Part 1 (extract before consumers)       │
│                                                             │
│ Adds:                                                       │
│ - Exclude section (what NOT to move)                        │
│ - Anti-duplication (import, don't copy)                     │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ /mdt:implement                                              │
│                                                             │
│ Verifies after each task:                                   │
│ - Scope: OK / FLAG / STOP (boundary breaches)               │
│ - Structure: correct path                                   │
│ - No duplication: imports from shared, doesn't copy         │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ /mdt:tech-debt                                              │
│                                                             │
│ Catches what slipped through:                               │
│ - Scope boundary violations                                 │
│ - Duplication                                               │
│ - Missing abstractions                                      │
│ - Shotgun surgery patterns                                  │
│                                                             │
│ Output: debt.md (diagnostic for fix CR)                     │
└─────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Architecture Design** establishes the constraints:
    - Identifies shared patterns appearing in 2+ places
    - Defines file structure and module responsibility boundaries
    - Creates extension rule for future modifications

2. **Tasks** inherits and enforces constraints:
    - Scope boundaries become flag/STOP thresholds
    - Shared patterns scheduled in Part 1 (before consumers)
    - Adds explicit exclusions and anti-duplication rules

3. **Implement** verifies after each task:
    - OK: Scope and boundaries respected
    - FLAG: Minor scope spillover or small duplication
    - STOP: Multiple responsibilities or cross-layer mixing

4. **Tech-Debt** catches violations:
    - Post-implementation analysis detects what slipped through
    - Produces diagnostic report for fix CR

## Shared Patterns (Anti-Duplication)

Architecture Design identifies patterns appearing in 2+ places to prevent duplication:

```markdown
### Shared Patterns

| Pattern | Occurrences | Extract To |
|---------|-------------|------------|
| Input validation | all commands | `validators/` |
| Error handling | all handlers | `utils/error-handler` |
```

**Rule**: Part 1 extracts these BEFORE Part 2 extracts features. Features then **import** from shared utilities, never
duplicate.

**Why This Matters**:

- Duplication creates maintenance burden (fix same bug in N places)
- Shared patterns identified early prevent shotgun surgery
- Features stay smaller when they import rather than reimplement

## Task Constraints

Every task includes explicit limits to prevent scope creep:

```markdown
### Task 2.1: Extract summarize command

**Limits**:

- Scope: Validation only; no formatting or persistence
- Boundary: Orchestration stays in caller; helpers extracted if reused

**Exclude** (stays in source):

- Shared validation (already in validators/)
- Output formatting (already in formatters/)

**Anti-duplication**:

- Import `validateUrl` from `validators/input-validators`
- Do NOT implement validation in this file
```

**Components**:

1. **Scope Limits**: What this task owns, and what it must not touch
2. **Exclude Section**: What stays in source (already extracted elsewhere)
3. **Anti-Duplication**: Import statements required (never copy)

## STOP Conditions

Tasks and orchestrator have explicit escalation for violations:

| Trigger                  | Action                     |
|--------------------------|----------------------------|
| Scope boundary breached  | STOP, subdivide or clarify |
| Duplicating shared logic | STOP, import instead       |
| Structure mismatch       | STOP, clarify path         |
| Tests fail (2 retries)   | STOP, report failure       |

## Three Zones

| Zone    | Condition         | Action                        |
|---------|-------------------|-------------------------------|
| ✅ OK    | Within scope      | Proceed                       |
| ⚠️ FLAG | Minor spillover   | Task completes with warning   |
| ⛔ STOP  | Boundary breach   | Cannot complete, must resolve |

**Override Location**: CR Acceptance Criteria or project CLAUDE.md

## BDD + TDD Workflow

### Two Test Levels

SDD uses two distinct test levels, each with its own command:

| Level | Command | When | Input | Focus | Framework |
|-------|---------|------|-------|-------|----------|
| **BDD (Acceptance)** | `/mdt:bdd` | Before architecture | requirements.md | User-visible behavior | Playwright, Cypress |
| **TDD (Unit/Integration)** | `/mdt:tests` | After architecture | architecture.md | Module behavior | Jest, Pytest, Vitest |

### Why Two Levels?

| BDD (Acceptance) | TDD (Unit/Integration) |
|------------------|------------------------|
| User perspective | Developer perspective |
| "User can log in" | "AuthService.validate() returns token" |
| No architecture knowledge | Requires architecture |
| Whole feature behavior | Module/part behavior |
| Few, slow, high-value | Many, fast, detailed |

**Key Insight**: Classical BDD said "tests before architecture" to prevent premature design. But that only works for acceptance-level tests. Module tests **require** knowing the module structure.

### Test-First Principle

Both levels follow test-first:

```
Requirements → BDD Tests (E2E) → Architecture → TDD Tests (Unit) → Implementation
     ↑              ↑                 ↑               ↑                  ↑
   WHAT         User behavior      HOW          Module behavior      Make it
   needed       (RED)              structured   (RED)                GREEN
```

**Core Principle**: Tests define desired behavior. Implementation makes tests pass. Tests never deleted or weakened.

### Feature Flow (RED → GREEN)

```
/mdt:requirements → /mdt:bdd → /mdt:architecture → /mdt:tests → /mdt:tasks → /mdt:implement
        │              │              │                  │                        │
        ↓              ↓              ↓                  ↓                        ↓
   EARS specs    E2E tests      Defines parts     Module tests             All tests
                 (RED)                             (RED)                   now GREEN
```

**Process**:

1. `/mdt:bdd` reads requirements.md, generates E2E tests (Playwright/Cypress)
2. E2E tests are RED (feature doesn't exist yet)
3. `/mdt:architecture` defines module structure and parts
4. `/mdt:tests` reads architecture.md, generates module tests
5. Module tests are RED (modules don't exist yet)
6. `/mdt:implement` writes code to make all tests GREEN

### Refactoring Flow (GREEN → GREEN)

```
/mdt:assess → /mdt:bdd --prep → /mdt:architecture → /mdt:tests → /mdt:tasks → /mdt:implement
      │            │                    │                │                        │
      ↓            ↓                    ↓                ↓                        ↓
  Find gaps   Lock E2E            Design fix       Lock modules            Behavior
              (GREEN)                               (GREEN)                preserved
```

**Process**:

1. `/mdt:bdd --prep` locks existing user journeys (tests must be GREEN now)
2. `/mdt:architecture` designs the refactoring
3. `/mdt:tests --prep` locks existing module behavior (tests must be GREEN now)
4. `/mdt:implement` refactors while keeping ALL tests GREEN

### TDD Verification in `/mdt:implement`

After each task, verify:

| Check | Feature CR | Refactoring CR |
|-------|------------|----------------|
| BDD tests exist | Required | Required |
| Module tests exist | Required | Required |
| BDD initial state | Were RED | Were GREEN |
| Module initial state | Were RED | Were GREEN |
| BDD final state | Now GREEN | Still GREEN |
| Module final state | Now GREEN | Still GREEN |
| No tests deleted | ✓ | ✓ |
| No tests weakened | ✓ | ✓ |

**If refactoring tests go RED**: You've broken existing behavior — STOP and fix.

## Multi-Part CRs (Epic Tickets)

> **Quick summary**: Split large CRs into `part-X.Y/` folders. Detected from `## Part X.Y:` headers in architecture.md.

For large CRs with multiple implementation parts, the workflow supports **part-aware file organization**.

### When to Use Parts

| CR Scope                          | Approach                                   |
|-----------------------------------|--------------------------------------------|
| Single feature, <10 tasks         | Single-part (root level tests.md/tasks.md) |
| Multiple parts in architecture.md | Part folders (part-1.1/, part-1.2/, etc.)  |
| Epic with distinct milestones     | Part folders                               |

### Part Detection

Parts are detected from `## Part X.Y:` headers in `architecture.md`:

```markdown
## Part 1.1: Enhanced Project Validation

...

## Part 1.2: Enhanced Ticket Validation

...

## Part 2: Additional Contracts
```

### Multi-Part File Structure

```
{TICKETS_PATH}/{CR-KEY}/
├── architecture.md          # All parts (master design doc)
├── requirements.md          # All parts (if exists)
├── domain.md                # All parts (if exists)
├── part-1.1/
│   ├── tests.md            # Part 1.1 test specs
│   └── tasks.md            # Part 1.1 task list
├── part-1.2/
│   ├── tests.md
│   └── tasks.md
└── part-2/
    ├── tests.md
    └── tasks.md
```

### Multi-Part Workflow

```
/mdt:architecture ─────────── Creates architecture.md with ## Part X.Y sections
        │
        ▼
/mdt:tests --part 1.1 ────── Creates: part-1.1/tests.md
        │
        ▼
/mdt:tasks --part 1.1 ────── Creates: part-1.1/tasks.md (auto-detects from tests.md)
        │
        ▼
/mdt:implement --part 1.1 ── Executes part-1.1/tasks.md, verifies part-1.1/tests.md
        │
        ▼
    [Part 1.1 Complete]
        │
        ▼
/mdt:tests --part 1.2 ────── Creates: part-1.2/tests.md
        │
        ▼
    ... continue ...
```

### Part Commands

| Command                             | Behavior                                   |
|-------------------------------------|--------------------------------------------|
| `/mdt:tests MDT-101`                | Detects parts, prompts for selection       |
| `/mdt:tests MDT-101 --part 1.1`     | Targets specific part directly             |
| `/mdt:tasks MDT-101`                | Auto-detects from existing part-*/tests.md |
| `/mdt:implement MDT-101`            | Lists parts with completion status         |
| `/mdt:implement MDT-101 --part 1.2` | Targets specific part                      |

### Backward Compatibility

Single-part CRs work exactly as before:

```
{TICKETS_PATH}/{CR-KEY}/
├── architecture.md (or embedded in CR)
├── tests.md
└── tasks.md
```

If no `## Part X.Y:` headers exist in architecture.md, prompts default to root-level output.

## Prep Workflow (Refactoring Before Feature)

> **Quick summary**: When refactoring fundamentally changes the code landscape, use prep workflow to refactor first,
> then design the feature against the new structure.

When `/mdt:assess` identifies that **refactoring fundamentally changes the code landscape** (e.g., breaking up a God
class, introducing new services), the feature architecture depends on the refactored structure. Use the **prep workflow
** to design and execute refactoring first.

### When to Use Prep

| Situation                               | Use Prep?              |
|-----------------------------------------|------------------------|
| Minor extraction (one utility)          | ❌ No — refactor inline |
| God class → multiple services           | ✅ Yes                  |
| Feature interacts with NEW components   | ✅ Yes                  |
| Refactoring benefits unrelated features | ❌ No — split CRs       |

**Key Question**: Does the feature architecture depend on the refactored structure?

### Prep vs Parts

| Concept   | Purpose                          | Architecture             |
|-----------|----------------------------------|--------------------------|
| **Prep**  | Get codebase ready (refactoring) | `prep/architecture.md`   |
| **Parts** | Implement feature incrementally  | Shared `architecture.md` |

Prep is a **different design problem** than the feature — it gets its own architecture file.

### Prep File Structure

```
{TICKETS_PATH}/{CR-KEY}/
├── architecture.md          # Feature design (created AFTER prep)
├── prep/                    # Preparatory refactoring
│   ├── architecture.md     # Refactoring design
│   ├── tests.md            # Behavior preservation tests (GREEN)
│   └── tasks.md            # Refactoring tasks
├── part-1/                  # Feature parts (after prep)
│   ├── tests.md            # Feature tests (RED → GREEN)
│   └── tasks.md
└── ...
```

### Prep Workflow

```
/mdt:assess
    │
    └─► "⚠️ Prep Required" signal
        │
        ▼
/mdt:architecture {CR-KEY} --prep ─── Creates: prep/architecture.md
        │                            Refactoring design
        ▼
/mdt:tests {CR-KEY} --prep ──────── Creates: prep/tests.md
        │                            Lock current behavior (GREEN)
        ▼
/mdt:tasks {CR-KEY} --prep ──────── Creates: prep/tasks.md
        │                            Refactoring tasks
        ▼
/mdt:implement {CR-KEY} --prep ──── Execute refactoring
        │                            Tests stay GREEN
        ▼
    *** Codebase Restructured ***
        │
        ▼
/mdt:architecture {CR-KEY} ─────── Creates: architecture.md
        │                            Feature design against NEW code
        ▼
/mdt:tests {CR-KEY} --part 1 ──── Normal feature workflow...
        │
        ▼
    ... continue ...
```

### Prep Commands

| Command                         | Behavior                                    |
|---------------------------------|---------------------------------------------|
| `/mdt:architecture {CR} --prep` | Design refactoring → `prep/architecture.md` |
| `/mdt:tests {CR} --prep`        | Lock behavior (tests should be GREEN)       |
| `/mdt:tasks {CR} --prep`        | Generate refactoring tasks                  |
| `/mdt:implement {CR} --prep`    | Execute refactoring, verify GREEN→GREEN     |

### Prep TDD: GREEN → GREEN

Unlike feature development (RED → GREEN), prep uses **behavior preservation**:

| Mode     | Before | After | Meaning                     |
|----------|--------|-------|-----------------------------|
| Feature  | RED    | GREEN | New behavior implemented    |
| **Prep** | GREEN  | GREEN | Existing behavior preserved |

**If prep tests go RED**: You've broken existing behavior — STOP and fix.

## Design Principles

### Specification

1. **Flexible specification depth** — choose WHAT-only or WHAT+HOW based on certainty
    - Requirements mode: WHAT outcome needed
    - Full specification: WHAT + HOW with artifacts
    - Decision made at CR creation based on project context

2. **Requirements describe WHAT, not WHERE** — pure behavioral EARS; architecture decides implementation
    - EARS uses "the system shall" without component references
    - No coupling to specific implementation artifacts
    - Architecture maps requirements to concrete structure

3. **CR-type-aware formatting** — new features get full requirements; refactoring skips EARS
    - New Feature/Enhancement: Full behavioral requirements
    - Bug Fix: Minimal targeted requirements with code refs
    - Refactoring/Tech-Debt: Skip requirements workflow

### Constraints & Verification

4. **Constraints are explicit** — scope boundaries, exclusions, STOP conditions
    - Every task has explicit scope and boundary rules
    - Exclude section prevents duplicating shared code
    - STOP conditions block progress on violations

5. **Three-zone verification** — OK, FLAG (warning), STOP (blocked)
    - OK: Within scope, proceed
    - FLAG: Minor spillover, complete with warning
    - STOP: Boundary breach, cannot complete

6. **Violations block progress** — cannot mark complete if constraints violated
    - Scope boundary breached: STOP and subdivide
    - Duplication detected: STOP and import
    - Structure mismatch: STOP and clarify
    - Tests fail (2 retries): STOP and report

### Architecture & Duplication Prevention

7. **Shared patterns first** — Part 1 before Part 2
    - Architecture identifies patterns appearing 2+ places
    - Tasks schedules extraction in Part 1
    - Features in Part 2+ import from shared

8. **Anti-duplication enforced** — import from shared, never copy
    - Every task has "Anti-duplication" section
    - Verifies imports, prevents copy-paste
    - Part 1 extracts, Part 2+ imports

9. **Build vs Use evaluation** — evaluate existing libraries before building custom
    - All criteria must be YES (coverage, maturity, license, footprint, fit)
    - Prevents NIH syndrome and dependency bloat
    - Triggers assessment when custom build is non-trivial

### Workflow Organization

10. **Requirements flow downstream** — requirements.md consumed by architecture, tasks, implement, tech-debt
    - Tests transforms EARS → BDD scenarios
    - Architecture maps components to requirements
    - Tasks mark requirement coverage per task
    - Tech-debt flags unsatisfied requirements

11. **debt.md is diagnosis** — fix via new CR, not direct execution
    - Post-implementation analysis produces diagnostic report
    - Fix CR created to address findings
    - Prevents "drive-by fixes" that bypass review

12. **Part isolation** — epic CRs use part folders for tests.md and tasks.md
    - Parts detected from `## Part X.Y:` headers in architecture.md
    - Separate test/task files per part
    - Backward compatible with single-part CRs

### Technical Decision Support

13. **Project-agnostic** — works with any language/stack
    - Detects context from CLAUDE.md or config files
    - No hardcoded assumptions about build/test commands
    - Works with TypeScript, Python, Go, Rust, Java, etc.

14. **Prove before commit** — uncertain technical decisions get PoC spikes before architecture locks in approach
    - `/mdt:poc` creates throwaway code in `poc/` folder (gitignored)
    - Findings documented in `poc.md`, consumed by architecture
    - Validates "will this work?" before committing to approach

15. **Prep before feature** — when refactoring changes the code landscape, design and execute refactoring first
    - Prep workflow: assess → architecture (prep) → tests (GREEN) → tasks → implement
    - Feature designs against NEW code structure
    - GREEN→GREEN verification preserves behavior
