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
/mdt:tests ────────────────────── Creates: tests.md + test files (RED)
        │                        BDD specs from requirements or behavior
        │                        Tests written BEFORE implementation
        ▼
/mdt:domain-lens (optional) ────── Creates: domain.md (~15-25 lines)
        │                        DDD constraints for architecture
        │                        ⚠️ Skip for refactoring/tech-debt/CRUD
        ▼
/mdt:architecture ─────────────── Simple: CR section (~60 lines)
        │                        Complex: architecture.md (extracted)
        │                        Consumes poc.md, domain.md if exist
        ▼
/mdt:clarification (as needed)
        │
        ▼
/mdt:tasks ────────────────────── Creates: tasks.md
        │                        Constrained task list
        │                        Each task → makes specific tests GREEN
        ▼
/mdt:implement ────────────────── Executes tasks with TDD verification
        │                        RED → GREEN → Refactor cycle
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
/mdt:assess → code fitness (optional)
        ↓
/mdt:poc → validate uncertain tech (optional)
        ↓
/mdt:tests → BDD tests
        ↓
/mdt:domain-lens (optional) → DDD constraints
        ↓
/mdt:architecture → determines HOW (consumes poc.md, domain.md)
        ↓
/mdt:tasks → /mdt:implement
```

## Refactoring Workflow

```
/mdt:ticket-creation (Full Specification)
        │
        ▼
/mdt:assess (recommended) ─────────── Decision point + test coverage gaps
        │
        ▼
/mdt:domain-audit ─────────────────── Diagnose DDD + structural issues
        │                             Extracts domain concept + natural grouping
        ▼
/mdt:tests ────────────────────────── Behavior preservation tests
        │                             Lock current behavior before changes
        │                             Tests must be GREEN before refactoring
        ▼
/mdt:architecture --prep ──────────── Design fix based on audit findings
        │
        ▼
/mdt:tasks ────────────────────────── Constrained task list
        │
        ▼
/mdt:implement ────────────────────── Execute with verification
        │                             Behavior tests stay GREEN throughout
        ▼
/mdt:tech-debt ────────────────────── Post-implementation analysis
        │
        ▼
/mdt:reflection ───────────────────── Update CR with learnings
```

## Prep Workflow

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

## Debt Prevention Chain

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
│ - Shared patterns → Part 1 (extract before consumers)      │
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

## Technical Debt Fix Workflow

```
debt.md (diagnosis)
    ↓
Create new CR (e.g., "Fix technical debt from {CR-KEY}")
    ↓
/mdt:architecture {NEW-CR-KEY}
    ↓
/mdt:tasks {NEW-CR-KEY}
    ↓
/mdt:implement {NEW-CR-KEY}
```

## TDD/BDD Flow Comparison

### Feature Flow (RED → GREEN)

```
/mdt:requirements → /mdt:tests → /mdt:architecture → /mdt:tasks → /mdt:implement
        │                │                                              │
        ↓                ↓                                              ↓
   EARS specs     Tests written                                   Tests pass
                  (should FAIL)                                   (now GREEN)
```

### Refactoring Flow (GREEN → GREEN)

```
/mdt:assess → /mdt:tests → /mdt:architecture → /mdt:tasks → /mdt:implement
      │            │                                              │
      ↓            ↓                                              ↓
  Find gaps   Lock behavior                                  Behavior
             (must PASS now)                                 preserved
```
