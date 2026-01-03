# Change Notes

## Recent Updates

### 2026-01-03 - Structural Analysis in Domain Audit

**Problem**: Domain audit workflow only detected DDD violations (anemic models, missing aggregates), missing critical structural problems like layer violations, scattered cohesion, and dependency direction issues that cause maintenance burden and coupling.

**Solution**: Enhanced `/mdt:domain-audit` to detect both DDD violations AND structural issues, with dependency graph analysis and domain concept synthesis that directly informs prep architecture design.

**Changes Made**:

1. **mdt-domain-audit.md (v1→v2) - Structural analysis added**:
   - New Step 2.5: Build dependency graph from imports/requires
   - Step 4: Detect 5 types of structural issues:
     - Layer violation (utils containing presentation, domain importing infrastructure)
     - Scattered cohesion (related concepts spread across directories)
     - Mixed responsibility (files doing multiple unrelated things)
     - Dependency direction (cycles, upward violations)
     - Orphan utilities (helpers used by single consumer)
   - Step 5: Extract Domain Concept (core domain, operations, natural grouping)
   - Updated output format with separate DDD/Structural sections, dependency analysis, domain concept
   - Target size increased: 30-50 lines → 40-60 lines

2. **mdt-architecture.md (v6→v7) - Consumes domain audit findings**:
   - Prep mode now loads `domain-audit.md` as PRIMARY input (diagnosis drives design)
   - Step 1 enhanced: Extract DDD violations, structural issues, dependency analysis, domain concept
   - Architecture decisions informed by audit findings (violations → fixes, domain concept → organizing principle)
   - Updated "Consumes" section to include domain-audit.md for prep/refactoring
   - Workflow diagram updated: domain-audit → architecture for prep path

3. **README.md** - Updated documentation:
   - `/mdt:domain-audit` description: "DDD violations" → "DDD + structural issues"
   - Refactoring workflow updated to include domain-audit step before architecture
   - Detects table expanded with 5 structural issue types
   - Output sections documented (DDD, Structural, Dependencies, Domain Concept)
   - Workflow updated: domain-audit → architecture --prep (no longer needs separate domain-lens)
   - File structure versions updated: domain-audit v2, architecture v7

**Impact**:
- Prep architecture design now driven by evidence-based diagnosis, not guesswork
- Structural problems (layer violations, scattered cohesion) surfaced before design
- Domain concept synthesis provides organizing principle for refactored structure
- Natural grouping suggestions guide consolidation decisions
- Dependency analysis prevents cycles and layer crossing issues

**Files Changed**:
- `prompts/mdt-domain-audit.md`
- `prompts/mdt-architecture.md`
- `prompts/README.md`

### 2025-01-02 - Prep Workflow for Refactoring Before Feature

**Problem**: When assessment identifies that refactoring fundamentally changes the code landscape (e.g., breaking up a God class), the feature architecture depends on the refactored structure. Designing both together in a single architecture.md forced speculative feature design against code that doesn't exist yet.

**Solution**: Added `--prep` flag to architecture, tests, tasks, and implement workflows. Prep work gets its own `prep/` folder with separate architecture.md because refactoring is a different design problem than the feature itself.

**Changes Made**:

1. **mdt-assess.md (v2) - Prep Required signal**:
   - Added "⚠️ Prep Required" signal when refactoring changes code landscape
   - Added "Choose prep workflow when" guidance
   - New execution path for Option 2 with prep workflow
   - Updated workflow diagram to show prep path

2. **mdt-architecture.md (v5→v6) - Prep mode support**:
   - Added `--prep` flag → outputs to `prep/architecture.md`
   - Added "Prep vs Feature Architecture" comparison table
   - Step 0: Detect mode (prep vs feature)
   - Prep mode skips PoC/domain loading (focus on refactoring)
   - Separate completion report for prep mode with next steps

3. **mdt-tests.md (v2→v3) - Prep mode support**:
   - Added `--prep` flag → outputs to `prep/tests.md`
   - Prep mode expects GREEN tests (behavior preservation)
   - Added prep mode to Mode Detection table
   - Updated validation checklist for prep mode

