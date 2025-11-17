# CLAUDE.md - CR Workflow Prompt Development

This file provides guidance to Claude Code when working on the CR workflow prompt files in this directory.

## Working Context

You are in the **prompts/** directory of the markdown-ticket project. This directory contains AI workflow prompts that guide CR (Change Request) ticket creation and management. When working here, focus on:

- Developing and refining workflow prompts
- Testing workflow logic and question flows
- Ensuring artifact-focused documentation standards
- Maintaining consistency across workflows
- Improving prompt clarity and effectiveness

## Files in This Directory

### Core Workflow Prompts

**mdt-ticket-creation.md** - CR creation template
- Artifact specification template (v3)
- Structure: 7 sections + optional Section 8 (Clarifications)
- Enforces artifact-focused documentation
- Line count target: 150-300 lines

**mdt-clarification.md** - Interactive clarification workflow
- Scans CR for ambiguities using taxonomy
- Max 10 questions per session via `AskUserQuestion`
- Records clarifications in Section 8
- Updates CR sections atomically

**mdt-reflection.md** - Post-implementation learning capture
- Extracts artifact-level insights from conversations
- Updates CR with actual vs. planned specifications
- Creates Post-Implementation session records
- Requires user approval before updates

### Supporting Files

**README.md** - Directory overview (if exists)
**docs_review.md** - Documentation review prompts
**readme_rework.md** - README update workflows

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
