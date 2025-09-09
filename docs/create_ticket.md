# Change Requests (CRs) Manual

This manual describes how to create, manage, and maintain Change Requests (CRs) in any project. CRs serve a dual purpose as both implementation specifications and permanent Architectural Decision Records (ADRs).

## What is a Change Request (CR)?
A Change Request (CR) is a permanent documentation artifact that:
- Documents new requirements, features, or architectural decisions
- Serves as the authoritative implementation specification during development
- Becomes a permanent Architectural Decision Record (ADR) after implementation
- Preserves the context, rationale, and decision-making process for future reference

Each CR is a Markdown file in the project's CR directory (typically `docs/CRs/`) and remains active throughout its lifecycle.

## When to Create a CR
- When introducing any new requirement, feature, or architectural change
- For significant clarifications or corrections to requirements  
- To document architectural decisions and their rationale
- When considering multiple approaches and need to record the decision context
- **For Bug Fixes**: When fixing bugs that require documentation of root cause and solution

## CR Header Format

Every CR must include a standardized header with required and optional attributes:

### Required Core Attributes
```markdown
- **Code**: {project.code}-### (unique identifier from project config)
- **Title/Summary**: Brief descriptive title
- **Status**: [See Status Workflow below]
- **Date Created**: YYYY-MM-DD
- **Type**: Feature Enhancement | Bug Fix | Technical Debt | Architecture | Documentation
- **Priority**: Low | Medium | High | Critical (defaults to Medium)
```

### Complete Attribute Reference

#### Mandatory Attributes (always include):
- `code`: CR identifier (e.g., "MDT-001", "CR-A007")
- `title`: Brief descriptive title
- `status`: Proposed | Approved | In Progress | Implemented | Rejected | On Hold
- `dateCreated`: Date in YYYY-MM-DD or ISO format
- `type`: Architecture | Feature Enhancement | Bug Fix | Technical Debt | Documentation
- `priority`: Low | Medium | High | Critical (defaults to Medium)

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

## Status Workflow

CRs follow a defined status lifecycle:

### Development Lifecycle
- **`Proposed`** - CR created, under review/consideration
- **`Approved`** - CR reviewed and approved for implementation
- **`In Progress`** - Implementation currently underway
- **`Implemented`** - Successfully implemented, CR serves as permanent ADR
- **`On Hold`** - Implementation paused/delayed for specific reasons

### Resolution States
- **`Rejected`** - Not implemented after consideration (with rationale in CR)
- **`Superseded`** - Replaced by newer CR that addresses the same need
- **`Deprecated`** - Feature/requirement no longer relevant or removed
- **`Duplicate`** - Duplicate of another CR (reference the original)
- **`Partially Implemented`** - Some requirements met, others pending/changed

## How to Create a CR

1. **Create a new file** in `docs/CRs/` using the naming convention:
   - `{project.code}-###-[summary-name].md`
   - Example: `MDT-001-push-based-file-watching.md`

2. **Fill out the CR file** with the following sections:

### Header Section
Include all required attributes and relevant optional attributes using the format above.

### 1. Description
Provide comprehensive context:
- **Problem Statement**: What problem are we solving?
- **Current State**: What is the current behavior/implementation?
- **Desired State**: What should the new behavior/implementation be?
- **Rationale**: Why is this change important? Why now?
- **Impact Areas**: What parts of the system will be affected?

### 2. Solution Analysis
Document the decision-making process:
- **Approaches Considered**: List alternative solutions evaluated
- **Trade-offs Analysis**: Pros/cons of different approaches
- **Decision Factors**: Technical constraints, timeline, resources, user impact
- **Chosen Approach**: Why this solution was selected
- **Rejected Alternatives**: Why other approaches were not chosen

### 3. Implementation Specification
Detailed requirements for implementation:
- **Technical Requirements**: Specific technical changes needed
- **UI/UX Changes**: User interface modifications
- **API Changes**: New endpoints, modified responses, breaking changes
- **Database Changes**: Schema modifications, data migrations
- **Configuration**: New settings, environment variables, deployment changes

### 4. Acceptance Criteria
Clear, testable criteria for completion:
- List specific conditions that must be met
- Include both functional and non-functional requirements
- Specify testing requirements and success metrics
- Define rollback criteria if applicable

### 5. Implementation Notes (Added Post-Implementation)
After completion, add:
- **Completion Date**: When implementation was finished
- **Deviations**: Any changes from original specification
- **Lessons Learned**: Insights gained during implementation
- **Follow-up Actions**: Any related work or technical debt created

### 6. References
- **Related Tasks**: Link to specific implementation tasks
- **Code Changes**: Reference commits, pull requests, or branches
- **Documentation Updates**: Links to updated documentation
- **Related CRs**: Cross-references to dependent or related change requests

## MCP Integration

All CR operations can be performed using MCP (Model Context Protocol) tools:

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

## CR Lifecycle Management

### During Development
1. **Create CR** with `Proposed` status and comprehensive context
2. **Review and approve** CR, updating status to `Approved`
3. **Begin implementation**, updating status to `In Progress`
4. **Implement** directly from CR as authoritative specification
5. **Complete implementation**, updating status to `Implemented`
6. **Add implementation notes** with completion details and lessons learned

### After Implementation
- **DO NOT archive or move implemented CRs** - they serve as permanent ADRs
- **Update main documents** during quarterly consolidation using CRs as source material
- **Reference CRs** in main documentation for detailed decision context
- **Keep CRs searchable** for future architectural decisions

#### Special Case: Bug Fix CRs
- **Bug Fix CRs can be deleted** after successful implementation and verification
- Keep for 30-90 days after implementation to ensure no regression
- Unlike architectural CRs, bug fixes are temporary problems, not permanent decisions
- Delete to reduce clutter and keep focus on architectural decisions

## Best Practices

### CR Creation
- **Be comprehensive**: Include full context and decision-making rationale
- **Consider alternatives**: Document approaches considered and why they were rejected
- **Think future-self**: Write for developers who will read this months or years later
- **Cross-reference**: Link to related CRs, documents, and code changes

### Content Quality
- **Clear problem statements**: Make the need obvious to future readers
- **Detailed specifications**: Provide enough detail for implementation without CR author
- **Decision context**: Explain why this approach over alternatives
- **Implementation guidance**: Include technical details and architectural considerations

### Maintenance
- **Keep status current**: Update status promptly as work progresses
- **Add implementation notes**: Capture lessons learned and deviations
- **Update cross-references**: Maintain accurate links to related CRs
- **Review regularly**: Periodically assess active CRs for relevance and progress

## Project Configuration

CRs are managed using project-specific configuration:

```toml
[project]
name = "Your Project Name"
code = "MDT"              # Results in MDT-001, MDT-002, etc.
path = "docs/CRs"         # Where CRs are stored
startNumber = 1           # Starting number for CRs
counterFile = ".mdt-next"  # File to track next available number
```

The system automatically manages CR numbering and file creation based on this configuration.