4. **mdt-tasks.md (v5→v6) - Prep mode support**:
   - Added `--prep` flag → outputs to `prep/tasks.md`
   - Reads from `prep/architecture.md` in prep mode
   - Added Critical Rule #6: "Prep reads prep architecture"
   - Updated phase detection to handle prep folder

5. **mdt-implement.md (v5→v6) - Prep mode support**:
   - Added `--prep` flag → executes `prep/tasks.md`
   - TDD verification: GREEN→GREEN for behavior preservation
   - Prep completion report with "Codebase Restructured" message
   - Next steps guide to feature architecture

6. **README.md** - Updated documentation:
   - New "Prep Workflow (Refactoring Before Feature)" section
   - Design Principle #15: "Prep before feature"
   - Updated Output Files table with prep paths
   - Prep file structure and workflow diagram

**Prep File Structure**:
```
{TICKETS_PATH}/{CR-KEY}/
├── architecture.md          # Feature design (AFTER prep)
├── prep/                    # Preparatory refactoring
│   ├── architecture.md     # Refactoring design
│   ├── tests.md            # Behavior preservation tests
│   └── tasks.md            # Refactoring tasks
├── phase-1/                 # Feature phases
│   ├── tests.md
│   └── tasks.md
└── ...
```

**Impact**:
- Feature architecture designed against actual refactored code, not speculation
- Clear separation between refactoring work and feature work
- Behavior preservation enforced through GREEN→GREEN TDD
- Assessment signals when prep workflow is needed

**Files Changed**:
- `prompts/mdt-assess.md`
- `prompts/mdt-architecture.md`
- `prompts/mdt-tests.md`
- `prompts/mdt-tasks.md`
- `prompts/mdt-implement.md`
- `prompts/README.md`

### 2025-12-28 - Proof of Concept Workflow

**Problem**: Architecture workflow locked in unproven technical approaches, leading to mid-implementation pivots when assumptions about library support, performance, or integration behavior turned out wrong.

**Solution**: Added `/mdt:poc` workflow for validating uncertain technical decisions through throwaway spikes before architecture commits to an approach.

**Changes Made**:

1. **mdt-poc.md (v1) - New PoC validation workflow**:
   - Hands-on experimentation for "will this work?" questions
   - Hypothesis-driven approach with success/failure criteria
   - Outputs: `poc.md` (findings for architecture) + `poc/` folder (throwaway spike code)
   - Three invocation modes: interactive (`--questions`), direct (`--question`), quick mode
   - Integration points with requirements (technical Open Questions), assess (integration uncertainty), architecture (consumes findings)
   - Clear scope boundaries: no production concerns, no tests, no clean code

2. **mdt-architecture.md (v5→v6) - PoC-aware architecture**:
   - Step 2: Load PoC findings if `poc.md` exists (validated decisions, use directly)
   - Step 3.5: NEW — Check for technical uncertainty before proceeding
   - Uncertainty detection table with signals and suggested actions
   - User choice: Run PoC first / Proceed with assumption / Research only
   - Updated "Consumes" section to include `poc.md`
   - Enhanced quality checklist with PoC verification

3. **README.md** - Updated documentation:
   - Added `/mdt:poc` to command reference table
   - Updated workflow diagrams to include optional PoC step
   - Added detailed `/mdt:poc` section with invocations, when-to-use table, outputs
   - Updated file structure with new `mdt-poc.md`
   - Updated Design Principle #14: "Prove before commit"

**Impact**:
- Technical uncertainty resolved through experimentation before architecture locks in approach
- Reduces mid-implementation pivots and workarounds for discovered limitations
- Prevents incorrect assumptions from being baked into tests
- Clear separation: research (docs) → PoC (hands-on) → architecture (decisions)

**Files Changed**:
- `prompts/mdt-poc.md` (new)
- `prompts/mdt-architecture.md`
- `prompts/README.md`

