# MDT Prompt Commands

Structured workflows for AI agents managing Change Request tickets via MCP mdt-all system.

**Works with any project** — Python, TypeScript, Go, Rust, Java, etc. Project context detected from CLAUDE.md or config files.

## Session Context (Auto-Injected)

All workflows have access to these variables, injected at session start via a `SessionStart` hook:

| Variable | Source | Example |
|----------|--------|---------|
| `PROJECT_CODE` | `.mdt-config.toml` → `code` | `MDT`, `API`, `WEB` |
| `TICKETS_PATH` | `.mdt-config.toml` → `ticketsPath` | `docs/CRs`, `.mdt/specs` |

**How it works**: The hook (`~/.claude/hooks/mdt-project-vars.sh`) runs automatically on session start, reads the project config, and outputs variables visible to the LLM.

**Benefits**:
- No hardcoded paths in workflows — works with any `ticketsPath` configuration
- Automatic project code detection — no manual specification needed
- Per-project configuration — each repo can have different CR directory structures

## Available Workflows

| Command | Purpose | Output |
|---------|---------|--------|
| `/mdt:ticket-creation` | Create CR with flexible depth (WHAT only or WHAT+HOW) | CR in MDT system |
| `/mdt:requirements` | Generate requirements (EARS + FR/NFR) with CR-type-aware format | `{TICKETS_PATH}/{CR-KEY}/requirements.md` |
| `/mdt:assess` | Evaluate affected code fitness | Decision: integrate / refactor / split |
| `/mdt:poc` | Validate uncertain technical decisions | `{TICKETS_PATH}/{CR-KEY}/poc.md` + `poc/` folder |
| `/mdt:domain-lens` | Surface DDD constraints (optional) | `{TICKETS_PATH}/{CR-KEY}/domain.md` |
| `/mdt:domain-audit` | Analyze code for DDD violations | `{TICKETS_PATH}/{CR-KEY}/domain-audit.md` |
| `/mdt:tests` | Generate BDD test specs + executable tests | `{TICKETS_PATH}/{CR-KEY}/[phase-{X.Y}/]tests.md` + test files |
| `/mdt:architecture` | Surface decisions, define structure + size limits | CR section or `architecture.md` |
| `/mdt:clarification` | Fill specification gaps | Updated CR sections |
| `/mdt:tasks` | Break CR into constrained tasks | `{TICKETS_PATH}/{CR-KEY}/[phase-{X.Y}/]tasks.md` |
| `/mdt:implement` | Execute tasks with verification | Code changes, updated tasks.md |
| `/mdt:tech-debt` | Detect debt patterns | `{TICKETS_PATH}/{CR-KEY}/debt.md` |
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

## When to Use `/mdt:requirements`

### Quick Decision Table

| CR Type | Use `/mdt:requirements`? | Alternative |
|---------|-------------------------|-------------|
| New feature | ✅ Yes (full) | — |
| Enhancement | ✅ Yes (full) | — |
| Complex bug fix | ✅ Yes (brief) | — |
| Simple bug fix | ❌ No | CR Acceptance Criteria |
| Refactoring | ❌ No | `/mdt:assess` → `/mdt:architecture` |
| Tech Debt | ❌ No | `/mdt:architecture` directly |
| Documentation | ❌ No | No requirements needed |
| Migration | ✅ Yes (hybrid) | — |

### Why Skip for Refactoring/Tech-Debt

- **EARS describes behavior** — refactoring *preserves* behavior, doesn't define new behavior
- **Focus is structural** — size targets, interface preservation, not WHEN/THEN statements
- **Requirements become awkward** — "WHEN the cache module processes entries..." isn't useful

### Recommended Flow for Refactoring/Tech-Debt

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

### When `/mdt:requirements` IS Valuable

- **New features** with multiple user-facing behaviors
- **Complex integrations** where WHEN/IF/WHILE conditions matter
- **Configurable features** needing FR/NFR/Configuration tables
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

