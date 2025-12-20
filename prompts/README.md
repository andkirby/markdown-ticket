# MDT Prompt Commands

Structured workflows for AI agents managing Change Request tickets via MCP mdt-all system.

**Works with any project** — Python, TypeScript, Go, Rust, Java, etc. Project context detected from CLAUDE.md or config files.

## Available Workflows

| Command | Purpose | Output |
|---------|---------|--------|
| `/mdt:ticket-creation` | Create CR with flexible depth (WHAT only or WHAT+HOW) | CR in MDT system |
| `/mdt:requirements` | Generate EARS-formatted requirements | `docs/CRs/{CR-KEY}/requirements.md` |
| `/mdt:assess` | Evaluate affected code fitness | Decision: integrate / refactor / split |
| `/mdt:domain-lens` | Surface DDD constraints (optional) | `docs/CRs/{CR-KEY}/domain.md` |
| `/mdt:domain-audit` | Analyze code for DDD violations | `docs/CRs/{CR-KEY}/domain-audit.md` |
| `/mdt:tests` | Generate BDD test specs + executable tests | `docs/CRs/{CR-KEY}/[phase-{X.Y}/]tests.md` + test files |
| `/mdt:architecture` | Surface decisions, define structure + size limits | CR section or `architecture.md` |
| `/mdt:clarification` | Fill specification gaps | Updated CR sections |
| `/mdt:tasks` | Break CR into constrained tasks | `docs/CRs/{CR-KEY}/[phase-{X.Y}/]tasks.md` |
| `/mdt:implement` | Execute tasks with verification | Code changes, updated tasks.md |
| `/mdt:tech-debt` | Detect debt patterns | `docs/CRs/{CR-KEY}/debt.md` |
| `/mdt:reflection` | Capture learnings | Updated CR |

## Specification Depth

`/mdt:ticket-creation` offers two modes, selected as the first question:

| Mode | Focus | Use When |
|------|-------|----------|
| **Requirements only** | WHAT outcome is needed | Complex/uncertain features, defer HOW to architecture |
| **Full specification** | WHAT + HOW with artifacts | Small/well-understood changes, implementation known |

### Requirements Mode (5 sections)

Describes outcomes and constraints, defers implementation to downstream workflows:

```
1. Description (Problem, Affected Areas, Scope)
2. Desired Outcome (Success Conditions, Constraints, Non-Goals)
3. Open Questions (decisions for architecture to make)
4. Acceptance Criteria (outcome-focused)
5. Verification
```

**Workflow after Requirements Mode:**
```
/mdt:ticket-creation (Requirements)
        ↓
/mdt:requirements → EARS specifications
        ↓
/mdt:assess → code fitness (optional)
        ↓
/mdt:tests → BDD tests
        ↓
/mdt:domain-lens (optional) → DDD constraints
        ↓
/mdt:architecture → determines HOW (consumes domain.md)
        ↓
/mdt:tasks → /mdt:implement
```

### Full Specification Mode (7 sections)

Describes both outcomes AND implementation approach with concrete artifacts:

```
1. Description (Problem, Affected Artifacts, Scope)
2. Decision (Chosen Approach, Rationale)
3. Alternatives Considered
4. Artifact Specifications (New, Modified, Integration Points)
5. Acceptance Criteria (artifact-specific)
6. Verification
7. Deployment
```

## Full Workflow Chain

For **Full Specification Mode** (see Requirements Mode workflow above):

```
/mdt:ticket-creation (Full Specification)
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
        │                        Consumes domain.md if exists
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

## When to Skip `/mdt:requirements`

**For refactoring and technical debt CRs, skip `/mdt:requirements`.**

### Why

- **EARS syntax is designed for behavioral specifications** — "WHEN user clicks Save, the system shall persist..."
- Refactoring requires *internal restructuring* specifications, not user-facing behaviors
- Success criteria are structural: size targets, interface preservation, behavioral equivalence
- Requirements become awkward: "WHEN the get_cr tool processes markdown content..."

### Recommended Flow for Refactoring/Tech-Debt

Use **Full Specification Mode** for refactoring (implementation approach is known):

```
/mdt:ticket-creation (Full Specification)
        │
        ▼
/mdt:assess (recommended) ─────────── Decision point + test coverage gaps
        │
        ▼
