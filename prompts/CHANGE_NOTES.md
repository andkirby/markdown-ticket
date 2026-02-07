# Change Notes

## Recent Updates

### 2026-02-07 - Version Management and Tooling Improvements

**Problem**: Plugin version management was manual and error-prone. The `/update-notes` workflow lacked version increment automation, and the sync script had poor documentation and error messages.

**Solution**: Added automated version increment script with smart beta/release handling. Enhanced `/update-notes` workflow with version increment step. Improved `.sync` script documentation and error messages.

**Changes Made**:

1. **scripts/mdt-version-increment.sh (new) - Semantic version automation**:
   - `beta` action: Smart beta increment (stable→beta, beta→beta.1, beta.1→beta.2)
   - `release` action: Strip pre-release suffix (0.11.0-beta.22 → 0.11.0)
   - `minor` action: Increment minor version on stable (0.10.0 → 0.11.0)
   - `patch` action: Increment patch version on stable (0.10.0 → 0.10.1)
   - `--dry-run` flag for preview mode
   - Parses semver with optional suffixes (beta, rc, etc.)
   - Validates version state before applying changes

2. **update-notes.md (v4→v5) - Version increment workflow added**:
   - New Step 8: Version Increment with action selection
   - Decision table for increment type based on change analysis
   - Smart beta increment guidance with examples
   - `--skip-version` flag to bypass version step
   - Integration with `mdt-version-increment.sh` script

3. **.sync (v3→v4) - Documentation and error handling**:
   - Added comprehensive header docstring
   - Improved usage message with clear "Modes" and "Options" sections
   - Better error message for unknown mode
   - Consistent formatting across all help text

4. **plugin.json - Format normalization**:
   - Keywords array pretty-printed (multi-line vs single-line)
   - No functional changes (json formatting only)

5. **..sync-down-commit.sh (new) - Quick sync helper**:
   - One-command sync down + commit workflow
   - Shortcut for `.sync down && git add -u && git commit -m 'update'`

**Impact**:
- Automated version management prevents manual errors
- Consistent semver practices across releases
- Better sync script documentation reduces confusion
- Quick sync-commit shortcut for common workflow

**Files Changed**:
- `prompts/scripts/mdt-version-increment.sh` (new)
- `prompts/.claude/commands/update-notes.md` (v4→v5)
- `prompts/.sync` (v3→v4)
- `prompts/mdt/.claude-plugin/plugin.json` (format only)
- `prompts/..sync-down-commit.sh` (new)

---

### 2026-02-07 - Workflow Consistency and Completion Messaging

**Problem**: Implementation workflows had inconsistent verbosity and completion messaging. `implement.md` was overly detailed with extensive bash code examples and verbose completion templates, while `implement-agentic.md` lacked a final completion step. Other workflows (`tests.md`, `tasks.md`) had no completion messaging at all. The workflow ordering was also incorrect (architecture→tasks instead of architecture→tests→tasks).

**Solution**: Standardized all workflows with concise, focused guidance and consistent completion messaging. Simplified verbose prose into compact decision tables. Added completion templates to all workflows. Fixed workflow ordering to match TDD practice (tests before tasks).

**Changes Made**:

1. **implement.md (v8→v9) - Radical simplification and consistency**:
   - Replaced verbose bash code with concise decision tables
   - Step 1: Collapsed 8 subsections (1a-1h) into 5 focused steps (1a-1e)
   - Removed verbose sub-agent context template (was redundant with Step 2c)
   - Removed verbose error handling section (logic covered in behavioral rules)
   - Simplified completion templates (prep, part, full completion)
   - Streamlined "Next Steps" to single actionable command instead of multi-step lists
   - Step 7: Acceptance verification simplified to decision table
   - Step 7b: Completion verification streamlined verdict handling
   - Behavioral rules: 11→9 rules (consolidated redundancy)

2. **implement-agentic.md (v3→v3) - Final completion step added**:
   - Added Step 9: Final Completion with summary template
   - Template shows: mode, summary table, verification counts, next steps
   - Matches implement.md completion messaging style
   - Added Integration section with workflow position and before/after

3. **tasks.md (v8→v8) - Completion messaging added**:
   - New "Completion" section with prep/feature mode templates
   - Shows: CR key, output location, task count, next command
   - Matches completion style of other workflows

4. **tests.md (v7→v7) - Completion messaging added**:
   - New "Completion" section with prep/feature mode templates
   - Shows: CR key, output location, status emoji (GREEN/RED), next command
   - Matches completion style of other workflows

5. **architecture.md (v9→v9) - Workflow ordering fixed**:
   - Next step changed from `/mdt:tasks` to `/mdt:tests`
   - Aligns with TDD workflow: tests before tasks (RED state before implementation)

6. **mdt/README.md - Quick install instructions added**:
   - New "Quick Install (via install script)" section
   - Shows `--local` and `--docker` usage
   - Added `claude plugin enable` command with scope options
   - Preserved "Manual Install" section for alternative installation

7. **install-plugin.sh - Enable instruction added**:
   - Prints plugin enable command after installation
   - Shows both local and user scope options

