# MDT Command Reference

> **Organization**: Commands are listed in workflow execution order — from requirements gathering through implementation
> to post-completion analysis.

## /mdt:requirements

**Purpose**: Generate EARS-based requirements specification

**When to use**: After CR creation, before architecture design

**Outputs**: `{TICKETS_PATH}/{CR-KEY}/requirements.md`

**Invocation**:

```bash
/mdt:requirements MDT-001
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
- **Current Implementation Context**: Informational code refs (optional, for enhancements)
- **Artifact Mapping**: Requirement → file mapping (separate from EARS)

**EARS Types** (Pure Behavioral):
| Type | Template | Example |
|------|----------|----------|
| Event | WHEN `<trigger>` the system shall | WHEN user clicks Save, the system shall persist changes |
| State | WHILE `<state>` the system shall | WHILE offline, the system shall queue mutations locally |
| Unwanted | IF `<error>` THEN the system shall | IF timeout, THEN the system shall retry 3 times |

**Code Reference Rules**:

```markdown
# Pure behavioral (new features)

WHEN user clicks tab, the system shall display the document.

# Avoid (constrains architecture)

WHEN user clicks tab, the `useSubDocuments` hook shall call API.
```

## /mdt:tests

**Purpose**: Generate BDD test specifications and executable test files

**When to use**: After requirements, before implementation

**Outputs**:
| Output | Location |
|--------|----------|
| Test spec | `{TICKETS_PATH}/{CR-KEY}/tests.md` |
| Test files | `{test_dir}/integration/*.test.{ext}` |

**Invocation**:

```bash
/mdt:tests MDT-001
```

**Overview**:

- **Mode Detection**: Feature (RED tests) vs Refactoring (GREEN tests)
- **BDD Scenarios**: Gherkin format from EARS requirements
- **Test Files**: Executable tests in project's test directory
- **Coverage Mapping**: Requirement → Test → Task traceability

**Test Strategy by CR Type**:
| CR Type | Input | Test State |
|---------|-------|------------|
| Feature | requirements.md | RED (implementation pending) |
| Refactoring | assess output | GREEN (locking behavior) |
| Bug Fix | CR problem | RED (reproduces bug) |

## /mdt:assess

**Purpose**: Evaluate affected code fitness before architecture design

**When to use**: Before architecture, when integrating into existing code

**Invocation**:

```bash
/mdt:assess MDT-001
```

**Overview**:

- **File Analysis**: Size, coupling, test coverage, churn
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
/mdt:poc MDT-077                              # Interactive - pick from Open Questions
/mdt:poc MDT-077 --question "Does X support Y?"  # Direct question
/mdt:poc MDT-077 --questions                  # List questions from CR
/mdt:poc MDT-077 --quick                      # Brief answer, no poc.md
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

**Workflow Integration**:

```
/mdt:assess
      ↓
/mdt:poc ──── Creates: poc.md (findings for architecture)
      ↓        poc/ folder (throwaway spike)
/mdt:tests
      ↓
/mdt:architecture ── Consumes poc.md
```

## /mdt:domain-lens

**Purpose**: Generate DDD-focused domain model specification

**When to use**: For features with business logic or complex integrations

**Outputs**: `{TICKETS_PATH}/{CR-KEY}/domain.md`

**Invocation**:

```bash
/mdt:domain-lens MDT-001
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
/mdt:domain-audit MDT-077                    # Audit code touched by CR
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
| Missing domain events | Medium |
| Language drift | Low |

*Structural Issues (v2):*
| Issue | Severity |
|-------|----------|
| Layer violation | High |
| Scattered cohesion | High |
| Mixed responsibility | Medium |
| Dependency direction | High |
| Orphan utilities | Medium |

**Output sections**:

- DDD Violations (with evidence)
- Structural Issues (with evidence)
- Dependency Analysis (import graph)
- Domain Concept (what the code is about + natural grouping)
- Recommendations (prioritized fix directions)

**Workflow**:

```
/mdt:domain-audit → domain-audit.md
        ↓
/mdt:architecture --prep → designs fix based on audit findings
        ↓
/mdt:tasks → /mdt:implement
```

## /mdt:architecture

**Purpose**: Generate architecture design with build vs use evaluation

**When to use**: After requirements, before task breakdown

**Outputs**: Architecture Design (CR section) or `{TICKETS_PATH}/{CR-KEY}/architecture.md`

**Invocation**:

```bash
/mdt:architecture MDT-001
```

**Overview**:

- **Extract Existing CR Decisions**: Don't re-evaluate what's already decided in CR
- **Build vs Use Evaluation**: Evaluate existing libraries before building custom (>50 lines triggers)
- **Complexity Assessment**: Score determines output location
- **Key Dependencies**: Documents package choices and rationale
- **Pattern**: Structural approach
- **Shared Patterns**: Logic to extract first (prevents duplication)
- **Structure**: File paths with responsibilities
- **Size Guidance**: Per-module limits (default + hard max)
- **Extension Rule**: "To add X, create Y"
- **Domain Alignment**: Maps domain concepts to files (if domain.md exists)
- **State Flows**: Mermaid diagrams (complex only)
- **Error Scenarios**: Failure handling (complex only)

**Build vs Use Criteria** (all must be YES to use existing):
| Criterion | Question |
|-----------|----------|
| Coverage | Solves ≥50% of requirement? |
| Maturity | Maintained? Recent commits? |
| License | Compatible with project? |
| Footprint | <10 transitive deps? |
| Fit | Consistent with existing deps? |

## /mdt:tasks

**Purpose**: Generate implementation task breakdown with size enforcement

**When to use**: After architecture design, before implementation

**Outputs**: `{TICKETS_PATH}/{CR-KEY}/tasks.md`

**Invocation**:

```bash
/mdt:tasks MDT-001
```

**Overview**:

- **Project Context**: Detected settings
- **Size Thresholds**: Flag/STOP zones
- **Shared Patterns**: From Architecture Design
- **Part 1**: Shared utilities (extract first)
- **Part 2+**: Features (import from Part 1)
- **Post-Implementation**: Verification tasks

## /mdt:implement

**Purpose**: Execute implementation tasks with constraint verification

**When to use**: After task breakdown, to implement the CR

**Invocation**:

```bash
/mdt:implement MDT-001            # Interactive
/mdt:implement MDT-001 --all      # Run all, pause at parts
/mdt:implement MDT-001 --continue # Resume
/mdt:implement MDT-001 --task 1.3 # Specific task
```

**Overview**:

Executes tasks from tasks.md with verification after each task.

**After each task verifies:**

1. Tests pass
2. Size: OK / FLAG / STOP
3. Structure: correct path
4. No duplication

## /mdt:tech-debt

**Purpose**: Detect and document technical debt introduced by implementation

**When to use**: After implementation, before closing CR

**Outputs**: `{TICKETS_PATH}/{CR-KEY}/debt.md`

**Invocation**:

```bash
/mdt:tech-debt MDT-001
```

**Overview**:

- **Size Compliance**: Per-file pass/fail
- **Debt Items**: By severity (High/Medium/Low)
- **Suggested Fixes**: Direction, not implementation
- **Metrics**: Before/after comparison

## /mdt:clarification

**Purpose**: Fill specification gaps in CR sections through targeted questions

**When to use**: When CR sections lack detail needed for architecture or implementation

**Invocation**:

```bash
/mdt:clarification MDT-001
```

**Overview**:

Identifies and resolves specification gaps by asking targeted questions about unclear requirements, ambiguous behaviors,
or missing technical details. Answers are recorded in **Section 8 (Clarifications)** of the CR to maintain decision
history.

**What it addresses**:

- Ambiguous requirements ("user-friendly" → specific criteria)
- Missing edge cases ("what happens if X fails?")
- Unclear constraints ("performance" → measurable targets)
- Incomplete behaviors ("handle errors" → specific error types)
- Integration points (API contracts, data formats)

**Section 8 structure**:

- Question asked during clarification
- Answer provided with artifact references
- Rationale for the decision
- Related CR sections updated

## /mdt:reflection

**Purpose**: Capture learnings and update CR with post-implementation insights

**When to use**: After implementation completion, before closing CR

**Invocation**:

```bash
/mdt:reflection MDT-001
```

**Overview**:

Captures lessons learned during implementation and updates the CR with insights that improve future development cycles.
Reflection transforms experience into actionable knowledge.

**What "learnings" include**:

- **Unexpected discoveries**: Assumptions that proved wrong, hidden complexities
- **Process improvements**: Workflow changes that would have helped
- **Technical insights**: Patterns that worked well, anti-patterns to avoid
- **Missing documentation**: Gaps discovered during implementation
- **Testing insights**: Edge cases missed, test coverage gaps
- **Architecture feedback**: Design decisions that need revision

**CR updates**:

- **Section 8 (Clarifications)**: Add post-implementation learnings
- **Section 1 (Description)**: Update if scope changed significantly
- **Architecture Design**: Note patterns to reuse or avoid
- **Requirements**: Flag ambiguities for future CRs
