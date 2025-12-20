# Change Notes

## Recent Updates

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