📑 Optimized CR Management Guide

Part 1 — Core CR Specification (Authoritative)

YAML Frontmatter

Mandatory fields:
	•	code → e.g. MDT-001, CR-A020
	•	title → short descriptive title
	•	status → Proposed | Approved | In Progress | Implemented | Rejected
	•	dateCreated → YYYY-MM-DD
	•	type → Architecture | Feature Enhancement | Bug Fix | Technical Debt | Documentation
	•	priority → Low | Medium | High | Critical

### Complete Attribute Reference

#### Mandatory Attributes (always include):
- `code`: CR identifier (e.g., "MDT-001", "CR-A007")
- `title`: Brief descriptive title
- `status`: Proposed | Approved | In Progress | Implemented | Rejected
- `dateCreated`: Date in YYYY-MM-DD or ISO format
- `type`: Architecture | Feature Enhancement | Bug Fix | Technical Debt | Documentation
- `priority`: Low | Medium | High | Critical

#### Optional Attributes (include only if they have values):
- `phaseEpic`: Project phase/epic (e.g., "Phase A (Foundation)", "Phase B (Enhancement)")
- `description`: Problem statement or description
- `rationale`: Rationale for this CR
- `relatedTickets`: Comma-separated list of related CR codes (e.g., "CR-A001,CR-A002")
- `dependsOn`: Comma-separated list of CR keys this depends on (e.g., "MDT-001,MDT-005")
- `blocks`: Comma-separated list of CR keys this blocks (e.g., "MDT-010,MDT-015")
- `assignee`: Person responsible for implementation
- `lastModified`: Date when CR was last updated (ISO format) - auto-managed by system
- `implementationDate`: Date when implementation was completed
- `implementationNotes`: Brief notes about implementation completion

CR Sections
	•	For Bug Fixes: Problem Statement, Current Behavior, Expected Behavior, Root Cause, Impact Assessment
	•	For All Others: Problem Statement, Current State, Desired State, Rationale, Impact Areas
	•	Solution Analysis: approaches considered, trade-offs, decision
	•	Implementation Specification: requirements, UI/API/DB/config changes
	•	Acceptance Criteria: testable conditions (plus regression checks for Bug Fixes)
	•	Implementation Notes: (empty at creation)
	•	References: related tasks/CRs, docs, code changes

CR Lifecycle
	•	Proposed → Approved → In Progress → Implemented → Rejected
	•	Bug Fix cleanup: may be deleted after 30–90 days once verified.

⸻

## MCP Function Workflows

All functions are provided by the **`mdt-ticket` MCP server**.

When to Use MCP

Always use MCP functions for CR activities: create, read, update, delete, list, validate, analyze.
Fallback: If MCP fails, follow manual spec (Part 1).

## MCP Function Workflows

All functions are provided by the **`mdt-ticket` MCP server**.

**Core MCP Tools:**
- `list_projects` - List all discovered projects
- `get_project_info` - Get detailed project information
- `list_crs` - List CRs for a project with filtering
- `get_cr` - Get detailed CR information
- `create_cr` - Create new change requests
- `update_cr_attrs` - Update CR attributes (excludes status)
- `update_cr_status` - Update CR status
- `delete_cr` - Delete CRs (for implemented bug fixes)
- `get_cr_template` - Get template for CR type
- `suggest_cr_improvements` - Get suggestions for improving CRs

**Typical Workflow:**
1. `list_projects` → `get_project_info` (discovery)
2. `get_cr_template` → `create_cr` (creation)
3. `list_crs` → `get_cr` (research)
4. `update_cr_attrs` / `update_cr_status` (updates)
5. `delete_cr` (cleanup for bug fixes)

CR Code Format:
Each Change Request code is auto-generated using the project’s code prefix and numbering scheme.
	•	Format: {project.code}-{numberFormat}
	•	project.code = unique project identifier (e.g. MDT, CR).
	•	numberFormat = project-specific numbering (e.g. 001, A001).

Examples:
	•	MDT project → MDT-001
	•	CR project → CR-A001

Part 3 — Best Practices
	•	Always clarify unclear requirements before creating CRs
 	•	Acceptance Criteria must be specific & testable
	•	Cross-reference related CRs where possible
	•	For bug fixes: ensure reproducibility, document root cause, add regression tests, and keep CR temporarily before deletion

📌 Result:
	•	No duplication → YAML schema, lifecycle, and structure live only in Part 1.
	•	MCP doc (Part 2) is now lightweight and just points back to Part 1 for content rules.
	•	LLM prompt footprint reduced — you can load just the spec + workflows relevant to the task.