/mdt:tests ────────────────────────── Behavior preservation tests
        │                             Lock current behavior before changes
        │                             Tests must be GREEN before refactoring
        ▼
/mdt:architecture ─────────────────── Define target structure + size limits
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

### What the CR Should Capture Instead

- **Problem**: What's wrong with current structure (duplication, bloat, coupling)
- **Success criteria**: Size targets, interface preservation, behavioral equivalence
- **Scope boundaries**: What's NOT changing

### When `/mdt:requirements` IS Valuable

- **New features** with multiple user-facing behaviors
- **Complex integrations** where WHEN/IF/WHILE conditions matter
- **Compliance-sensitive work** needing formal traceability

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
│ - Shared patterns → Phase 1 (extract before consumers)      │
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
│ Output: debt.md (diagnosis for fix CR)                      │
└─────────────────────────────────────────────────────────────┘
```

## Size Guidance (Three Zones)

| Zone | Condition | Action |
|------|-----------|--------|
| ✅ OK | ≤ Default | Proceed |
| ⚠️ FLAG | Default to 1.5x | Task completes with warning |
| ⛔ STOP | > 1.5x (Hard Max) | Cannot complete, must resolve |

**Defaults by module role:**

| Role | Default | Hard Max |
|------|---------|----------|
| Orchestration (index, main) | 100 | 150 |
| Feature module | 200 | 300 |
| Complex logic (parser, algorithm) | 300 | 450 |
| Utility / helper | 75 | 110 |

Override in: CR Acceptance Criteria or project CLAUDE.md

## Managing Technical Debt

### When debt.md is generated

`/mdt:tech-debt` produces `docs/CRs/{CR-KEY}/debt.md` — a **diagnostic report**, not an executable task list.

### How to fix debt

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

**debt.md informs what goes into the fix CR:**

| Debt Finding | Fix CR Content |
|--------------|----------------|
| Size violation (745-line file) | "Break down {file} into focused modules" |
| Duplication (logic in 4 places) | "Extract shared {pattern} to utility" |
| Missing abstraction | "Create {type/interface} for {concept}" |
| Shotgun surgery | "Consolidate {concern} to single extension point" |

### Preventing debt (upstream)

| Prevention | How |
|------------|-----|
| Size violations | Architecture defines limits, tasks enforce, implement verifies |
| Duplication | Shared Patterns identified in architecture, extracted in Phase 1 |
| Missing abstractions | Architecture Design surfaces implicit decisions |
| Shotgun surgery | Extension Rule ensures single-point changes |

## Key Concepts

### Shared Patterns (Anti-Duplication)

Architecture Design identifies patterns appearing in 2+ places:

```markdown
### Shared Patterns

| Pattern | Occurrences | Extract To |
|---------|-------------|------------|
| Input validation | all commands | `validators/` |
| Error handling | all handlers | `utils/error-handler` |
```

**Rule**: Phase 1 extracts these BEFORE Phase 2 extracts features.

Features then **import** from shared utilities, never duplicate.

### Task Constraints

Every task includes:

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

### STOP Conditions

Tasks and orchestrator have explicit escalation:

| Trigger | Action |
|---------|--------|
| File > Hard Max | STOP, subdivide or justify |
| Duplicating shared logic | STOP, import instead |
| Structure mismatch | STOP, clarify path |
| Tests fail (2 retries) | STOP, report failure |

## Project Context

Prompts detect project settings from CLAUDE.md or config files:

```yaml
project:
  source_dir: src/        # or lib/, app/, etc.
  test_command: npm test  # or pytest, cargo test, go test
  build_command: npm run build
  file_extension: .ts     # or .py, .rs, .go, .java