`/mdt:tech-debt` produces `{TICKETS_PATH}/{CR-KEY}/debt.md` — a **diagnostic report**, not an executable task list.

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

Generates `{TICKETS_PATH}/{CR-KEY}/requirements.md` with CR-type-aware format:

**Core Principle**: Requirements describe WHAT the system does, not WHERE or HOW. Architecture decides implementation.

**CR Type Detection**:
| CR Type | Format | Code Refs in EARS? |
|---------|--------|-------------------|
| New Feature | Pure behavioral | ❌ No |
| Enhancement | Pure behavioral | ❌ No |
| Bug Fix | Minimal, targeted | ✅ Yes (precision) |
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
# ✅ Pure behavioral (new features)
WHEN user clicks tab, the system shall display the document.

# ❌ Avoid (constrains architecture)
WHEN user clicks tab, the `useSubDocuments` hook shall call API.
```

### `/mdt:tests`

Generates BDD test specifications and executable test files:

- **Mode Detection**: Feature (RED tests) vs Refactoring (GREEN tests)
- **BDD Scenarios**: Gherkin format from EARS requirements
- **Test Files**: Executable tests in project's test directory
- **Coverage Mapping**: Requirement → Test → Task traceability

**Outputs**:
| Output | Location |
|--------|----------|
| Test spec | `{TICKETS_PATH}/{CR-KEY}/tests.md` |
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

### `/mdt:poc`

Validates uncertain technical decisions through hands-on experimentation:

- **Throwaway Spikes**: Code lives in `poc/` folder (gitignored, not committed)
- **Thorough Investigation**: Build working examples to answer "will this work?"
- **Findings Document**: `poc.md` captures decisions for architecture

**Invocations**:
```bash
/mdt:poc MDT-077                              # Interactive - pick from Open Questions
/mdt:poc MDT-077 --question "Does X support Y?"  # Direct question
/mdt:poc MDT-077 --questions                  # List questions from CR
/mdt:poc MDT-077 --quick                      # Brief answer, no poc.md
```

**When to Use**:
| Situation | Use PoC? |
|-----------|----------|
| "Does library X support feature Y?" | ✅ Yes |
| "Can we achieve performance target?" | ✅ Yes |
| "How does service behave when...?" | ✅ Yes |
| Code organization question | ❌ No (that's architecture) |
| Question answerable by docs | ❌ No (just read docs) |

**Outputs**:
| Output | Location | Purpose |
|--------|----------|--------|
| Findings | `{TICKETS_PATH}/{CR-KEY}/poc.md` | Consumed by architecture |
| Spike code | `{TICKETS_PATH}/{CR-KEY}/poc/` | Throwaway, gitignored |

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

### `/mdt:domain-lens`

Generates `{TICKETS_PATH}/{CR-KEY}/domain.md` (~15-25 lines):

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

Analyzes existing code for DDD violations. Generates `{TICKETS_PATH}/{CR-KEY}/domain-audit.md` or standalone report.

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

Generates `{TICKETS_PATH}/{CR-KEY}/tasks.md`:

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

Generates `{TICKETS_PATH}/{CR-KEY}/debt.md`:

- **Size Compliance**: Per-file pass/fail
- **Debt Items**: By severity (High/Medium/Low)
- **Suggested Fixes**: Direction, not implementation
- **Metrics**: Before/after comparison

## Installation

### Hook Setup (Required for Session Context)

The `SessionStart` hook auto-injects `PROJECT_CODE` and `TICKETS_PATH` variables. Already configured if you see:

```bash
~/.claude/hooks/mdt-project-vars.sh  # Hook script
~/.claude/settings.json              # Contains SessionStart hook registration
```

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

Install `/mdt:*` commands:

```bash
cp prompts/mdt-*.md ~/.claude/commands/
```

Also copy hooks/mdt-project-vars.sh to ~/.claude/hooks/ and register in settings.json:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/mdt-project-vars.sh"
          }
        ]
      }
    ]
  }
}
```

