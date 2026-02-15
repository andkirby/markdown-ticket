# MDT Workflows

## Master Decision Tree

```
User Request
     │
     ▼
What type of work?
     │
     ├─► New Feature / Enhancement
     │    │
     │    └─► /mdt:ticket-creation (Requirements or Full)
     │           │
     │           ├─► Complex/uncertain? ──► /mdt:requirements (EARS)
     │           │
     │           ├─► Uncertain tech decisions? ──► /mdt:poc
     │           │
     │           ├─► Need fitness eval? ──► /mdt:assess
     │           │
     │           └─► See Feature Workflow →
     │
     ├─► Refactoring / Tech Debt
     │    │
     │    └─► /mdt:ticket-creation (Full Specification)
     │           │
     │           ├─► Need code eval? ──► /mdt:assess
     │           │
     │           ├─► Need DDD analysis? ──► /mdt:domain-audit
     │           │
     │           ├─► Fundamental restructuring? ──► Prep Workflow →
     │           │
     │           └─► See Refactoring Workflow →
     │
     └─► Bug Fix
          │
          └─► /mdt:ticket-creation (Full)
                 │
                 ├─► Complex? ──► /mdt:requirements (brief)
                 │
                 └─► Feature Workflow →
```

## Feature Workflow

```
/mdt:ticket-creation (Requirements or Full Specification)
        │
        ▼
/mdt:requirements (optional) ─── Creates: requirements.md
        │                        EARS-formatted behavioral specs
        │                        ⚠️ Skip for refactoring/tech-debt
        ▼
/mdt:bdd ──────────────────────── Creates: bdd.md + E2E test files
        │                        User-visible acceptance tests (RED)
        │                        ⚠️ Before architecture - no parts needed
        ▼
/mdt:assess (optional) ────────── Decision point: 1/2/3
        │                        Evaluate code fitness + test coverage
        │
        ├─► Option 1: Just integrate (proceed)
        ├─► Option 2: Refactor inline (expand CR scope)
        └─► Option 3: Split CRs (create refactor CR first)
        │
        ▼
/mdt:poc (optional) ────────────── Creates: poc.md + poc/ folder
        │                        Validate uncertain technical decisions
        │                        ⚠️ Use when "will this work?" needs proof
        ▼
/mdt:domain-lens (optional) ────── Creates: domain.md (concise)
        │                        DDD constraints for architecture
        │                        ⚠️ Skip for refactoring/tech-debt/CRUD
        ▼
/mdt:clarification (as needed) ─── Resolve spec gaps before design/tests
        │                        ⚠️ If behavior changes, update requirements/bdd
        ▼
/mdt:architecture ─────────────── Simple: CR section (concise)
        │                        Complex: architecture.md (extracted)
        │                        Defines: parts, modules, structure
        │                        Consumes: requirements.md, bdd.md, poc.md, domain.md
        ▼
/mdt:tests ────────────────────── Creates: tests.md + unit/integration files
        │                        Module-level tests from architecture
        │                        Part-aware (part-X.Y/tests.md)
        │                        Tests written BEFORE implementation (RED)
        ▼
/mdt:tasks ────────────────────── Creates: tasks.md
        │                        Constrained task list
        │                        Each task → makes specific tests GREEN
        ▼
/mdt:implement ────────────────── Executes tasks with TDD verification
        │                        RED → GREEN → Refactor cycle
        │                        (includes completion verification)
        ▼
/mdt:tech-debt ────────────────── Creates: debt.md
        │                        Post-implementation analysis
        ▼
/mdt:reflection ───────────────── Updates: CR with learnings
```

## Workflow After Requirements Mode

```
/mdt:ticket-creation (Requirements)
        ↓
/mdt:requirements → EARS specifications
        ↓
/mdt:bdd → User-visible acceptance tests (E2E)
        ↓
/mdt:assess → code fitness (optional)
        ↓
/mdt:poc → validate uncertain tech (optional)
        ↓
/mdt:domain-lens (optional) → DDD constraints
        ↓
/mdt:clarification (as needed) → resolve spec gaps before design/tests
        ↓
/mdt:architecture → determines HOW, defines parts (consumes requirements.md, bdd.md, poc.md, domain.md)
        ↓
/mdt:tests → module-level tests (part-aware)
        ↓
/mdt:tasks → /mdt:implement → /mdt:tech-debt → /mdt:reflection
```

## Refactoring Workflow