### 2025-12-27 - Pure Behavioral Requirements

**Changes Made**:

1. **mdt-requirements.md (v1→v2)**:
   - Pure behavioral EARS: "the system shall" instead of component names
   - CR-type-aware scope: explicit field → CR type → content analysis
   - Four templates: Full, Bug Fix, Behavior Preservation, Migration
   - New sections: FR, NFR, Configuration, Current Implementation Context
   - Early exit for refactoring/tech-debt with clear guidance

2. **mdt-domain-lens.md (v1→v2)**:
   - Exclusion indicators: library types, data structures, DTOs
   - Aggregate quality checks

3. **mdt-ticket-creation.md (v5)** - CR-type-aware workflow recommendations
4. **README.md** - Decision table, updated EARS examples, Design Principles 2-3

**Impact**: Requirements describe WHAT (behavior), architecture decides WHERE/HOW. Refactoring skips EARS entirely.

### 2025-12-22 - Session Context Injection via Hooks

**Problem**: Workflows used hardcoded `docs/CRs/` paths, breaking when projects configured `ticketsPath` differently.

**Solution**: Added `SessionStart` hook that auto-injects `PROJECT_CODE` and `TICKETS_PATH` from `.mdt-config.toml`. Updated all workflows to use `{TICKETS_PATH}` template variable.

**Changes Made**:

1. **hooks/mdt-project-vars.sh (new)** - SessionStart hook script that extracts config values
2. **install-claude.sh** - Installs and registers hook in `~/.claude/settings.json`
3. **CLAUDE.md** - Streamlined to quick-reference format (247→130 lines)
4. **README.md** - Added Session Context documentation
5. **All mdt-*.md workflows** - Replaced `docs/CRs/` with `{TICKETS_PATH}` variable

**Impact**: Workflows now support any `ticketsPath` configuration (`.mdt/specs`, `specs/`, etc.) without manual MCP calls.

**Files Changed**:
- `prompts/hooks/mdt-project-vars.sh` (new)
- `prompts/install-claude.sh`
- `prompts/CLAUDE.md`
- `prompts/README.md`
- `prompts/mdt-*.md` (7 workflows updated)

### 2025-12-20 - Phase-Aware Implementation Workflow

**Problem**: The implementation workflow was monolithic, handling all tasks in a single run without phase separation. This made large CRs difficult to manage, track, and review incrementally.

**Solution**: Enhanced the implementation workflow to support phase-based execution where each phase has its own tasks.md and tests.md, enabling incremental development and better progress tracking.

**Changes Made**:

1. **mdt-implement.md (v4→v5) - Phase-aware orchestration**:
   - Added phase discovery that detects phase-specific tasks and tests
   - New command-line options: `--phase {X.Y}` for specific phase execution
   - Co-location of tasks.md with tests.md in phase folders
   - Phase completion summaries with TDD and size metrics
   - Support for both phased and non-phased CRs (backward compatibility)
   - Enhanced TDD verification with phase-specific test filtering
   - Automatic detection of multiple phases with user selection prompts

2. **mdt-tasks.md (v4→v5) - Phase-specific task generation**:
   - Phase detection based on existing phase-specific tests.md files
   - Output to phase folders: `docs/CRs/{CR-KEY}/phase-{X.Y}/tasks.md`
   - Phase-specific architecture section extraction from architecture.md
   - Co-location strategy: tasks.md created alongside tests.md
   - Phase-specific size thresholds and shared patterns
   - Updated task template with phase requirement IDs (P{X.Y}-N format)
   - Enhanced TDD integration with phase-based test filtering

3. **mdt-tests.md (v1→v2) - Phase-aware test generation**:
   - Added support for phase-specific test generation with `--phase` flag
   - Output to phase folders: `docs/CRs/{CR-KEY}/phase-{X.Y}/tests.md`
   - Phase-specific requirement IDs (P{X.Y}-N) for better traceability
   - Incremental test generation for each phase of development
   - Backward compatibility with non-phased CRs