## File Structure

```
prompts/
├── README.md                # This file
├── CLAUDE.md                # Development guidance
├── install-claude.sh        # Installation script (includes hook setup)
├── hooks/
│   └── mdt-project-vars.sh  # SessionStart hook for PROJECT_CODE/TICKETS_PATH
├── mdt-ticket-creation.md   # CR creation (v5 - flexible depth)
├── mdt-requirements.md      # Requirements with FR/NFR (v2 - CR-type-aware)
├── mdt-assess.md            # Code fitness assessment (v2)
├── mdt-poc.md               # Proof of concept spikes (v1)
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
| `/mdt:requirements` | `{TICKETS_PATH}/{CR-KEY}/requirements.md` |
| `/mdt:tests` | `{TICKETS_PATH}/{CR-KEY}/[phase-{X.Y}/]tests.md` + `{test_dir}/*.test.{ext}` |
| `/mdt:domain-lens` | `{TICKETS_PATH}/{CR-KEY}/domain.md` |
| `/mdt:domain-audit` | `{TICKETS_PATH}/{CR-KEY}/domain-audit.md` or `docs/audits/domain-audit-{timestamp}.md` |
| `/mdt:poc` | `{TICKETS_PATH}/{CR-KEY}/poc.md` + `poc/` folder (gitignored) |
| `/mdt:architecture` | CR section (simple) or `{TICKETS_PATH}/{CR-KEY}/architecture.md` (complex) |
| `/mdt:tasks` | `{TICKETS_PATH}/{CR-KEY}/[phase-{X.Y}/]tasks.md` |
| `/mdt:tech-debt` | `{TICKETS_PATH}/{CR-KEY}/debt.md` |

## Design Principles

1. **Flexible specification depth** — choose WHAT-only or WHAT+HOW based on certainty
2. **Requirements describe WHAT, not WHERE** — pure behavioral EARS; architecture decides implementation
3. **CR-type-aware formatting** — new features get full requirements; refactoring skips EARS
4. **Build vs Use evaluation** — evaluate existing libraries before building custom (>50 lines)
5. **Constraints are explicit** — size limits, exclusions, STOP conditions
6. **Three-zone verification** — OK, FLAG (warning), STOP (blocked)
7. **Shared patterns first** — Phase 1 before Phase 2
8. **Anti-duplication enforced** — import from shared, never copy
9. **Project-agnostic** — works with any language/stack
10. **Violations block progress** — cannot mark complete if constraints violated
11. **debt.md is diagnosis** — fix via new CR, not direct execution
12. **Requirements flow downstream** — requirements.md consumed by architecture, tasks, implement, tech-debt
13. **Phase isolation** — epic CRs use phase folders for tests.md and tasks.md
14. **Prove before commit** — uncertain technical decisions get PoC spikes before architecture locks in approach

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
{TICKETS_PATH}/{CR-KEY}/
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
{TICKETS_PATH}/{CR-KEY}/
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
| `/mdt:architecture` | Maps components to requirements, validates coverage; uses FR/NFR for constraints |
| `/mdt:tasks` | Each task has `**Implements**: R1.1, R1.2` + `**Tests**: test_xxx` |
| `/mdt:implement` | Verifies tests GREEN, marks requirements satisfied |
| `/mdt:tech-debt` | Flags unsatisfied requirements as High severity debt |

**Requirements Document Sections** (v2):
| Section | Purpose | Used By |
|---------|---------|---------|
| Behavioral Requirements (EARS) | What the system does | Tests, Architecture |
| Functional Requirements (FR) | Specific capabilities | Architecture, Tasks |
| Non-Functional Requirements (NFR) | Quality targets | Architecture, Implement |
| Configuration Requirements | Env vars, defaults | Architecture, Implement |
| Artifact Mapping | Req → file traceability | Tasks, Tech-Debt |