```

Tasks and verification use these values — no hardcoded assumptions.

## Command Reference

### `/mdt:requirements`

Generates `docs/CRs/{CR-KEY}/requirements.md`:

- **EARS Syntax**: WHEN/WHILE/IF...THEN/WHERE templates
- **Requirement Groups**: Organized by feature/behavior
- **Artifact Mapping**: Each requirement → primary artifact + integration points
- **Traceability**: Requirements ↔ CR sections

**EARS Types**:
| Type | Template | Example |
|------|----------|----------|
| Event | WHEN `<trigger>` the `<s>` shall | WHEN user clicks Save, the `ProfileService` shall persist |
| State | WHILE `<state>` the `<s>` shall | WHILE offline, the `SyncQueue` shall queue mutations |
| Unwanted | IF `<error>` THEN the `<s>` shall | IF timeout, THEN `RetryHandler` shall retry 3x |

### `/mdt:tests`

Generates BDD test specifications and executable test files:

- **Mode Detection**: Feature (RED tests) vs Refactoring (GREEN tests)
- **BDD Scenarios**: Gherkin format from EARS requirements
- **Test Files**: Executable tests in project's test directory
- **Coverage Mapping**: Requirement → Test → Task traceability

**Outputs**:
| Output | Location |
|--------|----------|
| Test spec | `docs/CRs/{CR-KEY}/tests.md` |
| Test files | `{test_dir}/integration/*.test.{ext}` |

**Test Strategy by CR Type**:
| CR Type | Input | Test State |
|---------|-------|------------|
| Feature | requirements.md | RED (implementation pending) |
| Refactoring | assess output | GREEN (locking behavior) |
| Bug Fix | CR problem | RED (reproduces bug) |

### `/mdt:assess`

Evaluates affected code fitness before architecture:

- **File Analysis**: Size, coupling, test coverage, churn
- **Fitness Score**: 0-100% per file
- **Verdicts**: ✅ Healthy, ⚠️ Concerning, 🔴 Critical
- **Three Options**: Integrate / Refactor inline / Split CRs

**Decision Flow**:
| Option | When to Choose | CR Impact |
|--------|----------------|----------|
| 1. Just Integrate | All healthy, or debt acceptable | No change |
| 2. Refactor Inline | Small refactor improves feature | Scope expands |
| 3. Split CRs | Substantial refactor needed | New CR created, dependency added |

### `/mdt:domain-lens`

Generates `docs/CRs/{CR-KEY}/domain.md` (~15-25 lines):

- **Bounded Context**: Primary context + touched contexts
- **Aggregates**: Root/Internal/Value role assignments
- **Invariants**: Business rules with enforcement location
- **Language Alignment**: CR terms vs code terms (if mismatched)
- **Cross-Context Operations**: Event/Service/Saga patterns needed

**When to Use**:
| CR Type | Use? |
|---------|------|
| New feature with business logic | ✅ Yes |
| Complex integration | ✅ Yes |
| Simple CRUD | ❌ Skip |
| Refactoring / Tech-debt | ❌ Skip |

**Output consumed by**: `/mdt:architecture` only

### `/mdt:domain-audit`

Analyzes existing code for DDD violations. Generates `docs/CRs/{CR-KEY}/domain-audit.md` or standalone report.

**Invocations**:
```bash
/mdt:domain-audit MDT-077                    # Audit code touched by CR
/mdt:domain-audit --path src/shared/services # Audit directory directly
```

**Detects**:
| Violation | Severity |
|-----------|----------|
| Anemic domain model | High |
| Aggregate boundary leak | High |
| God service | High |
| Missing value objects | Medium |
| Invariant scatter | Medium |
| Missing domain events | Medium |
| Language drift | Low |

**Output**: Violations report with evidence + fix direction (not prescriptions)

**Workflow**:
```
/mdt:domain-audit → domain-audit.md
        ↓
    Create refactoring CR
        ↓
/mdt:domain-lens {CR} → target model
        ↓
/mdt:architecture → /mdt:tasks → /mdt:implement
```

### `/mdt:architecture`

Adds Architecture Design to CR (simple) or extracts to `architecture.md` (complex):

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

### `/mdt:tasks`

Generates `docs/CRs/{CR-KEY}/tasks.md`:

- **Project Context**: Detected settings
- **Size Thresholds**: Flag/STOP zones
- **Shared Patterns**: From Architecture Design
- **Phase 1**: Shared utilities (extract first)
- **Phase 2+**: Features (import from Phase 1)
- **Post-Implementation**: Verification tasks

### `/mdt:implement`

Executes tasks with constraint verification:

```bash
/mdt:implement {CR-KEY}            # Interactive
/mdt:implement {CR-KEY} --all      # Run all, pause at phases
/mdt:implement {CR-KEY} --continue # Resume
/mdt:implement {CR-KEY} --task 1.3 # Specific task
```

**After each task verifies:**
1. Tests pass
2. Size: OK / FLAG / STOP
3. Structure: correct path
4. No duplication

### `/mdt:tech-debt`

Generates `docs/CRs/{CR-KEY}/debt.md`:

- **Size Compliance**: Per-file pass/fail
- **Debt Items**: By severity (High/Medium/Low)
- **Suggested Fixes**: Direction, not implementation
- **Metrics**: Before/after comparison

## Installation

### Quick Install (Global)
```bash
# Run from project root - installs to ~/.claude/commands/
bash prompts/install-claude.sh
```

### Local Install (Project-specific)
```bash
# Install to project's .claude/commands/mdt/ (no mdt- prefix)
bash prompts/install-claude.sh --project-path /path/to/project

# Verbose mode with detailed output
bash prompts/install-claude.sh --verbose
```

### Manual Install
```bash
cp prompts/mdt-*.md ~/.claude/commands/
```

## File Structure

```
prompts/
├── README.md                # This file
├── CLAUDE.md                # Development guidance
├── mdt-ticket-creation.md   # CR creation (v5 - flexible depth)
├── mdt-requirements.md      # EARS requirements (v1)
├── mdt-assess.md            # Code fitness assessment (v2)
├── mdt-domain-lens.md       # DDD constraints (v2 - code grounded)
├── mdt-domain-audit.md      # DDD violations analysis (v1)
├── mdt-tests.md             # BDD test generation (v2 - phase aware)
├── mdt-architecture.md      # Architecture design (v5 - domain aware)
├── mdt-clarification.md     # Gap filling
├── mdt-tasks.md             # Task breakdown (v5 - phase aware)
├── mdt-implement.md         # Orchestrator (v5 - phase aware)
├── mdt-tech-debt.md         # Debt detection (v2)
└── mdt-reflection.md        # Learning capture
```

## Output Files

| Workflow | Output Location |
|----------|-----------------|
| `/mdt:requirements` | `docs/CRs/{CR-KEY}/requirements.md` |
| `/mdt:tests` | `docs/CRs/{CR-KEY}/[phase-{X.Y}/]tests.md` + `{test_dir}/*.test.{ext}` |
| `/mdt:domain-lens` | `docs/CRs/{CR-KEY}/domain.md` |
| `/mdt:domain-audit` | `docs/CRs/{CR-KEY}/domain-audit.md` or `docs/audits/domain-audit-{timestamp}.md` |
| `/mdt:architecture` | CR section (simple) or `docs/CRs/{CR-KEY}/architecture.md` (complex) |
| `/mdt:tasks` | `docs/CRs/{CR-KEY}/[phase-{X.Y}/]tasks.md` |
| `/mdt:tech-debt` | `docs/CRs/{CR-KEY}/debt.md` |

## Design Principles

1. **Flexible specification depth** — choose WHAT-only or WHAT+HOW based on certainty
2. **Build vs Use evaluation** — evaluate existing libraries before building custom (>50 lines)
3. **Constraints are explicit** — size limits, exclusions, STOP conditions
4. **Three-zone verification** — OK, FLAG (warning), STOP (blocked)
5. **Shared patterns first** — Phase 1 before Phase 2
6. **Anti-duplication enforced** — import from shared, never copy
7. **Project-agnostic** — works with any language/stack
8. **Violations block progress** — cannot mark complete if constraints violated
9. **debt.md is diagnosis** — fix via new CR, not direct execution
10. **Requirements flow downstream** — requirements.md consumed by architecture, tasks, implement, tech-debt
11. **Phase isolation** — epic CRs use phase folders for tests.md and tasks.md

## Phased CRs (Epic Tickets)

For large CRs with multiple implementation phases, the workflow supports **phase-aware file organization**.

### When to Use Phases

| CR Scope | Approach |
|----------|----------|
| Single feature, <10 tasks | Non-phased (root level tests.md/tasks.md) |
| Multiple phases in architecture.md | Phase folders (phase-1.1/, phase-1.2/, etc.) |
| Epic with distinct milestones | Phase folders |

### Phase Detection

Phases are detected from `## Phase X.Y:` headers in `architecture.md`:

```markdown
## Phase 1.1: Enhanced Project Validation
...
## Phase 1.2: Enhanced Ticket Validation
...
## Phase 2: Additional Contracts
```

### Phased File Structure

```
docs/CRs/{CR-KEY}/
├── architecture.md          # All phases (master design doc)
├── requirements.md          # All phases (if exists)
├── domain.md                # All phases (if exists)
├── phase-1.1/
│   ├── tests.md            # Phase 1.1 test specs
│   └── tasks.md            # Phase 1.1 task list
├── phase-1.2/
│   ├── tests.md
│   └── tasks.md
└── phase-2/
    ├── tests.md
    └── tasks.md
```

### Phased Workflow

```
/mdt:architecture ─────────── Creates architecture.md with ## Phase X.Y sections
        │
        ▼
/mdt:tests --phase 1.1 ────── Creates: phase-1.1/tests.md
        │
        ▼
/mdt:tasks --phase 1.1 ────── Creates: phase-1.1/tasks.md (auto-detects from tests.md)
        │
        ▼
/mdt:implement --phase 1.1 ── Executes phase-1.1/tasks.md, verifies phase-1.1/tests.md
        │
        ▼
    [Phase 1.1 Complete]
        │
        ▼
/mdt:tests --phase 1.2 ────── Creates: phase-1.2/tests.md
        │
        ▼
    ... continue ...
```

### Phase Commands

| Command | Behavior |
|---------|---------|
| `/mdt:tests MDT-101` | Detects phases, prompts for selection |
| `/mdt:tests MDT-101 --phase 1.1` | Targets specific phase directly |
| `/mdt:tasks MDT-101` | Auto-detects from existing phase-*/tests.md |
| `/mdt:implement MDT-101` | Lists phases with completion status |
| `/mdt:implement MDT-101 --phase 1.2` | Targets specific phase |