**Key Features**:
- **Phase Isolation**: Each phase has its own tasks, tests, and progress tracking
- **Co-location Strategy**: tasks.md and tests.md in same phase folder for better organization
- **Incremental Development**: Complete one phase before moving to the next
- **Backward Compatibility**: Existing non-phased CRs continue to work unchanged
- **Smart Phase Detection**: Automatically discovers available phases from test files
- **Progress Tracking**: Phase completion summaries with detailed metrics

**New Folder Structure**:
```
docs/CRs/{CR-KEY}/
├── architecture.md          # All phases (unchanged)
├── phase-1.1/
│   ├── tests.md            # Phase 1.1 tests
│   └── tasks.md            # Phase 1.1 tasks
├── phase-1.2/
│   ├── tests.md
│   └── tasks.md
└── phase-2/
    ├── tests.md
    └── tasks.md
```

**Impact**:
- Large CRs can now be broken into manageable phases with clear boundaries
- Better incremental development and review processes
- Improved organization with co-located test and task files
- Enhanced TDD workflow with phase-specific test filtering
- Maintains full backward compatibility for existing CRs

**Files Changed**:
- `prompts/mdt-implement.md`
- `prompts/mdt-tasks.md`
- `prompts/mdt-tests.md`

### 2025-12-17 - Added Domain-Driven Design Audit Workflow

**Problem**: No mechanism existed to detect Domain-Driven Design violations in existing code, allowing architectural debt to accumulate unchecked and making refactoring decisions uninformed.

**Solution**: Added `/mdt:domain-audit` workflow that analyzes existing code for DDD violations and generates evidence-based reports with fix directions.

**Changes Made**:

1. **mdt-domain-audit.md (v1) - New DDD violations analysis workflow**:
   - Detects 7 types of DDD violations with severity levels
   - Two invocation modes: CR-specific (`MDT-077`) or direct path (`--path src/shared/services`)
   - Generates `domain-audit.md` or standalone timestamped audit reports
   - Evidence-based analysis with fix direction (not prescriptions)
   - Completes DDD toolkit: lens (before) → audit (after) → architecture (design)

2. **README.md** - Updated documentation:
   - Added `/mdt:domain-audit` command reference table entry
   - Documented violation types with severity levels
   - Added workflow diagram showing audit → refactoring CR → domain-lens → architecture
   - Updated file structure to include new workflow
   - Added output location documentation

3. **install-claude.sh** - Updated command list:
   - Added "domain-audit" to MDT_COMMANDS array
   - Maintains alphabetical ordering

**Impact**:
- DDD violations can now be systematically detected and documented
- Refactoring decisions supported by evidence-based analysis
- Completes DDD toolkit with both design guidance and violation detection
- Enables tracking architectural debt patterns across projects

**Files Changed**:
- `prompts/mdt-domain-audit.md` (new)
- `prompts/README.md`
- `prompts/install-claude.sh`

### 2025-12-17 - Added Domain-Driven Design Constraints Workflow

**Problem**: Architecture workflow lacked awareness of domain boundaries and business invariants, leading to structural decisions that violated DDD principles and scattered business logic across module boundaries.

**Solution**: Added optional `/mdt:domain-lens` workflow that surfaces DDD constraints before architecture decisions, ensuring structural designs respect domain boundaries.

**Changes Made**:

1. **mdt-domain-lens.md (v1) - New DDD constraints workflow**:
   - Generates `docs/CRs/{CR-KEY}/domain.md` (~15-25 lines)
   - Identifies bounded contexts, aggregates, invariants, and cross-context operations
   - Language alignment check between CR terms and code terms
   - Intentionally minimal - principles only, not prescriptions
   - Consumed only by architecture workflow

2. **mdt-architecture.md (v4→v5) - Domain-aware architecture**:
   - Step 2: Load domain constraints if domain.md exists
   - Step 4.3: Domain Boundary decision point for cross-context operations
   - Domain Alignment section in output (when domain.md exists)
   - Aggregate roots inform component boundaries
   - Cross-context operations require appropriate patterns (event/service)