**Impact**:
- Consistent completion messaging across all workflows
- Reduced verbosity improves readability and token efficiency
- TDD workflow ordering corrected (tests→tasks, not tasks→tests)
- Users get clear "what next" guidance after each workflow step
- Plugin enable instruction shown after installation (prevents confusion)

**Files Changed**:
- `prompts/mdt/commands/implement.md` (v8→v9)
- `prompts/mdt/commands/implement-agentic.md` (v3→v3)
- `prompts/mdt/commands/tasks.md` (v8→v8)
- `prompts/mdt/commands/tests.md` (v7→v7)
- `prompts/mdt/commands/architecture.md` (v9→v9)
- `prompts/mdt/README.md`
- `prompts/install-plugin.sh`

---

### 2026-02-05 - Plugin Marketplace Installation System

**Problem**: The old `install-claude.sh` script used a manual file-copying approach to install MDT commands. This was fragile, didn't integrate with Claude Code's plugin system, and couldn't properly bundle the MCP server with the plugin. Additionally, the MCP server needed different configurations for local development vs Docker environments.

**Solution**: Migrated to Claude Code's official marketplace plugin system with a smart installer that generates environment-appropriate MCP configuration.

**Changes Made**:

1. **install-plugin.sh (new)** - Smart marketplace installer:
   - Replaces `install-claude.sh` with marketplace-based installation
   - `--local` flag: Generates `.mcp.json` for local Node.js MCP server at `$PROJECT_ROOT/mcp-server/dist/index.js`
   - `--docker` flag: Generates `.mcp.json` for Docker HTTP MCP server at `http://localhost:3012/mcp`
   - Auto-detects project root from script location (portable across environments)
   - Validates MCP server exists before generating config
   - Removes existing marketplace before reinstalling
   - Can be run from any directory (uses absolute paths)
   - MCP server name: `"all"` (matches the mdt-all MCP scope)

2. **.claude-plugin/marketplace.json (new)** - Marketplace configuration:
   - Marketplace name: `"markdown-ticket"`
   - Plugin name: `"mdt"`
   - Source: `./mdt` (plugin directory)
   - Keywords: tickets, kanban, markdown, workflow, tdd, bdd, requirements

3. **install-claude.sh - DELETED**:
   - Removed old manual installation script in favor of marketplace system

**Impact**:
- Official Claude Code plugin marketplace integration
- Portable MCP configuration across different environments (local/Docker)
- Automatic plugin discovery and management via Claude Code CLI
- Cleaner installation/uninstallation via `claude plugin marketplace`
- Proper MCP server bundling with the plugin

**Files Changed**:
- `prompts/install-plugin.sh` (new)
- `prompts/.claude-plugin/marketplace.json` (new)
- `prompts/install-claude.sh` (deleted)

**Usage**:
```bash
# From any directory
/path/to/markdown-ticket/prompts/install-plugin.sh --local   # Local Node.js MCP
/path/to/markdown-ticket/prompts/install-plugin.sh --docker  # Docker HTTP MCP
```

---

### 2026-02-05 - Smart Project Area Detection in CR Creation

**Problem**: The `/mdt:ticket-creation` workflow used generic area names like "Frontend", "Backend", "API" when inferring affected areas. These generic terms often didn't match actual project structures, leading to CRs that didn't reflect the real codebase organization and caused confusion during implementation.

**Solution**: Enhanced the area inference logic to scan actual project directories and use real folder names instead of generic terms.

**Changes Made**:

1. **ticket-creation.md (v9 - minor update)** - Project-aware area inference:
   - Updated `AREAS` parameter inference to scan top-level directories (`ls -d */`)
   - Changed from generic "Frontend/Backend/Shared" to actual folder names like `src/`, `lib/`, `tests/`, `api/`
   - Added explicit instruction: "List top-level directories in the project...use actual folder names. Do NOT use generic terms"
   - Updated confirmation display to use compact bullet list instead of verbose table
   - Updated refine mode questions to reference actual directories

2. **plugin.json** - Cleanup:
   - Removed stale reference to `./agents/test.md` (already deleted in v3 update)
   - Agent list now accurately reflects current state

**Impact**:
- CRs now accurately reflect actual project structure (e.g., `src/`, `lib/` instead of "Frontend")
- Reduces confusion when implementing CRs across different project layouts
- Works seamlessly with both monorepo and single-project structures
- More accurate impact area detection for architecture and test planning

**Files Changed**:
- `prompts/mdt/commands/ticket-creation.md` (v9)
- `prompts/mdt/.claude-plugin/plugin.json`

---

### 2026-02-02 - Agentic Implementation v3: Flow Alignment and Agent Optimization

**Problem**: The agentic implementation workflow had several inconsistencies: flow steps (10) didn't match detailed sections (8), agent prompts used JSON input while orchestrator sent YAML, frontmatter descriptions were bloated with verbose XML examples, the `mdt:test` agent was redundant (absorbed into `mdt:verify`), and the fix agent lacked a proper YAML schema.

**Solution**: Aligned flow with step sections, switched all agent inputs to YAML format, simplified frontmatter, deleted redundant test agent, and added proper schemas for all agents.

**Changes Made**:

1. **implement-agentic.md (v3) - Flow and schema fixes**:
   - Reduced Orchestrator Flow from 10 steps to 8 (matches Step 1-8 sections)
   - Step 5 (Fix Loop): Added YAML prompt schema with `failure_context`, `attempt`, `max_attempts`
   - Step 6 (Mark Progress): Simplified to checkpoint + tasks.md `[x]` markers
   - Checkpoint file: `.checkpoint.json` → `.checkpoint.yaml` (LLM-friendlier format)

2. **agents/test.md - DELETED**:
   - Functionality absorbed into `mdt:verify` agent
   - Removed stale reference from CLAUDE.md

3. **agents/verify.md - Simplified**:
   - Frontmatter: ~1200 chars → ~60 chars (removed XML examples)
   - Input format: JSON → YAML (matches orchestrator prompts)

4. **agents/code.md - Simplified**:
   - Frontmatter: ~1400 chars → ~70 chars
   - Input format: JSON → YAML

5. **agents/fix.md - Simplified**:
   - Frontmatter: ~1100 chars → ~80 chars
   - Input format: JSON → YAML (aligned with Step 5 schema)

6. **agents/cmd-agent.md - Clarified purpose**:
   - Frontmatter: ~400 chars → ~60 chars
   - Added explanation: namespace isolation prevents skill resolution conflicts when mdt commands invoked from other projects

7. **CLAUDE.md - Updated agent table**:
   - Removed `mdt:test` row (deleted agent)
   - Updated checkpoint reference: `.checkpoint.json` → `.checkpoint.yaml`

**Impact**:
- Orchestrator flow now clearly maps to detailed step sections (1:1)
- All agents use consistent YAML input format (no JSON/YAML mismatch)
- Smaller frontmatter reduces plugin.json size and improves readability
- Fix agent has proper schema for structured failure context
- YAML checkpoint format is more forgiving of LLM formatting issues

**Files Changed**:
- `prompts/mdt/commands/implement-agentic.md`
- `prompts/mdt/agents/test.md` (deleted)
- `prompts/mdt/agents/verify.md`
- `prompts/mdt/agents/code.md`
- `prompts/mdt/agents/fix.md`
- `prompts/mdt/agents/cmd-agent.md`
- `prompts/CLAUDE.md`

---

### 2026-01-31 - Language-Specific References: Eliminate Project Bias from Commands

**Problem**: MDT commands contained project-specific examples (TypeScript/Playwright selectors, `LanguageDetector` service names, JavaScript closures, Node.js test patterns) that confused users working on Python, Go, Rust, or other projects. The commands weren't truly language-agnostic despite being designed for any project.

**Solution**: Extracted all language/ecosystem-specific patterns into separate reference files (`typescript.md`, `python.md`). Commands load references **on demand** when generating executable code, remaining agnostic to language while providing precise guidance when needed.

**Changes Made**:

1. **mdt/references/ (NEW) - Language-specific pattern library**:
   - `README.md` - Documentation for the references system
   - `typescript.md` - TypeScript/Node.js patterns: test frameworks (Vitest, Jest, Playwright, Cypress), file naming conventions, BDD examples, selector patterns, environment variable handling, assertions, filter commands
   - `python.md` - Python patterns: test frameworks (pytest, pytest-bdd, behave), file naming conventions, BDD examples, selector patterns, environment variable handling, fixtures, filter commands

2. **mdt/commands/requirements.md (v3→v3)** - Removed project-specific examples:
   - Replaced LanguageDetector/PipelineCoordinator examples with generic FormValidator/RequestHandler
   - Replaced "closure" bug fix (JavaScript-specific) with language-agnostic "concurrent access"
   - Added diverse EARS examples independent of any project context

3. **mdt/commands/bdd.md (v1→v1)** - Language-agnostic patterns:
   - Added language reference loading section (step 4b)
   - Made anti-patterns pseudo-code instead of TypeScript-specific
   - Replaced Ruby/Go/Python code snippets with language reference table
   - Added note pointing to reference file for selector patterns

4. **mdt/commands/tests.md (v7→v7)** - Ecosystem awareness:
   - Added test file naming table (TypeScript patterns, Python patterns)
   - Added language reference section
   - Added rule: match existing project conventions

**Impact**:
- Commands remain language-agnostic (no hardcoded TypeScript assumptions)
- References provide precise guidance for each ecosystem when needed
- Easy to add support for new languages (just add new reference file)
- Reduces confusion for users on non-Node.js projects
- Commands can be safely shared across projects without project-specific modifications

**Files Changed**:
- `prompts/mdt/references/README.md` (new)
- `prompts/mdt/references/typescript.md` (new)
- `prompts/mdt/references/python.md` (new)
- `prompts/mdt/commands/requirements.md` (examples updated)
- `prompts/mdt/commands/bdd.md` (references added)
- `prompts/mdt/commands/tests.md` (ecosystem patterns added)

---

### 2026-01-30 - Smart CR Creation: Inference Over Interrogation

**Problem**: The `/mdt:ticket-creation` workflow (v6) used a rigid 10-question interactive flow that felt like an interrogation. Users were asked questions even when context was obvious from conversation history or codebase. The workflow was also monolithic and lengthy with document structures embedded, making it hard to maintain and evolve templates.

