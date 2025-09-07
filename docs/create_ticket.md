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
- `relatedTickets`: Comma-separated list of related CR codes (e.g., "CR-A001,CR-A002")
- `impact`: Major | Minor | Breaking | Patch
- `lastModified`: Date when CR was last updated (ISO format)
- `implementationDate`: Date when implementation was completed
- `implementationNotes`: Brief notes about implementation completion
- `assignee`: Person responsible for implementation
- `estimatedHours`: Time estimate for implementation
- `actualHours`: Actual time spent on implementation
- `reviewers`: Comma-separated list of reviewers
- `dependencies`: External dependencies or prerequisites
- `riskLevel`: Low | Medium | High
- `tags`: Comma-separated tags for categorization

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

Core MCP Calls
	•	Project Discovery
	•	mcp__markdown-ticket__list_projects
	•	mcp__markdown-ticket__get_project_info
	•	CR Creation
	1.	mcp__markdown-ticket__list_cr_templates (discover available types)
	2.	mcp__markdown-ticket__get_cr_template
	3.	mcp__markdown-ticket__validate_cr_data
	4.	mcp__markdown-ticket__create_cr
	5.	Confirm to user
	•	CR Research/Analysis
	•	mcp__markdown-ticket__list_crs
	•	mcp__markdown-ticket__get_cr
	•	mcp__markdown-ticket__find_related_crs
	•	mcp__markdown-ticket__suggest_cr_improvements
	•	Status Management
	•	mcp__markdown-ticket__update_cr_status
	•	For implemented bug fixes → mcp__markdown-ticket__delete_cr (after verification)

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
