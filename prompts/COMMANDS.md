# MDT Command Reference

> **Organization**: Commands are listed in workflow execution order — from requirements gathering through implementation
> to post-completion analysis.

## /mdt:requirements

**Purpose**: Generate EARS-based requirements specification

**When to use**: After CR creation, before BDD tests

**Outputs**: `{TICKETS_PATH}/{CR-KEY}/requirements.md`

**Invocation**:

```bash
/mdt:requirements ABC-001
```

**Core Principle**: Requirements describe WHAT the system does, not WHERE or HOW. Architecture decides implementation.

**CR Type Detection**:
| CR Type | Format | Code Refs in EARS? |
|---------|--------|-------------------|
| New Feature | Pure behavioral | No |
| Enhancement | Pure behavioral | No |
| Bug Fix | Minimal, targeted | Yes (precision) |
| Refactoring | **Skip workflow** | — |
| Tech Debt | **Skip workflow** | — |

**Output Sections** (New Feature/Enhancement):

- **Behavioral Requirements (EARS)**: Pure behavioral specs using "the system shall"
- **Functional Requirements**: Capability table (FR-1, FR-2, ...)
- **Non-Functional Requirements**: Quality attributes with measurable targets
- **Configuration Requirements**: Env vars, defaults, rationale (if configurable)
- **Artifact Mapping**: Requirement → file mapping (separate from EARS)

**EARS Types** (Pure Behavioral):
| Type | Template | Example |
|------|----------|----------|
| Event | WHEN `<trigger>` the system shall | WHEN user clicks Save, the system shall persist changes |
| State | WHILE `<state>` the system shall | WHILE offline, the system shall queue mutations locally |
| Unwanted | IF `<e>` THEN the system shall | IF timeout, THEN the system shall retry 3 times |

## /mdt:bdd

**Purpose**: Generate BDD acceptance tests from requirements (user-visible behavior)

**When to use**: After requirements, BEFORE architecture

**Outputs**:
| Output | Location |
|--------|----------|
| BDD spec | `{TICKETS_PATH}/{CR-KEY}/bdd.md` |
| E2E test files | `{e2e_dir}/*.spec.{ext}` (Playwright, Cypress, etc.) |

**Invocation**:

```bash
/mdt:bdd ABC-001           # Normal mode - specify new behavior (RED)
/mdt:bdd ABC-001 --prep    # Prep mode - lock existing behavior (GREEN)
```

**Overview**:

- **User Perspective**: Tests describe what user sees/does, not internal mechanics
- **No Architecture Needed**: BDD tests don't reference components or modules
- **Gherkin Format**: Given/When/Then scenarios
- **E2E Focus**: Test through real interfaces (browser, API, CLI)

**Test Strategy by Mode**:
| Mode | Input | Test State | Purpose |
|------|-------|------------|---------|
| Normal | requirements.md | RED | Specify new behavior |
| Prep (`--prep`) | existing system | GREEN | Lock behavior before refactoring |

**Key Distinction from /mdt:tests**:
| /mdt:bdd | /mdt:tests |
|----------|------------|
| User-visible behavior | Module-level behavior |
| Before architecture | After architecture |
| No part awareness | Part-aware |
| E2E tests | Unit/Integration tests |

## /mdt:assess

**Purpose**: Evaluate affected code fitness before architecture design

**When to use**: Before architecture, when integrating into existing code

**Invocation**:

```bash
/mdt:assess ABC-001
```

**Overview**:

- **File Analysis**: Cohesion, coupling, test coverage, churn
- **Fitness Score**: 0-100% per file
- **Verdicts**: Healthy, Concerning, Critical
- **Three Options**: Integrate / Refactor inline / Split CRs

**Decision Flow**:
| Option | When to Choose | CR Impact |
|--------|----------------|----------|
| 1. Just Integrate | All healthy, or debt acceptable | No change |
| 2. Refactor Inline | Small refactor improves feature | Scope expands |
| 3. Split CRs | Substantial refactor needed | New CR created, dependency added |

## /mdt:poc

**Purpose**: Validate uncertain technical decisions through hands-on experimentation

**When to use**: When architecture depends on unproven technical assumptions

**Outputs**:
| Output | Location | Purpose |
|--------|----------|--------|
| Findings | `{TICKETS_PATH}/{CR-KEY}/poc.md` | Consumed by architecture |
| Spike code | `{TICKETS_PATH}/{CR-KEY}/poc/` | Throwaway, gitignored |