**Solution**: Completely rewrote the workflow (v9) around smart parameter inference. The new pattern: "Analyze context → Infer all parameters → Confirm/Refine → Execute". All document structures extracted to external template files, significantly reducing workflow length.

**Changes Made**:

1. **ticket-creation.md (v6→v9) - Smart inference workflow**:
   - Eliminated 10-step questioning flow in favor of context analysis
   - New Parameter Schema: 7 parameters inferred from context (SPEC_MODE, CR_TYPE, REQUIREMENTS_SCOPE, MOTIVATION, AREAS, VERIFICATION, etc.)
   - REQUIREMENTS_SCOPE smart defaults by CR_TYPE (Feature→full, Bug→brief, Architecture/Debt→none)
   - Single confirmation question with table of inferred values + reasoning
   - Refine mode: user selects which parameters to change, workflow asks only those
   - Post-confirmation: ask mode-specific questions (Q4-Q8 for Full Specification mode)
   - Template selection based on CR_TYPE + SPEC_MODE
   - Next workflow suggestions table (CR_TYPE × REQUIREMENTS_SCOPE → specific workflow chain)

2. **ticket-templates/ (NEW) - Externalized document structures**:
   - `full-spec.md` - Full Specification mode template (7 sections: Description, Decision, Alternatives, Artifact Specifications, Acceptance Criteria, Verification, Deployment)
   - `requirements.md` - Requirements mode template (5 sections: Description, Desired Outcome, Open Questions, Acceptance Criteria, Verification)
   - `research.md` - Research mode template (5 sections: Description, Research Questions, Validation Approach, Acceptance Criteria, Dependencies & Next Steps)
   - `quality-checks.md` - Critical quality rules for all modes (NO YAML frontmatter, NO prose paragraphs, NO bold headers, ONE H1 only, etc.)

**Impact**:
- Faster CR creation: context inference eliminates obvious questions
- Better user experience: one confirmation instead of 10 questions
- Maintainable templates: document structures now separate files
- Easier to add new CR types or modes: just add new template
- Preserves full functionality with 87% less workflow code

**Files Changed**:
- `prompts/mdt/commands/ticket-creation.md` (v6→v9)
- `prompts/mdt/references/ticket-templates/full-spec.md` (new)
- `prompts/mdt/references/ticket-templates/requirements.md` (new)
- `prompts/mdt/references/ticket-templates/research.md` (new)
- `prompts/mdt/references/ticket-templates/quality-checks.md` (new)

---

### 2026-01-28 - Completion Verification Agent for Implementation Workflows

**Problem**: Implementation workflows lacked comprehensive verification at completion. Issues like security regressions (rate limiting bypass), unmet requirements (public methods not removed), and dead code were discovered only after manual review, not caught by the automated workflow.

**Solution**: Added `@mdt:verify-complete` agent that performs requirements traceability and quality checks after all tasks complete. The agent maps requirements to implementation evidence, runs quality commands, detects security issues, and classifies findings by severity.

**Changes Made**:

1. **verify-complete.md (new)** - Lean, language-agnostic verification agent:
   - Extracts requirements from CR, requirements.md, bdd.md, tasks.md
   - Traces each requirement to implementation evidence (file:line)
   - Runs mechanical checks (build, test, lint, typecheck) using provided commands
   - Scans for security issues via code analysis (auth bypass, rate limiting, secrets)
   - Detects dead code (unused exports, duplicates)
   - Classifies issues: CRITICAL/HIGH block completion, MEDIUM/LOW defer to tech-debt
   - Returns structured JSON for orchestrator to process

2. **implement-agentic.md (v2→v3)** - Full completion verification with fix loop:
   - Added Step 7: Completion Verify (`@mdt:verify-complete` agent)
   - Added Step 8: Post-Verify Fixes (appends fix tasks to tasks.md)
   - Updated checkpoint schema v3 with `completion` state tracking
   - Max 2 verification rounds before recommending follow-up CR

3. **implement.md (v7→v8)** - Simpler completion verification:
   - Added Step 7b: Completion Verification
   - Reports issues and STOPs (no automatic fix loop)
   - Points users to implement-agentic for automatic fixes

4. **tasks.md** - Post-Verify Fixes placeholder:
   - Documents where fix tasks get appended by implement-agentic

5. **WORKFLOWS.md** - Updated workflow diagrams:
   - Notes "(includes completion verification)" under implement step
   - Updated flow diagrams to show "+ verified" at completion

6. **CLAUDE.md** - Agent reference table:
   - Added `mdt:verify-complete` to agentic implementation agents

**Impact**:
- Catches requirement violations before marking CR complete
- Detects security regressions (auth bypass, rate limiting) automatically
- Finds dead code and duplicates from refactoring
- Language-agnostic: works with any project that provides build/test/lint commands
- Clear severity classification guides what must be fixed vs deferred

**Files Changed**:
- `prompts/mdt/agents/verify-complete.md` (new)
- `prompts/mdt/commands/implement-agentic.md`
- `prompts/mdt/commands/implement.md`
- `prompts/mdt/commands/tasks.md`
- `prompts/WORKFLOWS.md`
- `prompts/CLAUDE.md`

