---
code: MDT-120
status: Implemented
dateCreated: 2026-01-30T00:51:44.471Z
implementationDate: 2026-01-30
type: Feature Enhancement
priority: Medium
implementationNotes: Added Research type to CR_TYPES array, updated tool description, added Research template to TemplateService.ts with proper sections (Research Objective, Research Questions table, Validation Approach, Acceptance Criteria), updated TicketService.ts to use type-specific templates via templateService.getTemplate(). All 8 E2E tests passing including template content verification that reads created file to confirm Research-specific sections are applied.
---

# Add Research Ticket Type for Technical Validation Workflows

## 1. Description

### Requirements Scope
`full`

### Problem
- Current ticket types (Feature Enhancement, Bug Fix, Architecture, Technical Debt, Documentation) don't fit POC/investigation work
- Research tickets misclassified as "Feature Enhancement" get routed through inappropriate workflows (requirements → bdd → architecture)
- `/mdt:suggest` cannot recommend correct workflow for validation/exploration tickets
- No template structure exists for hypothesis-driven investigation work

### Affected Artifacts
- `mcp-server/src/tools/index.ts` — type enum definition
- `prompts/mdt/commands/ticket-creation.md` — Question 1 options, Research mode structure
- `prompts/mdt/commands/suggest.md` — Research type routing logic
- `prompts/WORKFLOWS.md` — Research workflow documentation
- `prompts/CLAUDE.md` — Quick reference table

### Scope
- **Changes**: Add Research type to MCP, add Research template to ticket-creation, add Research workflow to suggest
- **Unchanged**: Existing types and their workflows, `/mdt:poc` command (already handles research execution)

## 2. Decision
### Chosen Approach
Add "Research" as a new CR type with dedicated template structure optimized for hypothesis-driven validation work.

### Rationale
- Type-driven routing is more stable than content analysis
- Explicit type makes intent clear to all workflows
- Template guides users to structure research properly (questions, criteria, deliverables)
- Integrates cleanly with existing `/mdt:poc` command for execution

See [architecture.md](./MDT-120/architecture.md)

- **Pattern**: Enum Extension
- **Key constraint**: Single source of truth for CR types in shared/models/Types.ts
- **Extension**: Add future types in 5 locations (Types.ts, crHandlers.ts, ticket-creation.md, suggest.md, WORKFLOWS.md); limit 8 total types
## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|---------------|
| **Add Research type** | Explicit type with dedicated template | **ACCEPTED** — stable, clear routing |
| Content-based detection | Analyze ticket content for POC signals | Pattern matching less reliable, harder to test |
| Subtypes under Feature | "Feature Enhancement (Research)" | Complicates type system, unclear routing |
| No change, use /mdt:poc directly | Skip ticket creation | Loses tracking, no structured documentation |

## 4. Artifact Specifications

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `mcp-server/src/tools/index.ts` | Enum extended | Add "Research" to CR type enum |
| `prompts/mdt/commands/ticket-creation.md` | Section added | Add Research type option, Research mode structure |
| `prompts/mdt/commands/suggest.md` | Logic added | Add Research type routing (→ poc workflow) |
| `prompts/WORKFLOWS.md` | Section added | Add Research Workflow diagram |
| `prompts/CLAUDE.md` | Table updated | Add Research to command reference |

### Research Mode Template Structure

| Section | Purpose |
|---------|---------|
| `## 1. Research Objective` | Goal, success definition |
| `## 2. Research Questions` | Hypotheses table with ID, question, criteria, priority |
| `## 3. Validation Approach` | Per-question approach, scope boundaries |
| `## 4. Acceptance Criteria` | Completion checklist, deliverables |
| `## 5. Dependencies & Next Steps` | What CRs this blocks/feeds into |

### Research Workflow

| Step | Command | Output |
|------|---------|--------|
| 1 | `/mdt:ticket-creation` (Research) | CR with research structure |
| 2 | `/mdt:poc` (one or more times) | `poc.md` + `poc/` spike code |
| 3 | `/mdt:reflection` | Findings captured, dependent CRs updated |

### Integration Points

| From | To | Interface |
|------|----|----------|
| ticket-creation | MCP create_cr | type="Research" |
| suggest | poc workflow | type detection → skip feature workflow |
| Research CR | dependent CRs | findings in poc.md |

## 5. Acceptance Criteria

### Functional
- [x] `mcp__mdt-all__create_cr` accepts `type: "Research"`
- [x] `/mdt:ticket-creation` shows Research option in Question 1
- [x] Research type triggers Research mode template (not Full/Requirements)
- [x] `/mdt:suggest` routes Research type to poc workflow
- [x] Research template includes: Research Objective, Research Questions table, Validation Approach, Acceptance Criteria, Dependencies

### Non-Functional
- [x] Research workflow documented in WORKFLOWS.md
- [x] CLAUDE.md quick reference updated
- [x] Existing types unchanged (backward compatible)

### Testing
- Manual: Create Research CR via `/mdt:ticket-creation`, verify template structure
- Manual: Run `/mdt:suggest` on Research CR, verify recommends `/mdt:poc`
- Manual: Verify existing Feature/Bug/etc. CRs unaffected

## 6. Verification

### By CR Type
- **Feature**: Research type exists in MCP enum, template generates correctly, suggest routes appropriately

### Artifacts Verification
- `mcp-server/src/tools/index.ts` contains "Research" in type validation
- `ticket-creation.md` contains Research option and Research mode structure
- `suggest.md` contains Research routing logic
- `WORKFLOWS.md` contains Research Workflow section

## 7. Deployment

- Rebuild MCP server: `cd mcp-server && npm run build`
- No database changes
- No configuration changes
- Backward compatible — existing CRs unaffected

## Implementation Notes

### Completed Tasks
1. Added 'Research' to CRType union in shared/models/Types.ts
2. Added 'Research' to MCP validation array in crHandlers.ts
3. Added Research option to ticket-creation Question 1
4. Added Research mode template structure (5 sections)
5. Added Research routing to suggest.md workflow paths
6. Documented Research workflow in WORKFLOWS.md
7. Updated CLAUDE.md with Research quick reference

### Post-Verify Fixes
- PV-1: Added Research to Step 1 type comment, added "CR type = Research" special case
- PV-2: Updated Research workflow path to match WORKFLOWS.md (ticket-creation → poc → reflection)

### Files Changed
- shared/models/Types.ts (+1 line)
- mcp-server/src/tools/handlers/crHandlers.ts (+1 line)
- prompts/mdt/commands/ticket-creation.md (+125 lines)
- prompts/mdt/commands/suggest.md (new file, +173 lines)
- prompts/WORKFLOWS.md (+26 lines)
- prompts/CLAUDE.md (+35 lines)
- prompts/mdt/.claude-plugin/plugin.json (+3/-2 lines)

### Verification
- All 12 acceptance criteria passed
- Build: Pass (MCP server compiles)
- Tests: Pass (278 tests passed, 0 failed)