**Invocations**:

```bash
/mdt:poc ABC-077                              # Interactive - pick from Open Questions
/mdt:poc ABC-077 --question "Does X support Y?"  # Direct question
/mdt:poc ABC-077 --questions                  # List questions from CR
/mdt:poc ABC-077 --quick                      # Brief answer, no poc.md
```

**Overview**:

- **Throwaway Spikes**: Code lives in `poc/` folder (gitignored, not committed)
- **Thorough Investigation**: Build working examples to answer "will this work?"
- **Findings Document**: `poc.md` captures decisions for architecture

**When to Use**:
| Situation | Use PoC? |
|-----------|----------|
| "Does library X support feature Y?" | Yes |
| "Can we achieve performance target?" | Yes |
| "How does service behave when...?" | Yes |
| Code organization question | No (that's architecture) |
| Question answerable by docs | No (just read docs) |

## /mdt:domain-lens

**Purpose**: Generate DDD-focused domain model specification

**When to use**: For features with business logic or complex integrations

**Outputs**: `{TICKETS_PATH}/{CR-KEY}/domain.md`

**Invocation**:

```bash
/mdt:domain-lens ABC-001
```

**Overview**:

- **Bounded Context**: Primary context + touched contexts
- **Aggregates**: Root/Internal/Value role assignments
- **Invariants**: Business rules with enforcement location
- **Language Alignment**: CR terms vs code terms (if mismatched)
- **Cross-Context Operations**: Event/Service/Saga patterns needed

**When to Use**:
| CR Type | Use? |
|---------|------|
| New feature with business logic | Yes |
| Complex integration | Yes |
| Simple CRUD | Skip |
| Refactoring / Tech-debt | Skip |

**Output consumed by**: `/mdt:architecture` only

## /mdt:domain-audit

**Purpose**: Analyze existing code for DDD violations and structural issues

**When to use**: Before refactoring or when diagnosing code quality issues

**Outputs**:

- `{TICKETS_PATH}/{CR-KEY}/domain-audit.md` (CR-specific)
- Standalone report (directory audit)

**Invocations**:

```bash
/mdt:domain-audit ABC-077                    # Audit code touched by CR
/mdt:domain-audit --path src/shared/services # Audit directory directly
```

**Overview**:

Detects DDD violations and structural problems that impede maintainability.

*DDD Violations:*
| Violation | Severity |
|-----------|----------|
| Anemic domain model | High |
| Aggregate boundary leak | High |
| God service | High |
| Missing value objects | Medium |
| Invariant scatter | Medium |

*Structural Issues:*
| Issue | Severity |
|-------|----------|
| Layer violation | High |
| Scattered cohesion | High |
| Mixed responsibility | Medium |
| Dependency direction | High |

## /mdt:architecture

**Purpose**: Generate architecture design with build vs use evaluation

**When to use**: After BDD tests, before module-level tests

**Outputs**: Architecture Design (CR section) or `{TICKETS_PATH}/{CR-KEY}/architecture.md`

**Invocation**:

```bash
/mdt:architecture ABC-001           # Feature architecture
/mdt:architecture ABC-001 --prep    # Prep (refactoring) architecture
```

**Overview**:

- **Consumes**: requirements.md, bdd.md, poc.md, domain.md (if exist)
- **Build vs Use Evaluation**: Evaluate existing libraries before building custom
- **Scope Assessment**: Decide embed vs extract based on scope
- **Pattern**: Structural approach
- **Shared Patterns**: Logic to extract first (prevents duplication)
- **Structure**: File paths with responsibilities
- **Scope Boundaries**: What each module owns and must not touch
- **Extension Rule**: "To add X, create Y"
- **Part Definition**: Multi-part CRs get `## Part X.Y:` sections

**Build vs Use Criteria** (all must be YES to use existing):
| Criterion | Question |
|-----------|----------|
| Coverage | Solves ≥50% of requirement? |
| Maturity | Maintained? Recent commits? |
| License | Compatible with project? |
| Footprint | <10 transitive deps? |
| Fit | Consistent with existing deps? |

## /mdt:tests

**Purpose**: Generate unit/integration test specifications from architecture

**When to use**: AFTER architecture (which defines modules and parts)

**Outputs**:
| Output | Location |
|--------|----------|
| Test spec | `{TICKETS_PATH}/{CR-KEY}/tests.md` (or `part-X.Y/tests.md`) |
| Test files | `{test_dir}/unit/*.test.{ext}`, `{test_dir}/integration/*.test.{ext}` |

**Invocation**:

```bash
/mdt:tests ABC-001                # Single-part or prompt for part
/mdt:tests ABC-001 --part 1.1     # Specific part
/mdt:tests ABC-001 --prep         # Prep mode (lock module behavior)
```

**Overview**:

- **Requires Architecture**: Cannot run without architecture.md defining modules
- **Part-Aware**: Each part gets its own tests.md in part folder
- **Module-Level Focus**: Tests components, services, adapters (not user journeys)
- **Coverage Mapping**: Module → Test → Task traceability

**Test Strategy by Mode**:
| Mode | Input | Test State |
|------|-------|------------|
| Feature | architecture.md | RED (implementation pending) |
| Refactoring | architecture.md | GREEN (locking behavior) |
| Prep (`--prep`) | prep/architecture.md | GREEN (locking behavior) |

**Key Distinction from /mdt:bdd**:
| /mdt:tests | /mdt:bdd |
|------------|----------|
| Module-level behavior | User-visible behavior |
| After architecture | Before architecture |
| Part-aware | No part awareness |
| Unit/Integration tests | E2E tests |

## /mdt:tasks

**Purpose**: Generate implementation task breakdown with scope enforcement

**When to use**: After tests, before implementation

**Outputs**: `{TICKETS_PATH}/{CR-KEY}/tasks.md` (or `part-X.Y/tasks.md`)

**Invocation**:

```bash
/mdt:tasks ABC-001
/mdt:tasks ABC-001 --part 1.1
/mdt:tasks ABC-001 --prep
```

**Overview**:

- **Project Context**: Detected settings
- **Scope Boundaries**: Flag/STOP zones from architecture
- **Shared Patterns**: From Architecture Design
- **Part 1**: Shared utilities (extract first)
- **Part 2+**: Features (import from Part 1)
- **Test Mapping**: Each task lists which tests it makes GREEN

## /mdt:implement

**Purpose**: Execute implementation tasks with constraint verification

**When to use**: After task breakdown, to implement the CR

**Invocation**:

```bash
/mdt:implement ABC-001            # Interactive
/mdt:implement ABC-001 --all      # Run all, pause at parts
/mdt:implement ABC-001 --continue # Resume
/mdt:implement ABC-001 --task 1.3 # Specific task
/mdt:implement ABC-001 --part 1.1 # Specific part
/mdt:implement ABC-001 --prep     # Prep implementation
```

**Overview**:

Executes tasks from tasks.md with verification after each task.

**After each task verifies:**

1. Tests pass (module tests + affected BDD tests)
2. Scope: OK / FLAG / STOP
3. Structure: correct path
4. No duplication

## /mdt:tech-debt

**Purpose**: Detect and document technical debt introduced by implementation

**When to use**: After implementation, before closing CR

**Outputs**: `{TICKETS_PATH}/{CR-KEY}/debt.md`

**Invocation**:

```bash
/mdt:tech-debt ABC-001
```

**Overview**:

- **Scope Compliance**: Per-file pass/fail
- **Debt Items**: By severity (High/Medium/Low)
- **Suggested Fixes**: Direction, not implementation
- **Metrics**: Before/after comparison

## /mdt:clarification

**Purpose**: Fill specification gaps in CR sections through targeted questions

**When to use**: When CR sections lack detail needed for architecture or implementation

**Invocation**:

```bash
/mdt:clarification ABC-001
```

**Overview**:

Identifies and resolves specification gaps by asking targeted questions about unclear requirements, ambiguous behaviors,
or missing technical details. Answers are recorded in **Section 8 (Clarifications)** of the CR.

## /mdt:reflection

**Purpose**: Capture learnings and update CR with post-implementation insights

**When to use**: After implementation completion, before closing CR

**Invocation**:

```bash
/mdt:reflection ABC-001
```

**Overview**:

Captures lessons learned during implementation and updates the CR with insights that improve future development cycles.

**What "learnings" include**:

- **Unexpected discoveries**: Assumptions that proved wrong, hidden complexities
- **Process improvements**: Workflow changes that would have helped
- **Technical insights**: Patterns that worked well, anti-patterns to avoid
- **Testing insights**: Edge cases missed, test coverage gaps
- **Architecture feedback**: Design decisions that need revision