---

### 2026-01-27 - CLAUDE.md Updated: MDT Plugin Documentation

**Context**: The MDT plugin architecture with agentic implementation was completed in commit 2b95991. This update ensures CLAUDE.md accurately reflects the new structure.

**Changes Made**:

1. **CLAUDE.md** - Updated to reference mdt/ plugin structure:
   - Updated Quick Reference table to show `mdt/commands/` paths
   - Added `implement-agentic.md` to command reference
   - Added Agentic Implementation section with agent descriptions
   - Added Plugin Installation section with install commands
   - Enhanced Troubleshooting with checkpoint state guidance
   - Referenced `mdt/README.md` for plugin documentation

2. **.gitignore** - Added checkpoint state exclusion:
   - Added `**/.checkpoint.json` to root .gitignore to ignore agentic implementation state files

**Impact**:
- CLAUDE.md now correctly references the plugin structure
- New contributors can discover agent-based implementation workflow
- Checkpoint state files won't be committed to git

**Files Changed**:
- `prompts/CLAUDE.md`
- `.gitignore` (root)

---

### 2026-01-27 - MDT Plugin: Agentic Implementation and Workflow Reorganization

**Problem**: The procedural `/mdt:implement` workflow had significant limitations:
1. Monolithic execution - all work in a single conversational turn with no resumption capability
2. Manual agent invocation - users had to manually invoke subagents for code, test, fix operations
3. No checkpointed state - failures lost progress and required full restart
4. Scattered file organization - workflow commands, agents, and configuration were distributed across the prompts directory
5. No acceptance verification - implementation completion didn't verify BDD scenarios or smoke tests

**Solution**: Introduced MDT plugin architecture with native Claude Code integration, reorganized all workflows into a structured `mdt/` directory, and added agentic implementation with checkpointed state machine and specialized subagents.

**Changes Made**:

1. **mdt/ directory structure** - Complete reorganization into plugin format:
   - `mdt/.claude-plugin/plugin.json` - Plugin metadata and description
   - `mdt/README.md` - Plugin installation and usage documentation
   - `mdt/commands/` - All workflow commands (moved from `commands/`)
   - `mdt/agents/` - Internal agent prompts (new)

2. **mdt/agents/ (4 new specialized agents)** - JSON-based subagents with scoped responsibilities:
   - `code.md (v2)` - Implementation specialist: writes minimal code respecting scope boundaries and shared imports
   - `verify.md (v1)` - Verification specialist: runs tests, checks scope boundaries, parses results into structured verdicts
   - `fix.md (v2)` - Remediation specialist: applies minimal fixes for verification failures
   - `test.md (v2)` - Test execution specialist: runs tests and returns structured JSON results

3. **mdt/commands/implement-agentic.md (v1 - NEW)** - State machine orchestrator:
   - Checkpointed state persisted to `{TICKETS_PATH}/{CR-KEY}/.checkpoint.json`
   - Resumable execution with `--continue` flag
   - Part-aware: `--part {X.Y}` for multi-part CRs
   - Prep mode: `--prep` for refactoring workflows
   - 4-step state machine: Pre-Verify → Implement → Post-Verify → Fix (max 2 attempts)
   - JSON-based agent communication with structured verdicts
   - Behavioral verification: derives smoke_test_command from requirements/BDD

4. **mdt/commands/implement.md (v6→v7)** - Enhanced acceptance verification:
   - New Step 7: Acceptance Verification (after all parts complete, before final completion)
   - Runs BDD scenarios from `bdd.md` if exists: `{e2e_command} --grep="{CR-KEY}"`
   - Falls back to smoke test derived from requirements if bdd.md missing
   - HALTS if Feature Enhancement lacks both bdd.md and requirements.md (must run `/mdt:bdd`)
   - Updated completion checklist to include BDD and smoke test verification
   - Rule #9 updated: "Acceptance verification required"

5. **mdt/commands/tests.md (v6→v7)** - External dependency testing:
   - Added Category 3: External Dependency Tests
   - Requires at least one real integration test per dependency (not mocked)
   - Coverage: env vars (set vs absent), external commands (real execution), APIs/services (real/local endpoint)
   - New "External Dependency Tests" section in tests.md output template
   - Updated verification checklist with dependency requirements
   - New validation rules: mock 100% of dependencies (anti-pattern)

6. **mdt/commands/tasks.md (v7→v8)** - Completion checklist enhancements:
   - Added "Smoke test passes" to task completion checklist
   - Added "Fallback/absence paths match requirements" to task completion checklist
   - Ensures tasks verify behavior with real execution, not just unit tests

7. **README.md** - Updated with agentic implementation documentation:
   - New "Agentic Implementation" section with agent descriptions
   - Features: checkpoint-based state, resumable execution, part-aware, prep mode
   - Link to mdt/README.md for complete plugin documentation
   - Updated workflow chain to show `/mdt:implement-agentic` option

