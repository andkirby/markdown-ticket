# CLAUDE.md - CR Workflow Prompt Development

This file provides guidance to Claude Code when working on the CR workflow prompt files in this directory.

## Installation

### Quick Install (Global)
```bash
# From prompts/ directory - installs to ~/.claude/commands/
bash install-claude.sh
```

### Local Install (Project-specific)
```bash
# Install to project's .claude/commands/mdt/ (no mdt- prefix)
bash install-claude.sh --project-path /path/to/project

# Verbose mode with detailed output
bash install-claude.sh --verbose
```

### Manual Install
```bash
cp mdt-*.md ~/.claude/commands/
```

Commands become available as `/mdt:ticket-creation`, `/mdt:architecture`, etc.

## Working Context

You are in the **prompts/** directory of the markdown-ticket project. This directory contains AI workflow prompts that guide CR (Change Request) ticket creation and management. When working here, focus on:

- Developing and refining workflow prompts
- Testing workflow logic and question flows
- Ensuring artifact-focused documentation standards
- Maintaining consistency across workflows
- Improving prompt clarity and effectiveness

## Files in This Directory

### Core Workflow Prompts (v2+ with new workflows)

**mdt-ticket-creation.md** - CR creation template
- Artifact specification template (v3)
- Structure: 7 sections + optional Section 8 (Clarifications)
- Enforces artifact-focused documentation
- Line count target: 150-300 lines

**mdt-requirements.md** (v1) - EARS requirements generation
- Generates `docs/CRs/{CR-KEY}/requirements.md`
- WHEN/WHILE/IF...THEN templates
- Artifact mapping and traceability
- Consumed by architecture, tasks, implement, tech-debt

**mdt-assess.md** (v1) - Code fitness assessment
- Evaluates affected code before architecture
- Fitness scoring: 0-100% per file
- Verdicts: ✅ Healthy, ⚠️ Concerning, 🔴 Critical
- Three options: Integrate / Refactor inline / Split CRs

**mdt-architecture.md** (v3) - Architecture design workflow
- Surfaces implicit structural decisions
- Graduated output: CR section (simple) or `architecture.md` (complex)
- Defines Pattern, Shared Patterns, Structure, Size Guidance, Extension Rule
- Prevents horizontal duplication and size violations

**mdt-clarification.md** - Interactive clarification workflow
- Scans CR for ambiguities using taxonomy
- Max 10 questions per session via `AskUserQuestion`
- Records clarifications in Section 8
- Updates CR sections atomically

**mdt-tasks.md** (v2) - Task breakdown with constraints
- Generates `docs/CRs/{CR-KEY}/tasks.md`
- Inherits size limits from Architecture Design
- Phase 1: Shared utilities (extract first)
- Phase 2+: Features (import from shared)
- Includes Exclude sections and Anti-duplication rules

**mdt-implement.md** (v2) - Orchestrator with verification
- Executes tasks with constraint verification
- Modes: interactive, --all, --continue, --task N.N
- Verifies after each task: tests pass, size (OK/FLAG/STOP), structure, no duplication
- Tracks requirement satisfaction from requirements.md

**mdt-tech-debt.md** (v2) - Post-implementation debt detection
- Generates `docs/CRs/{CR-KEY}/debt.md`
- Diagnostic report, not executable tasks
- Flags size violations, duplication, missing abstractions
- Fix via new CR workflow, not direct execution

**mdt-reflection.md** - Post-implementation learning capture
- Extracts artifact-level insights from conversations
- Updates CR with actual vs. planned specifications
- Creates Post-Implementation session records
- Requires user approval before updates

### Supporting Files

**README.md** - Complete workflow reference with installation
**install-claude.sh** - Installation script (global or project-local)
**drafts/** - Work-in-progress workflows

## Workflow Architecture

### Full Workflow Chain

The prompts form a complete development lifecycle:

```
/mdt:ticket-creation → Create CR
    ↓
/mdt:requirements (optional) → requirements.md (EARS format)
    ↓
/mdt:assess (optional) → Decide: integrate / refactor inline / split CRs
    ↓
/mdt:architecture → CR section or architecture.md
    ↓
/mdt:clarification (as needed) → Fill specification gaps
    ↓
/mdt:tasks → tasks.md with constraints
    ↓
/mdt:implement → Execute with verification
    ↓
/mdt:tech-debt → debt.md (diagnostic)
    ↓
/mdt:reflection → Update CR with learnings
```

### Debt Prevention Chain

Four workflows collaborate to prevent technical debt:

1. **Architecture** - Defines size limits, shared patterns, structure
2. **Tasks** - Inherits limits, creates Phase 1 (shared first), adds exclusions
3. **Implement** - Verifies size (OK/FLAG/STOP), no duplication, correct structure
4. **Tech-Debt** - Catches violations, produces diagnostic for fix CR

### Size Guidance (Three Zones)

All implementation workflows enforce graduated thresholds:

| Zone | Condition | Action |
|------|-----------|--------|
| ✅ OK | ≤ Default | Proceed |
| ⚠️ FLAG | Default to 1.5x | Complete with warning |
| ⛔ STOP | > 1.5x (Hard Max) | Cannot complete, must resolve |

**Defaults by module role:**
- Orchestration: 100 lines (max 150)
- Feature module: 200 lines (max 300)
- Complex logic: 300 lines (max 450)
- Utility: 75 lines (max 110)

### Requirements Integration

When `requirements.md` exists (from `/mdt:requirements`):

| Prompt | How It Uses requirements.md |
|--------|-----------------------------|
| `mdt:architecture` | Maps components to requirements, validates coverage |
| `mdt:tasks` | Each task has `**Implements**: R1.1, R1.2`, coverage table |
| `mdt:implement` | Marks requirements satisfied as tasks complete |
| `mdt:tech-debt` | Flags unsatisfied requirements as High severity debt |

### Critical Workflow Rules

**Shared Patterns First (Anti-Duplication)**
- Architecture identifies patterns appearing in 2+ places
- Tasks creates Phase 1 to extract these BEFORE Phase 2 features
- Implement verifies features import from shared, never duplicate
- Violation triggers STOP condition

**Size Enforcement (Three Zones)**
- Architecture defines default + hard max per module role
- Tasks inherits limits, adds to each task specification
- Implement verifies after each task: OK/FLAG/STOP
- STOP (>1.5x) blocks task completion, requires resolution

**Exclusions Prevent Bloat**
- Tasks includes "Exclude" section (what NOT to move)
- Prevents shared code from being duplicated into features
- Prevents unrelated code from expanding scope
- Clarifies task boundaries

**Extension Rule (Future-Proofing)**
- Architecture defines: "To add X, create Y"
- Ensures new features follow same pattern
- Prevents shotgun surgery (changes in N places)
- Captured in architecture output

**Requirements Traceability (When requirements.md exists)**
- Each task maps to requirement IDs
- Coverage table ensures all requirements addressed
- Implement marks requirements satisfied
- Tech-debt flags unsatisfied requirements

## Development Workflow

### When Modifying Workflow Prompts

1. **Understand the workflow purpose** - What problem does it solve?
2. **Identify the section to modify** - Which part needs work?
3. **Test the logic** - Does the flow make sense?
4. **Verify MCP tool calls** - Are tool invocations correct?
5. **Check artifact focus** - Does it enforce concrete specifications?
6. **Update examples** - Are examples clear and realistic?
7. **Validate markdown** - Does output follow MDT standards?

### Testing Workflow Changes

To test a workflow prompt modification:

1. **Create a test CR** in the MDT project:
   ```bash
   # Get project code
   cat ../.mdt-config.toml | grep 'code = '

   # Use MCP to create test CR
   mcp__mdt-all__create_cr with minimal content
   ```

2. **Run the modified workflow** against the test CR

3. **Verify outputs**:
   - Correct MCP tool calls
   - Proper section updates
   - Artifact-focused content
   - Markdown formatting compliance

4. **Check Section 8** in the CR - clarifications recorded correctly?

5. **Clean up test CRs** when done

### Project Context Detection

Workflows are **project-agnostic** and auto-detect settings from:

**Primary sources** (checked in order):
1. `CLAUDE.md` - Look for project settings section
2. `package.json` - Node.js projects
3. `Cargo.toml` - Rust projects
4. `go.mod` - Go projects
5. `pyproject.toml` or `setup.py` - Python projects
6. `Makefile` - Make-based projects

**Extracted values:**
```yaml
project:
  source_dir: {src/, lib/, app/, pkg/, ...}
  test_command: {npm test, pytest, cargo test, go test, make test, ...}
  build_command: {npm run build, cargo build, go build, make, ...}
  file_extension: {.ts, .py, .rs, .go, .java, .kt, ...}
```

**Fallbacks if detection fails:**
- `source_dir`: Ask user or use `.` (current directory)
- `test_command`: Skip tests with warning
- `build_command`: Skip build with warning
- `file_extension`: Infer from existing files

### Troubleshooting Workflow Issues

**MCP tool failures:**
1. Check MCP server connection: prompt user to run `/mcp` or verify server built
2. Verify tool parameters match current API (check `mcp-server/MCP_TOOLS.md`)
3. Test with minimal parameters first

**Section update failures:**
1. List sections with `operation="list"` before updating
2. Use exact section name from list output (case-sensitive)
3. Verify `updateMode` (replace/append/prepend) is appropriate
4. Check for markdown syntax errors in `content`

**Artifact detection false negatives:**
1. Review "Artifact Identification" taxonomy in prompt
2. Check examples in prompt match project's naming conventions
3. Update patterns if project uses non-standard artifact naming

**Workflow hangs or loops:**
1. Check for missing approval gates (should use `AskUserQuestion`)
2. Verify loop exit conditions are reachable
3. Add debug output to identify stuck step

**Output location errors:**
1. Verify `docs/CRs/{CR-KEY}/` directory exists (created by MCP)
2. Check file permissions for writing
3. Ensure CR-KEY format matches project code (e.g., `MDT-001`)

### Common Development Tasks

**Adding new question types to mdt-clarification.md**:
- Define the question structure
- Add to taxonomy coverage categories
- Update question presentation strategy
- Add example to "Question Types and Examples" section
- Test with AskUserQuestion interface

**Improving artifact detection**:
- Update "Artifact Identification" taxonomy
- Add patterns for new artifact types
- Update validation rules
- Add examples of valid/invalid references

**Refining the template in mdt-ticket-creation.md**:
- Update section structure
- Modify table formats
- Add/remove quality checklist items
- Update example specifications

**Enhancing mdt-reflection.md learning extraction**:
- Add new learning categories
- Update include/exclude criteria
- Refine artifact reference patterns
- Improve presentation format

## Key Design Principles

### 1. Artifact-Focused Documentation

**Core principle**: Specify concrete artifacts, not behaviors

Valid artifact references:
- File paths: `src/components/UserProfile.tsx`
- Components: `AuthenticationService`
- Endpoints: `/api/v2/users/profile`
- Methods: `validateCredentials()`
- Config files: `config/database.yaml`

Invalid (behavioral):
- "Component that handles X"
- "Service for Y"
- "Function that does Z"

### 2. Structured Interactions

Use `AskUserQuestion` tool for all user interactions:
- Single-select with recommendations
- Multi-select for artifact selection
- Short-answer with constraints (≤5 words)

Never use free-form text prompts - always provide structured options.

### 3. Atomic Section Updates

Use `mcp__mdt-all__manage_cr_sections` for surgical updates:
- List sections first
- Update specific sections only
- Preserve unmodified content
- 84-94% more efficient than full rewrites

### 4. User Approval Gates

Always present changes before applying:
- Show what will be updated
- Get explicit approval
- Allow selective exclusions
- Provide edit options

### 5. Quality Enforcement

Every workflow must verify:
- 95%+ technical statements have artifact references
- Zero behavioral descriptions in sections 1-6
- Zero placeholders in critical sections
- All tables properly formatted
- Proper markdown headers (##/### not bold)
- One H1 only
- No duplicate headers

## MCP Tool Reference

### Required Tools

**mcp__mdt-all__get_cr** - Retrieve CR content
```json
{
  "project": "MDT",
  "key": "MDT-001",
  "mode": "full" // or "attributes" or "metadata"
}
```

**mcp__mdt-all__manage_cr_sections** - Section operations
```json
{
  "project": "MDT",
  "key": "MDT-001",
  "operation": "list" // or "get" or "update",
  "section": "1. Description", // for get/update
  "content": "...", // for update
  "updateMode": "replace" // or "append" or "prepend"
}
```

**mcp__mdt-all__create_cr** - Create new CR
```json
{
  "project": "MDT",
  "type": "Feature Enhancement",
  "data": {
    "title": "CR title",
    "content": "Full markdown (no YAML)"
  }
}
```

**mcp__mdt-all__update_cr_status** - Change status
```json
{
  "project": "MDT",
  "key": "MDT-001",
  "status": "Implemented"
}
```

### Tool Efficiency

- `get_cr` with modes: 40% token reduction vs. separate calls
- `manage_cr_sections`: 84-94% more efficient than full rewrites
- Always update sections individually, never entire documents

## Markdown Standards Enforced

### Headers
- One H1 (`#`) - document title only
- Main sections: `## 1. Description`, `## 2. Decision`
- Subsections: `### Problem`, `### Affected Artifacts`
- Never bold as headers: `**Wrong**` ❌

### Structure
- No YAML frontmatter (MCP auto-generates)
- No duplicate section headers
- Lists as plain markdown (NOT in code blocks)
- Tables for comparisons and specifications
- Code blocks ONLY in Section 7 (Deployment)

### Content Format
- Bullets for lists
- Tables for alternatives, specifications, integration points
- Checkboxes for acceptance criteria (plain markdown)
- Artifact references in every technical statement

## Testing Scenarios

### Scenario 1: Clarification Workflow
1. Create CR with vague problem statement
2. Run mdt-clarification.md workflow
3. Verify it detects missing artifact references
4. Answer structured questions
5. Check Section 8 records answers
6. Verify relevant sections updated with artifacts

### Scenario 2: Reflection Workflow
1. Implement a CR with spec deviations
2. Discuss implementation in conversation
3. Run mdt-reflection.md workflow
4. Verify it extracts artifact discoveries
5. Approve learnings presentation
6. Check CR updated with actual specifications
7. Verify metrics have baselines

### Scenario 3: Template Compliance
1. Create CR using mdt-ticket-creation.md
2. Verify no YAML frontmatter
3. Check tables for alternatives and specs
4. Verify headers use ##/### not bold
5. Confirm one H1 only
6. Check acceptance criteria as checkboxes (not in code blocks)

## Common Issues and Solutions

### Issue: Behavioral descriptions leak in
**Solution**: Add validation rules, update anti-pattern detection, enhance examples

### Issue: Users confused by question format
**Solution**: Improve option descriptions, add recommendations, simplify labels

### Issue: Section updates break markdown
**Solution**: Test updateMode (replace/append/prepend), verify header preservation

### Issue: Workflows too verbose
**Solution**: Reduce explanation paragraphs, focus on execution steps, trim examples

### Issue: Metrics without baselines
**Solution**: Enforce baseline requirement, reject fabricated metrics, update quality rules

## File Modification Checklist

Before committing changes to workflow prompts:

- [ ] Workflow logic is clear and unambiguous
- [ ] MCP tool calls have correct parameters
- [ ] Examples use realistic artifact references
- [ ] Quality checklist items are verifiable
- [ ] User interaction points use AskUserQuestion
- [ ] Markdown output follows MDT standards
- [ ] Anti-patterns are clearly documented
- [ ] Error cases are handled
- [ ] Success criteria are measurable
- [ ] Documentation is concise (no fluff)

## Integration Points

These workflows integrate with:

**MCP Server** (`mcp-server/`)
- Tools: create_cr, get_cr, manage_cr_sections, update_cr_status
- Must handle tool failures gracefully
- Always check tool availability before calling

**Shared Services** (`shared/services/`)
- MarkdownService: YAML frontmatter parsing
- TemplateService: CR template management
- ProjectService: Multi-project support

**CR Documents** (`docs/CRs/`)
- File format: Markdown with YAML frontmatter
- Naming: `{PROJECT}-{NUMBER}.md`
- Content: 7 sections + optional Section 8

## Version History

**v3 (Current)** - Artifact Specification focus
- Removed behavioral descriptions
- Added artifact reference requirements
- Enforced table-based specifications
- 95%+ artifact reference target

**v2** - Structured clarifications
- Added Section 8 (Clarifications)
- Interactive questioning via AskUserQuestion
- Atomic section updates

**v1** - Initial templates
- Basic CR structure
- Manual clarification process
- Full document rewrites

## Next Steps

When improving these workflows, consider:

1. **Reduce token usage** - More concise prompts
2. **Improve clarity** - Better examples and anti-patterns
3. **Enhance validation** - Stricter quality checks
4. **Streamline flows** - Fewer steps, clearer paths
5. **Better error handling** - Graceful degradation
6. **User experience** - Clearer questions, better recommendations