```
Default rule: Use normal commands for inline refactoring.
Use `--prep` only when `/mdt:assess` signals "⚠️ Prep Required" or for foundational restructuring.

/mdt:ticket-creation (Full Specification)
        │
        ▼
/mdt:assess (recommended) ─────────── Decision point + test coverage gaps
        │                             Prep required?
        ├─► Yes ───────────────────── See Prep Workflow (`--prep` chain)
        │
        └─► No (inline refactor path)
            │
            ▼
/mdt:domain-audit ─────────────────── Diagnose DDD + structural issues
        │                             Extracts domain concept + natural grouping
        ▼
/mdt:bdd (optional) ───────────────── Lock existing E2E user journeys
        │                             Tests should stay GREEN
        ▼
/mdt:architecture (inline) ────────── Design fix based on audit findings
        │
        ▼
/mdt:tests (inline) ───────────────── Behavior preservation tests
        │                             Lock current behavior before changes
        │                             Tests should stay GREEN during refactoring
        ▼
/mdt:tasks ────────────────────────── Constrained task list
        │
        ▼
/mdt:implement ────────────────────── Execute with verification
        │                             Behavior tests stay GREEN throughout
        │                             (includes completion verification)
        ▼
/mdt:tech-debt ────────────────────── Post-implementation analysis
        │
        ▼
/mdt:reflection ───────────────────── Update CR with learnings
```

## Prep Workflow

Use this workflow only when `/mdt:assess` signals "⚠️ Prep Required" or when doing foundational restructuring.

```
/mdt:assess
    │
    └─► "⚠️ Prep Required" signal
        │
        ▼
/mdt:bdd {CR-KEY} --prep (optional)── Creates: prep/bdd.md
        │                            Lock existing E2E behavior (GREEN)
        ▼
/mdt:architecture {CR-KEY} --prep ─── Creates: prep/architecture.md
        │                            Refactoring design
        ▼
/mdt:tests {CR-KEY} --prep ──────── Creates: prep/tests.md
        │                            Lock module behavior (GREEN)
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

## Research Workflow

```
/mdt:ticket-creation (Requirements or Full)
    │
    ▼
/mdt:poc ──────────────────────────── Creates: poc.md + poc/ folder
    │                                 Validate uncertain technical decisions
    │                                 Proof-of-concept implementation
    │                                 ⚠️ Use when "will this work?" needs proof
    ▼
/mdt:reflection ────────────────────── Updates: CR with research findings
    │                                 Documents lessons learned
    │                                 Records technical insights
    │                                 Recommends next steps
    ▼
    Decision Point:
    ┌─────────────────────────────────────┐
    │ Validated?                          │
    ├─────────────────────────────────────┤
    │ Yes → Proceed to feature workflow   │
    │ No → Create new research ticket     │
    │ Maybe → Expand POC scope            │
    └─────────────────────────────────────┘
```

## Debt Prevention Chain

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
│ /mdt:tests                                                  │
│                                                             │
│ Creates:                                                    │
│ - Module tests from architecture (unit/integration)         │
│ - Test→task mapping for TDD verification                    │
│ - Part-aware test files (part-X.Y/tests.md)                 │
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

## Technical Debt Fix Workflow

```
debt.md (diagnosis)
    ↓
Create new CR (e.g., "Fix technical debt from {CR-KEY}")
    ↓
/mdt:architecture {NEW-CR-KEY}
    ↓
/mdt:tests {NEW-CR-KEY}
    ↓
/mdt:tasks {NEW-CR-KEY}
    ↓
/mdt:implement {NEW-CR-KEY}
```

## Test Strategy: BDD + TDD

### Two Test Levels

| Level | Command | When | Input | Tests | State |
|-------|---------|------|-------|-------|-------|
| **BDD (E2E)** | `/mdt:bdd` | Before architecture | requirements.md | User journeys | RED |
| **TDD (Unit/Integration)** | `/mdt:tests` | After architecture | architecture.md | Modules | RED |

### Feature Flow (RED → GREEN)

```
/mdt:requirements → /mdt:bdd → /mdt:architecture → /mdt:tests → /mdt:tasks → /mdt:implement
        │               │              │                │                          │
        ↓               ↓              ↓                ↓                          ↓
   EARS specs     E2E tests      Defines parts    Module tests              All tests GREEN
                  (RED)                           (RED)                     + verified
```

### Prep Refactoring Flow (GREEN → GREEN)

```
/mdt:assess → /mdt:bdd --prep → /mdt:architecture --prep → /mdt:tests --prep → /mdt:tasks --prep → /mdt:implement --prep
      │            │                    │                       │                          │
      ↓            ↓                    ↓                       ↓                          ↓
  Find gaps   Lock E2E            Design fix              Lock modules              Behavior preserved
             (GREEN)                                      (GREEN)                   + verified
```

### Why Two Levels?

| BDD (Acceptance) | TDD (Unit/Integration) |
|------------------|------------------------|
| User perspective | Developer perspective |
| "User can log in" | "AuthService.validate() returns token" |
| No architecture knowledge | Requires architecture |
| Whole feature behavior | Module behavior |
| Playwright, Cypress | Jest, Pytest, Vitest |
| Few, slow, high-value | Many, fast, detailed |