### Backward Compatibility

Non-phased CRs work exactly as before:

```
docs/CRs/{CR-KEY}/
├── architecture.md (or embedded in CR)
├── tests.md
└── tasks.md
```

If no `## Phase X.Y:` headers exist in architecture.md, prompts default to root-level output.

## TDD/BDD Workflow

### Test-First Development

Tests are **specifications**, not verification. `/mdt:tests` generates executable tests BEFORE implementation:

```
Requirements (EARS) → Tests (BDD/Gherkin) → Implementation → Tests GREEN
         ↑                    ↑                    ↑              ↑
    What should       How to verify        Make it         Prove it
      happen           it works             work            works
```

### Two Modes

| CR Type | Test Strategy | Expected Test State |
|---------|---------------|--------------------|
| Feature / Enhancement | Behavior specification | RED before implementation |
| Refactoring / Tech-Debt | Behavior preservation | GREEN before refactoring |

### Feature Flow (RED → GREEN)

```
/mdt:requirements → /mdt:tests → /mdt:architecture → /mdt:tasks → /mdt:implement
        │                │                                              │
        ↓                ↓                                              ↓
   EARS specs     Tests written                                   Tests pass
                  (should FAIL)                                   (now GREEN)
```

1. `/mdt:tests` reads requirements.md
2. Generates BDD scenarios from EARS statements
3. Creates test files that FAIL (module doesn't exist)
4. `/mdt:implement` writes code to make tests GREEN

### Refactoring Flow (GREEN → GREEN)

```
/mdt:assess → /mdt:tests → /mdt:architecture → /mdt:tasks → /mdt:implement
      │            │                                              │
      ↓            ↓                                              ↓
  Find gaps   Lock behavior                                  Behavior
             (must PASS now)                                 preserved
```

1. `/mdt:assess` identifies test coverage gaps
2. `/mdt:tests` generates behavior preservation tests
3. Tests must PASS against current code (locking behavior)
4. `/mdt:implement` refactors while keeping tests GREEN

### TDD Verification in `/mdt:implement`

After each task, verify:

| Check | Feature CR | Refactoring CR |
|-------|------------|----------------|
| Tests exist | Required | Required |
| Initial state | Were RED | Were GREEN |
| Final state | Now GREEN | Still GREEN |
| No tests deleted | ✓ | ✓ |
| No tests weakened | ✓ | ✓ |

---

## Requirements Integration

When `requirements.md` exists, downstream prompts consume it:

| Prompt | How It Uses requirements.md |
|--------|-----------------------------|
| `/mdt:tests` | Transforms EARS → BDD scenarios, creates test files |
| `/mdt:architecture` | Maps components to requirements, validates coverage |
| `/mdt:tasks` | Each task has `**Implements**: R1.1, R1.2` + `**Tests**: test_xxx` |
| `/mdt:implement` | Verifies tests GREEN, marks requirements satisfied |
| `/mdt:tech-debt` | Flags unsatisfied requirements as High severity debt |