3. **README.md** - Updated workflow documentation:
   - Added `/mdt:domain-lens` command reference
   - Integrated into workflow diagrams between tests and architecture
   - Added "When to Use" guidance table
   - Updated file structure with new command

4. **install-claude.sh** - Updated command list:
   - Added "domain-lens" to MDT_COMMANDS array
   - Maintains alphabetical ordering

**When to Use**:
| CR Type | Use Domain Lens? |
|---------|------------------|
| New feature with business logic | ✅ Yes |
| Complex integration | ✅ Yes |
| Simple CRUD | ❌ Skip |
| Refactoring / Tech-debt | ❌ Skip |

**Impact**:
- Architecture decisions now constrained by domain boundaries
- Business invariants properly located within aggregate boundaries
- Cross-context operations use appropriate integration patterns
- Prevents leakage of domain logic across module boundaries

**Files Changed**:
- `prompts/mdt-domain-lens.md` (new)
- `prompts/mdt-architecture.md`
- `prompts/README.md`
- `prompts/install-claude.sh`

### 2025-12-15 - Flexible Specification Depth

**Problem**: Ticket creation forced artifact-focused specifications even when implementation approach was uncertain. Users couldn't describe WHAT they needed without also specifying HOW.

**Solution**: Added two-mode ticket creation — Requirements Mode (WHAT only) vs Full Specification Mode (WHAT + HOW).

**Changes Made**:

1. **mdt-ticket-creation.md (v4→v5)**:
   - New Question 0: Choose "Requirements only" or "Full specification" mode
   - **Requirements Mode** (5 sections): Outcomes, constraints, open questions - defers HOW to architecture
   - **Full Specification Mode** (7 sections): Concrete artifacts and implementation approach (existing behavior)
   - Questions 4, 5, 7 skipped in Requirements Mode
   - Section 3 renamed to "Open Questions" with decisions for architecture
   - Removed "Next Steps" section from document (workflow guidance stays in chat)

2. **README.md** - Updated documentation:
   - New "Specification Depth" section explaining both modes for `/mdt:ticket-creation` 
   - Added Design Principle #1 (flexible depth)
   - Updated File Structure with new version

**Impact**:
- Complex/uncertain features can start with outcome-focused tickets
- Better separation between requirements and implementation
- Architecture workflow determines HOW when Requirements Mode used

**Files Changed**:
- `prompts/mdt-ticket-creation.md`
- `prompts/README.md`

### 2025-12-15 - Build vs Use Evaluation in Architecture

**Problem**: Architecture workflow reinvented solved problems instead of evaluating existing libraries. Common capabilities (CLI parsing, config loading) were being designed from scratch.

**Solution**: Added build-vs-use evaluation step that checks ecosystem for mature solutions before designing custom implementations.

**Changes Made**:

1. **mdt-architecture.md (v3→v4)**:
   - Step 4.1: Extract existing CR decisions first (don't re-evaluate)
   - Step 4.2: Build vs Use evaluation for capabilities >50 lines
   - Evaluation criteria: Coverage, Maturity, License, Footprint, Fit
   - New "Key Dependencies" section in output documenting package choices
   - Language-agnostic search guidance

2. **README.md** - Updated documentation:
   - Updated `/mdt:architecture` command reference with Build vs Use criteria
   - Added Design Principle #2 (build vs use evaluation)
   - Updated File Structure with new version

**Impact**:
- Reduced reinvention of solved problems
- Informed library vs custom decisions with clear criteria
- CR decisions respected — architecture doesn't re-evaluate what's already decided

**Files Changed**:
- `prompts/mdt-architecture.md`
- `prompts/README.md`

### 2025-12-11 - Added Test-Driven Development Workflow

**Problem**: Implementation tasks lacked automated test generation, making it difficult to verify behavior preservation in refactoring and ensure feature correctness.

**Solution**: Added comprehensive BDD test specification workflow that generates tests BEFORE implementation, following TDD principles.

**Changes Made**:

1. **mdt-tests.md (v1) - New TDD workflow**:
   - Generates BDD test specifications from requirements or existing behavior
   - Creates executable test files in project's test directory
   - Two modes: Feature (tests expected behavior) and Refactoring (locks current behavior)
   - Outputs to `docs/CRs/{CR-KEY}/tests.md` + actual test files
   - Supports multiple test frameworks (Jest, Vitest, Playwright, etc.)

2. **Updated workflow integration**:
   - Added `/mdt:tests` command between assess and architecture
   - Tests written BEFORE implementation (RED state)
   - Implementation tasks make specific tests pass (GREEN state)
   - TDD cycle: RED → GREEN → Refactor

3. **Enhanced existing workflows**:
   - **README.md**: Updated workflow diagrams to include tests step
   - **mdt-assess.md**: Now evaluates test coverage gaps alongside code fitness
   - **mdt-implement.md**: Updated to verify TDD cycle completion
   - **mdt-tasks.md**: Each task now specifies which tests it makes pass

**Key Features**:
- **Test-first approach**: Tests define success criteria before implementation
- **Behavior preservation**: Critical for refactoring to prevent regressions
- **BDD format**: Given/When/Then scenarios derived from EARS requirements
- **Framework detection**: Automatically detects project's test framework and structure
- **Integration focus**: Tests public interfaces, not implementation internals

**Impact**:
- Refactoring becomes safer with behavior locked by tests
- Features have clear acceptance criteria through automated tests
- TDD discipline enforced by workflow (tests must exist before implementation)
- Better test coverage through systematic generation based on requirements

**Files Changed**:
- `prompts/mdt-tests.md` (new)
- `prompts/README.md`
- `prompts/mdt-assess.md`
- `prompts/mdt-implement.md`
- `prompts/mdt-tasks.md`

### 2025-12-07 - Improved Refactoring/Tech-Debt Workflow

**Problem**: `/mdt:requirements` workflow with EARS syntax was awkward for refactoring and technical debt tickets, producing constructs like "WHEN the get_cr tool processes markdown content..." instead of clear structural specifications.

**Solution**: Added type-aware guidance that skips behavioral requirements for structural changes.

**Changes Made**:

1. **README.md** - Added "When to Skip `/mdt:requirements`" section explaining:
   - EARS syntax is designed for behavioral specifications
   - Refactoring requires internal restructuring, not user behaviors
   - Recommended flow for refactoring: ticket-creation → assess → architecture → tasks → implement

2. **mdt-ticket-creation.md** - Enhanced post-creation guidance:
   - CR type-specific next steps
   - Explicit instruction to skip `/mdt:requirements` for Technical Debt
   - Clear workflow recommendations based on CR type

3. **mdt-architecture.md** - Added refactoring-specific support:
   - CR type detection in context loading
   - New "Refactoring Transformation" section for simple output
   - Comprehensive "Refactoring Plan" section for complex output:
     - Transformation matrix (from/to/reduction)
     - Interface preservation tracking
     - Behavioral equivalence verification

**Impact**:
- Refactoring CRs now follow a more natural workflow focused on structure
- No more forced behavioral specifications for internal changes
- Clear guidance on interface preservation and behavioral equivalence
- Type-aware workflows adapt to the specific needs of each CR type

**Files Changed**:
- `prompts/README.md`
- `prompts/mdt-ticket-creation.md`
- `prompts/mdt-architecture.md`

### 2025-12-06 - Complete v2 Workflow Documentation Suite

**Problem**: MDT workflows lacked comprehensive documentation and practical guidance for users. The install script was missing new commands and didn't reflect the complete v2 workflow chain.

**Solution**: Added comprehensive workflow guide with strategies and updated all documentation to be consistent.

**Changes Made**:

1. **GUIDE.md** - New comprehensive workflow guide:
   - Full-flow strategy with step-by-step examples
   - Alternative strategies (quick-flow, architecture-first, bug-fix)
   - Best practices and troubleshooting tips
   - Collapsible sections for easy navigation

2. **CLAUDE.md** - Updated with v2 workflow documentation:
   - Installation instructions (global/project/local)
   - Complete workflow chain with all 9 commands
   - Requirements integration details
   - Debt prevention chain explanation

3. **README.md** - Updated with new workflow commands:
   - Added requirements and assess command descriptions
   - Updated typical workflow to show complete chain
   - Added EARS syntax reference for requirements

4. **Workflow Prompts** - Updated for consistency:
   - `mdt-architecture`: v3 with graduated output
   - `mdt-implement`: v2 with verification modes
   - `mdt-tasks`: v2 with phase-based structure
   - `mdt-tech-debt`: v2 diagnostic focus

**Impact**:
- Users now have complete documentation for all v2 workflows
- Practical strategies help users choose the right approach
- Install script accurately reflects all available commands
- Consistent versioning across all workflow prompts

**Files Changed**:
- `prompts/GUIDE.md` (new)
- `prompts/CLAUDE.md`
- `prompts/README.md`
- `prompts/mdt-architecture.md`
- `prompts/mdt-implement.md`
- `prompts/mdt-tasks.md`
- `prompts/mdt-tech-debt.md`

### 2025-12-06 - Install Script Alignment with v2 Workflows

**Problem**: The install script (`install-claude.sh`) was missing the new `requirements` and `assess` commands added in v2, causing incomplete installations.

**Solution**: Updated the MDT_COMMANDS array and workflow display to match the complete v2 workflow documentation.

**Changes Made**:

1. **MDT_COMMANDS Array** - Added missing commands:
   - Added `"requirements"` and `"assess"` to the 9-command array
   - Reordered commands to match README documentation order

2. **Command Descriptions** - Updated to match README table wording:
   - Ensured consistency across all documentation
   - Fixed workflow display from "Typical" to "Full workflow chain"

3. **Installation Verification** - Enhanced to check all 9 commands:
   - Updated verification loop to include new commands
   - Maintained backward compatibility with existing installations

**Impact**:
- Install script now correctly installs all 9 v2 workflow commands
- Users get complete workflow suite without missing components
- Documentation consistency across install script, README, and GUIDE

**Files Changed**:
- `prompts/install-claude.sh`

### 2025-12-06 - Added Requirements and Assess Workflows

**Problem**: MDT workflow lacked formal requirements specification and code fitness assessment, leading to poorly scoped CRs and integration issues.

**Solution**: Added two new workflows and graduated architecture output based on complexity.

**Changes Made**:

1. **mdt-requirements.md (v1)** - New EARS-formatted requirements:
   - Generates behavioral specs using WHEN/WHILE/IF...THEN syntax
   - Creates artifact mapping and traceability
   - Outputs to `docs/CRs/{CR-KEY}/requirements.md`
   - Consumed by architecture, tasks, implement, tech-debt workflows

2. **mdt-assess.md (v1)** - Code fitness assessment:
   - Evaluates affected code before architecture design
   - Fitness scoring: 0-100% per file with verdicts
   - Three options: Integrate / Refactor inline / Split CRs
   - Prevents integration of problematic code

3. **mdt-architecture.md (v2→v3)** - Graduated output:
   - Simple complexity (≤5): Embed in CR (~60 lines)
   - Complex (>5): Extract to `architecture.md` with full details
   - Includes state flows and error scenarios for complex cases

4. **README.md** - Updated workflow chain:
   - Added requirements and assess to the sequence
   - Updated command reference table
   - Added file structure documentation

**Impact**:
- Complete 9-step workflow chain from creation to reflection
- Formal requirements specification with behavioral focus
- Code fitness assessment prevents integration problems
- Architecture output scales with complexity

**Files Changed**:
- `prompts/README.md`
- `prompts/mdt-requirements.md` (new)
- `prompts/mdt-assess.md` (new)
- `prompts/mdt-architecture.md`