**Impact**:
- Implementation can now be resumed after failures without losing progress
- Specialized agents provide focused expertise with JSON-based communication
- Plugin architecture enables `claude plugin install` for easy distribution
- Reorganized structure improves discoverability and maintainability
- Acceptance verification ensures user-visible behavior actually works before marking CRs complete
- External dependency tests prevent "mock-induced hallucinations" where mocked tests pass but real integrations fail

**Files Changed**:
- `prompts/mdt/.claude-plugin/plugin.json` (new)
- `prompts/mdt/README.md` (new)
- `prompts/mdt/agents/code.md` (new)
- `prompts/mdt/agents/verify.md` (new)
- `prompts/mdt/agents/fix.md` (new)
- `prompts/mdt/agents/test.md` (new)
- `prompts/mdt/commands/implement-agentic.md` (new)
- `prompts/mdt/commands/implement.md` (moved from commands/mdt-implement.md, v6→v7)
- `prompts/mdt/commands/tests.md` (moved from commands/mdt-tests.md, v6→v7)
- `prompts/mdt/commands/tasks.md` (moved from commands/mdt-tasks.md, v7→v8)
- `prompts/mdt/commands/architecture.md` (moved from commands/mdt-architecture.md)
- `prompts/mdt/commands/assess.md` (moved from commands/mdt-assess.md)
- `prompts/mdt/commands/bdd.md` (moved from commands/mdt-bdd.md)
- `prompts/mdt/commands/clarification.md` (moved from commands/mdt-clarification.md)
- `prompts/mdt/commands/domain-audit.md` (moved from commands/mdt-domain-audit.md)
- `prompts/mdt/commands/domain-lens.md` (moved from commands/mdt-domain-lens.md)
- `prompts/mdt/commands/poc.md` (moved from commands/mdt-poc.md)
- `prompts/mdt/commands/reflection.md` (moved from commands/mdt-reflection.md)
- `prompts/mdt/commands/requirements.md` (moved from commands/mdt-requirements.md)
- `prompts/mdt/commands/tech-debt.md` (moved from commands/mdt-tech-debt.md)
- `prompts/mdt/commands/ticket-creation.md` (moved from commands/mdt-ticket-creation.md)
- `prompts/.gitignore` (added mdt/.checkpoint.json)
- `prompts/README.md`

---

### 2026-01-26 - Test Data Mechanisms: Trace What, Not Just Method Signatures

**Problem**: The `/mdt:tests` workflow was generating tests that verified **method signatures exist** but missed testing **what those methods actually do**. For example, when architecture defined `LANGUAGE_DETECTOR="command {text}"` with a `{text}` placeholder, tests were generated for `detect(text)` method but NEVER tested that `{text}` gets substituted with actual input. The tests were form-following (method exists) not substance-following (method works correctly).

**Root cause**: Step 2 extracted only module names and public interfaces. It didn't scan for **data mechanisms** like placeholders, boundaries, formats, and environment variables that define HOW methods work.

**Solution**: Added explicit data mechanism extraction to Step 2 and corresponding test generation. Now the workflow scans architecture for:
- Placeholders (`{text}`, `{id}`, `{{var}}`) → tests verify substitution
- Boundaries ("first 20 words") → tests at N, N-1, N+1
- Format specs ("iso2 code") → valid/invalid format tests
- Environment vars (`LANGUAGE_DETECTOR`) → set/unset/malformed tests

**Changes Made**:

1. **mdt-tests.md (v5→v6) - Data mechanism extraction**:
   - Added "CRITICAL: Extract Key Data Patterns" subsection to Step 2
   - Pattern types: Placeholders, Template strings, Data limits, Format specs, Env vars
   - Example showing how `{text}` should generate specific substitution tests
   - Added "Additional Coverage for Data Mechanisms" table to Step 3
   - Concrete test example for `{text}` placeholder with spy verification
   - New "Data Mechanism Tests" section in tests.md output template
   - Updated validation checklist with data mechanism requirements

**Impact**:
- Tests now verify WHAT methods do, not just THAT they exist
- Placeholder substitution gets explicit tests (no more `{text}` in executed commands)
- Boundary conditions get proper limit+1/limit-1 tests
- Autonomous workflows produce complete, runnable test suites

**Files Changed**:
- `prompts/commands/mdt-tests.md` (v5→v6)

---

### 2026-01-26 - Minimal Documentation: Ceremony Removal

**Problem**: Architecture and Requirements workflows had become overly prescriptive with extensive tables, mappings, and ceremonial content that duplicated information already present in code. The workflows were producing documentation-heavy outputs that took significant time to generate but provided limited value during implementation.

**Solution**: Streamlined both workflows to focus on essential decisions only — removing redundant tables, exhaustive mappings, and prescriptive templates. The new principle: "Capture decisions that matter. Skip ceremony that duplicates code."

**Changes Made**:

1. **mdt-architecture.md (v8→v9) - Radical simplification**:
   - **Removed**: Prep vs Feature comparison table (mode now implicit from path)
   - **Removed**: Complexity scoring criteria (just write, then decide by scope)
   - **Removed**: Extensive quality checklist (distilled to "What Good Architecture Looks Like")
   - **Removed**: Requirement-to-component mapping tables (code IS the mapping)
   - **Removed**: Implementation code snippets (they drift from reality)
   - **Removed**: Bug fix documentation sections (git tracks this)
   - **Removed**: Exhaustive domain alignment tables (2-3 key concepts max)
   - **Removed**: Component diagrams when relationships are obvious
   - **Removed**: Error philosophy sections for trivial failure modes
   - **Simplified**: Build vs Use evaluation — only for non-trivial capabilities
   - **Simplified**: Output template focused on overview, pattern, structure, scope boundaries
   - **New target**: Concise outputs for most features
   - **Core principle changed**: From "Surface decisions LLM would otherwise make implicitly" to "Capture decisions that matter. Skip ceremony that duplicates code"
   - **Preserved**: `--prep` mode support (output location, domain-audit.md loading, completion message)

2. **mdt-requirements.md (v2→v3) - Focused behavioral specs**:
   - **Removed**: Extensive CR-type scope inference logic
   - **Removed**: Complex template system (4 templates → 1 practical template)
   - **Removed**: Separation into FR/NFR sections (just Behavioral Requirements + Constraints)
   - **Removed**: Configuration section (usually trivial)
   - **Removed**: Current Implementation Context section (code shows this)
   - **Removed**: "Current Implementation Analysis" step (read CR instead)
   - **Removed**: Open Questions extraction workflow (CR already has this)
   - **Simplified**: When-to-use table with clearer quick test (<3 behaviors = skip)
   - **Simplified**: EARS syntax to 4 essential patterns (Event, State, Error, Always)
   - **Simplified**: Output template — Overview + Behavioral Requirements + Constraints
   - **New focus**: "Generate behavioral requirements from CR" (not multi-mode analysis)

**Impact**:
- Requirements documents focus on WHAT behaviors, not extensive analysis
- Reduced token usage significantly (removed large portions of workflow text)
- Implementers get decisions faster without wading through ceremonial tables
- Code remains the source of truth (not documentation trying to duplicate it)
- Maintains essential decision capture while removing overhead

**Files Changed**:
- `prompts/commands/mdt-architecture.md` (v8→v9)
- `prompts/commands/mdt-requirements.md` (v2→v3)

### 2026-01-07 - BDD/TDD Separation: Two-Level Test Strategy

**Problem**: The single `/mdt:tests` command conflated two fundamentally different testing activities:
- Acceptance tests (BDD) that verify user-visible behavior from requirements
- Implementation tests (TDD) that verify module-level behavior from architecture

This caused a chicken-and-egg problem in multi-part CRs: BDD tests don't need architecture, but module tests require knowing the part structure. The workflow couldn't determine correct test timing.

**Solution**: Separated testing into two distinct phases with dedicated commands:
- `/mdt:bdd` - BDD acceptance tests BEFORE architecture (from requirements.md)
- `/mdt:tests` - TDD unit/integration tests AFTER architecture (from architecture.md)

**Changes Made**:

1. **mdt-bdd.md (v1 - NEW) - BDD acceptance test workflow**:
   - Input: requirements.md (not architecture)
   - Output: bdd.md + E2E test files (Playwright, Cypress)
   - Timing: Before architecture, no part awareness needed
   - Focus: User-visible behavior in Gherkin format
   - Modes: Normal (RED) and Prep (GREEN for locking behavior)

2. **mdt-tests.md (v4→v5) - Refocused on module-level tests**:
   - Input: architecture.md (requires architecture to exist)
   - Output: tests.md + unit/integration test files
   - Timing: After architecture, part-aware
   - Focus: Module behavior, component interfaces
   - Added prerequisite check for architecture.md
   - Removed BDD/Gherkin content (moved to mdt-bdd.md)

3. **mdt-architecture.md (v7→v8) - Updated integration section**:
   - Consumes bdd.md in addition to other inputs
   - Updated workflow position diagrams
   - Added key change note about BDD/TDD split

4. **Workflow documentation updated** (WORKFLOWS.md, COMMANDS.md, CONCEPTS.md):
   - Feature flow: `requirements → bdd → architecture → tests → tasks → implement`
   - Refactoring flow: `assess → bdd --prep → architecture → tests --prep → tasks → implement`
   - New "Two Test Levels" section explaining BDD vs TDD distinction
   - Updated all workflow diagrams

5. **Reference documentation updated** (QUICKREF.md, CLAUDE.md, README.md, GUIDE.md):
   - Added /mdt:bdd to command tables
   - Updated /mdt:tests descriptions (module tests, not BDD)
   - Updated workflow chains
   - Added bdd.md and tests.md to output listings

6. **install-claude.sh - Installation support**:
   - Added "bdd" to MDT_COMMANDS array
   - Added /mdt:bdd to help text
   - Updated workflow chain in help output

**Impact**:
- Resolves chicken-and-egg: BDD tests don't need architecture, module tests come after
- Clearer separation of concerns: user perspective (BDD) vs developer perspective (TDD)
- Aligns with industry standards: V-Model, Test Pyramid, BDD/TDD practices
- Better multi-part CR support: acceptance tests are whole-feature, module tests are part-aware
- Refactoring safety: lock E2E behavior with `--prep` before restructuring

