---
code: MDT-080
title: Enhance prompt-command system with structured workflows
status: Implemented
dateCreated: 2025-11-17T19:19:59.873Z
type: Feature Enhancement
priority: Medium
---

# Enhance prompt-command system with structured workflows

## 1. Description
### Problem
- Current prompt commands in `prompts/` directory produced verbose outputs that LLMs struggled with
- Inconsistent structure across prompt files led to variable execution quality
- Lack of related context made it difficult to find relevant prompts for specific development tasks
- Missing pre-defined prompts for key ticket/development lifecycle actions

### Affected Artifacts
- `prompts/mdt-ticket-creation.md` (existing workflow template - updated)
- `prompts/mdt-clarification.md` (newly created)
- `prompts/mdt-reflection.md` (newly created)
- `prompts/` directory structure and organization

### Scope
- **Changes**: Implemented structured prompt-command workflows with consistent artifact focus
- **Unchanged**: MCP server functionality; existing prompt execution mechanism
## 2. Decision
### Chosen Approach
Implemented structured prompt-command workflows with standardized sections and artifact-focused guidance.

### Rationale
- Reduces verbose output by enforcing concise, artifact-focused specifications
- Improves consistency across all prompt commands through standardized structure
- Enables better discovery through related comment linking and categorization
- Provides complete coverage of development lifecycle tasks
## 3. Alternatives Considered
| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Standardized prompt templates with artifact focus | **ACCEPTED** - Addresses verbosity and consistency issues directly |
| Minimal prompt edits | Minor updates to existing files | Would not solve structural inconsistencies or discoverability |
| External prompting tool | Use third-party prompting system | Tested - produces verbose outputs unsuitable for LLM consumption |
## 4. Artifact Specifications
### Created Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `prompts/mdt-clarification.md` | Workflow | Interactive CR clarification with structured questioning |
| `prompts/mdt-reflection.md` | Workflow | Post-implementation learning capture and CR updates |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `prompts/mdt-ticket-creation.md` | Structure reformat | Applied standardized template, reduced verbosity |
| `prompts/mdt-clarification.md` | New file | Created clarification workflow |
| `prompts/mdt-reflection.md` | New file | Created reflection workflow |

### Key Patterns
- Artifact-focused specifications: All prompts reference concrete files/components/methods
- Structured questioning: Use `AskUserQuestion` with max 4 options, concise descriptions
- Atomic section management: Individual section updates via `manage_cr_sections`
- Success criteria validation: Measurable outcomes for each prompt type
## 5. Acceptance Criteria
### Functional
- [ ] `prompts/mdt-clarification.md` created with structured questioning workflow
- [ ] `prompts/mdt-reflection.md` created with learning capture workflow
- [ ] `prompts/mdt-ticket-creation.md` restructured with standardized template
- [ ] All prompts enforce artifact-focused language (no behavioral descriptions)
- [ ] Prompts integrate with MCP mdt-all tools for CR operations

### Testing
- Manual: Execute `mdt-ticket-creation.md` with sample input, verify structured output
- Manual: Execute `mdt-clarification.md` with ambiguous CR, verify improvement
- Manual: Execute `mdt-reflection.md` with implemented CR, verify learning capture
- Integration: Test prompt integration with MCP tools `mcp__mdt-all_*`
## 6. Verification
### By CR Type
- **Feature**: All three prompt files exist and follow standardized structure
- **Implementation**: Prompts execute successfully and produce artifact-focused outputs
- **Integration**: Prompts successfully integrate with MCP mdt-all tool suite

### Verifiable Artifacts
- `prompts/mdt-clarification.md` - Interactive CR clarification workflow
- `prompts/mdt-reflection.md` - Post-implementation learning capture workflow
- `prompts/mdt-ticket-creation.md` - Updated with standardized template format
## 7. Deployment
### Completed Implementation
- Created `prompts/mdt-clarification.md` with structured questioning workflow
- Created `prompts/mdt-reflection.md` with learning capture workflow
- Updated `prompts/mdt-ticket-creation.md` with standardized template format
- All prompts enforce artifact-focused specifications and integrate with MCP tools

### Validation
- All prompt files exist in `prompts/` directory
- Prompts follow standardized structure with consistent headers and sections
- Integration with MCP mdt-all tools verified through tool calls
- Ready for use in development workflow
