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
│ - Size Guidance (default + hard max per module)             │
│ - Extension Rule                                            │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ /mdt:tasks                                                  │
│                                                             │
│ Inherits:                                                   │
│ - Size limits → Task Limits (flag/STOP thresholds)          │
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
│ - Size: OK (≤default) / FLAG (≤1.5x) / STOP (>1.5x)         │
│ - Structure: correct path                                   │
│ - No duplication: imports from shared, doesn't copy         │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ /mdt:tech-debt                                              │
│                                                             │
│ Catches what slipped through:                               │
│ - Size violations                                           │
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
    - Defines file structure and size limits per module
    - Creates extension rule for future modifications

2. **Tasks** inherits and enforces constraints:
    - Size limits become flag/STOP thresholds
    - Shared patterns scheduled in Part 1 (before consumers)
    - Adds explicit exclusions and anti-duplication rules

3. **Implement** verifies after each task:
    - OK: ≤ default lines
    - FLAG: ≤ 1.5x default (completes with warning)
    - STOP: > 1.5x default (cannot complete)

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

- Default: 150 lines
- Hard Max: 225 lines

**Exclude** (stays in source):

- Shared validation (already in validators/)
- Output formatting (already in formatters/)

**Anti-duplication**:

- Import `validateUrl` from `validators/input-validators`
- Do NOT implement validation in this file
```

**Components**:

1. **Size Limits**: Default + Hard Max based on module role
2. **Exclude Section**: What stays in source (already extracted elsewhere)
3. **Anti-Duplication**: Import statements required (never copy)

## STOP Conditions

Tasks and orchestrator have explicit escalation for violations:

| Trigger                  | Action                     |
|--------------------------|----------------------------|
| File > Hard Max          | STOP, subdivide or justify |
| Duplicating shared logic | STOP, import instead       |
| Structure mismatch       | STOP, clarify path         |
| Tests fail (2 retries)   | STOP, report failure       |

**Hard Max by Module Role**:

| Role                              | Default | Hard Max |
|-----------------------------------|---------|----------|
| Orchestration (index, main)       | 100     | 150      |
| Feature module                    | 200     | 300      |
| Complex logic (parser, algorithm) | 300     | 450      |
| Utility / helper                  | 75      | 110      |

## Three Zones

| Zone    | Condition         | Action                        |
|---------|-------------------|-------------------------------|
| ✅ OK    | ≤ Default         | Proceed                       |
| ⚠️ FLAG | Default to 1.5x   | Task completes with warning   |
| ⛔ STOP  | > 1.5x (Hard Max) | Cannot complete, must resolve |

**Override Location**: CR Acceptance Criteria or project CLAUDE.md

## TDD/BDD Workflow

### Test-First Development

Tests are **specifications**, not verification. `/mdt:tests` generates executable tests BEFORE implementation:

```
Requirements (EARS) → Tests (BDD/Gherkin) → Implementation → Tests GREEN
         ↑                    ↑                    ↑              ↑
    What should       How to verify        Make it         Prove it
      happen           it works             work            works
```

**Core Principle**: Tests define desired behavior. Implementation makes tests pass. Tests never deleted or weakened.

### Two Modes

| CR Type                 | Test Strategy          | Expected Test State       |
|-------------------------|------------------------|---------------------------|
| Feature / Enhancement   | Behavior specification | RED before implementation |
| Refactoring / Tech-Debt | Behavior preservation  | GREEN before refactoring  |

### Feature Flow (RED → GREEN)

```
/mdt:requirements → /mdt:tests → /mdt:architecture → /mdt:tasks → /mdt:implement
        │                │                                              │
        ↓                ↓                                              ↓
   EARS specs     Tests written                                   Tests pass
                  (should FAIL)                                   (now GREEN)
```

**Process**:

1. `/mdt:tests` reads requirements.md
2. Generates BDD scenarios from EARS statements
3. Creates test files that FAIL (module doesn't exist yet)
4. `/mdt:implement` writes code to make tests GREEN

### Refactoring Flow (GREEN → GREEN)

```
/mdt:assess → /mdt:tests → /mdt:architecture → /mdt:tasks → /mdt:implement
      │            │                                              │
      ↓            ↓                                              ↓
  Find gaps   Lock behavior                                  Behavior
             (must PASS now)                                 preserved
```

**Process**:

1. `/mdt:assess` identifies test coverage gaps
2. `/mdt:tests` generates behavior preservation tests
3. Tests must PASS against current code (locking behavior)
4. `/mdt:implement` refactors while keeping tests GREEN

### TDD Verification in `/mdt:implement`

After each task, verify:

| Check             | Feature CR | Refactoring CR |
|-------------------|------------|----------------|
| Tests exist       | Required   | Required       |
| Initial state     | Were RED   | Were GREEN     |
| Final state       | Now GREEN  | Still GREEN    |
| No tests deleted  | ✓          | ✓              |
| No tests weakened | ✓          | ✓              |

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

4. **Constraints are explicit** — size limits, exclusions, STOP conditions
    - Every task has size limits (default + hard max)
    - Exclude section prevents duplicating shared code
    - STOP conditions block progress on violations

5. **Three-zone verification** — OK, FLAG (warning), STOP (blocked)
    - OK: ≤ default lines, proceed
    - FLAG: ≤ 1.5x default, complete with warning
    - STOP: > 1.5x default, cannot complete

6. **Violations block progress** — cannot mark complete if constraints violated
    - Size > hard max: STOP and subdivide
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

9. **Build vs Use evaluation** — evaluate existing libraries before building custom (>50 lines)
    - All criteria must be YES (coverage, maturity, license, footprint, fit)
    - Prevents NIH syndrome and dependency bloat
    - Triggers assessment at >50 lines of custom code

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