**Files Changed**:
- `prompts/commands/mdt-bdd.md` (v1 - NEW)
- `prompts/commands/mdt-tests.md` (v4→v5)
- `prompts/commands/mdt-architecture.md` (v7→v8)
- `prompts/commands/mdt-ticket-creation.md`
- `prompts/WORKFLOWS.md`
- `prompts/COMMANDS.md`
- `prompts/CONCEPTS.md`
- `prompts/QUICKREF.md`
- `prompts/CLAUDE.md`
- `prompts/README.md`
- `prompts/GUIDE.md`
- `prompts/install-claude.sh`

### 2026-01-04 - Terminology: "Phase" → "Part"

**Problem**: MDT used "phase" to mean a distinct chunk of an epic CR with its own test/task cycle and folder. However, "phase" collides with casual LLM usage meaning "implementation steps," causing confusion between MDT's structural concept (phase folders) and generic development phases (step 1, step 2, etc.).

**Solution**: Renamed "Phase" to "Part" throughout all workflow prompts—same meaning (distinct chunk of an epic CR), less collision risk with generic "phase" terminology.

**Changes Made**:

1. **All mdt-*.md workflow files** - Terminology standardized:
   - `phase` → `part`, `Phase` → `Part`, `PHASE` → `PART`
   - Path patterns: `phase-{X.Y}/` → `part-{X.Y}/`
   - Command flags: `--phase {X.Y}` → `--part {X.Y}`
   - Context-aware replacements:
     - "Phased CRs" → "Multi-part CRs"
     - "Non-phased" → "Single-part"
     - "Phase-aware" → "Part-aware"
     - "Phase 1" → "Part 1", "Phase 2+" → "Part 2+"
     - "Phased Workflow" → "Multi-part Workflow"
   - Variable names: `phase: "1.1"` → `part: "1.1"`, `phase_tasks` → `part_tasks`
   - Test filters: `--testPathPattern="phase-{X.Y}"` → `--testPathPattern="part-{X.Y}"`
   - Section headers: "## Phase {X.Y}" → "## Part {X.Y}"

2. **Core workflow files updated** (mdt-tasks.md, mdt-tests.md, mdt-implement.md):
   - Output paths updated to use `part-{X.Y}/` folders
   - Discovery logic renamed (phase discovery → part discovery)
   - Completion messages updated ("Phase {X.Y} Complete" → "Part {X.Y} Complete")
   - Task context headers updated

3. **Documentation files** (README.md, GUIDE.md, CLAUDE.md):
   - "When to Use Phases" → "When to Use Parts"
   - "Phase Detection" → "Part Detection"
   - "Phased File Structure" → "Multi-Part File Structure"
   - All examples updated with `part-1.1/` instead of `phase-1.1/`
   - Workflow descriptions updated

4. **Agent-specific files** (mdt-implement-*.md):
   - Code agent: YAML context `phase:` → `part:`
   - Test agent: All language test filters updated (TypeScript, Python, Rust, Go, Java)
   - Orchestrator: State machine `PHASE_COMPLETE` → `PART_COMPLETE`

5. **Preserved** (correctly NOT changed):
   - `phaseEpic` - MCP tool field name (external interface, should not change)
   - CHANGE_NOTES.md - Historical changelog (preserved as-is)

**Impact**:
- Clearer distinction between MDT's structural concept ("Part") and generic development terminology
- Reduces LLM confusion between MDT parts and implementation steps
- Maintains all functionality—purely a terminology change
- Backward compatible: existing CRs with `phase-*/` folders still work (can be renamed gradually)

**Files Changed**:
- `prompts/mdt-ticket-creation.md` (v5→v6)
- `prompts/mdt-architecture.md` (v7→v8)
- `prompts/mdt-clarification.md` (v1→v2)
- `prompts/mdt-tasks.md` (v6→v7)
- `prompts/mdt-tests.md` (v3→v4)
- `prompts/mdt-implement.md` (v6→v7)
- `prompts/mdt-reflection.md` (v1→v2)
- `prompts/mdt-domain-lens.md` (v2→v3)
- `prompts/README.md`
- `prompts/GUIDE.md`
- `prompts/CLAUDE.md`

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
   - Target output refined for concise, actionable reports

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
3. **CLAUDE.md** - Streamlined to quick-reference format
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
   - Phase completion summaries with TDD and scope metrics
   - Support for both phased and non-phased CRs (backward compatibility)
   - Enhanced TDD verification with phase-specific test filtering
   - Automatic detection of multiple phases with user selection prompts

2. **mdt-tasks.md (v4→v5) - Phase-specific task generation**:
   - Phase detection based on existing phase-specific tests.md files
   - Output to phase folders: `docs/CRs/{CR-KEY}/phase-{X.Y}/tasks.md`
   - Phase-specific architecture section extraction from architecture.md
   - Co-location strategy: tasks.md created alongside tests.md
   - Phase-specific scope boundaries and shared patterns
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
   - Generates `docs/CRs/{CR-KEY}/domain.md` (concise)
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
   - Step 4.2: Build vs Use evaluation for non-trivial capabilities
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
   - Simple scope: Embed in CR
   - Complex scope: Extract to `architecture.md` with full details
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
