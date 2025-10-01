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
- `relatedTickets`: Comma-separated list of related CR codes (e.g., "CR-A001,CR-A002")
- `dependsOn`: Comma-separated list of CR keys this depends on (e.g., "MDT-001,MDT-005")
- `blocks`: Comma-separated list of CR keys this blocks (e.g., "MDT-010,MDT-015")
- `assignee`: Person responsible for implementation
- `lastModified`: Date when CR was last updated (ISO format) - auto-managed by system
- `implementationDate`: Date when implementation was completed
- `implementationNotes`: Brief notes about implementation completion

#### Removed Attributes (no longer supported):
- ~~`estimatedHours`~~ - Use `effort` instead (Small/Medium/Large)
- ~~`actualHours`~~ - Use `implementationNotes` for time tracking
- ~~`supersedes`~~ - Use `relatedTickets` for CR relationships
- ~~`effort`~~ - Simplified, use description if needed
- ~~`reviewers`~~ - Use description or implementation notes
- ~~`dependencies`~~ - Use `dependsOn` for CR relationships
- ~~`riskLevel`~~ - Use description if risk assessment needed
- ~~`tags`~~ - Use type/priority classification instead

**Affected Areas:** These attributes were used in:
- MCP server schemas (mcp-server/src/tools/index.ts)
- Frontend forms (may show validation errors)
- Existing CR files (attributes will be ignored, not removed)

#### Future Features (not currently implemented):
- `impact`: Major | Minor | Breaking | Patch - Impact level classification
- `impactAreas`: Areas of the system that will be impacted - Structured impact tracking

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

1. **Create a new file** in `[[project.path]]/` using the naming convention:
   - `[[project.code]]-###-[summary-name].md`
   - Example: `[[project.code]]-001-push-based-file-watching.md`

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
- **UI/UX Changes**: User interface modifications (reference UIRD.md patterns)
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
- **Documentation Updates**: Links to updated FRD.md, UIRD.md, TSD.md sections
- **Related CRs**: Cross-references to dependent or related change requests

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

### Status Updates
Update the Status field in the CR header when lifecycle changes occur:
```markdown
- **Status**: Implemented
- **Implementation Date**: 2025-01-15
```

## Archival Policy

### Archive CRs only when:
- **Feature completely removed**: The feature/requirement is entirely eliminated from the system
- **CR becomes obsolete**: Superseded by fundamental architectural changes
- **Rejected after consideration**: CR was thoroughly evaluated but not implemented
- **Bug Fix CRs**: Can be deleted (not just archived) after implementation and verification period

### Never archive:
- **Successfully implemented CRs** - These are permanent ADRs (except Bug Fix CRs)
- **CRs that explain current system behavior** - Essential for understanding existing functionality
- **CRs with valuable decision context** - Historical rationale remains important

### Exception: Bug Fix CRs
- **Can be deleted** after implementation and verification
- Are temporary problem solutions, not permanent architectural decisions
- Should be removed to keep CR directory focused on architectural decisions

### Archival Process
When archiving is appropriate:
1. Update CR status to `Deprecated`, `Rejected`, or `Superseded`
2. Add final notes explaining why the CR is being archived
3. Move file to `[[project.path]]/archive/` directory
4. Update any referencing CRs to note the archival

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

### Documentation Integration
- **Reference in main docs**: Use quarterly consolidation to update FRD.md, UIRD.md, TSD.md
- **Preserve CR details**: Main docs should summarize; CRs contain full decision context
- **Maintain search capability**: Ensure CRs remain findable for future reference
- **Cross-link appropriately**: Create clear navigation between CRs and main documentation

## Search and Navigation

### Finding Relevant CRs
Use these patterns for efficient CR discovery:
- **By status**: `grep -r "Status: Implemented" [[project.path]]/`
- **By type**: `grep -r "Type: Feature Enhancement" [[project.path]]/`
- **By priority**: `grep -r "Priority: High" [[project.path]]/`
- **By implementation date**: `grep -r "Implementation Date: 2025" [[project.path]]/`
- **Cross-references**: `grep -r "Related CRs.*[[project.code]]" [[project.path]]/`

### CR Naming Conventions
- Use descriptive summary names that remain meaningful over time
- Include primary feature/area in the name for easy identification
- Use sequential numbering ([[project.code]]-001, [[project.code]]-002, etc.)
- Track phase information in header metadata, not filename

## Integration with Main Documentation

CRs work in conjunction with the main documentation system:

### Quarterly Consolidation
- Review all CRs implemented since last consolidation
- Update FRD.md, UIRD.md, TSD.md to reflect stable system state
- Add references to specific CRs for detailed context
- Maintain CRs as the authoritative source for decision details

### Documentation Hierarchy
- **Main Docs**: High-level, stable system description
- **Active CRs**: Detailed specifications and recent decisions
- **Implemented CRs**: Permanent ADRs with full decision context

This approach ensures comprehensive architectural decision tracking while maintaining development velocity and documentation quality.

---

*This manual provides a universal framework for Change Request management and should be customized per project using .cr-config.toml configuration files.*

## Project Configuration

This manual uses template variables that are substituted based on project-specific configuration:

```toml
[project]
name = "Your Project Name"
code = "MDT"              # Results in MDT-001, MDT-002, etc.
path = "docs/CRs"         # Where CRs are stored
startNumber = 1           # Starting number for CRs
counterFile = ".mdt-next"  # File to track next available number (project-specific)
```

When tools process this manual, variables like `[[project.code]]` are replaced with actual values from the project's .{project.code}-config.toml file.

### Counter File Management
The `counterFile` (e.g., `.mdt-next`) stores the next available CR number:
- Content: Simple integer (e.g., `2` means next CR will be MDT-002)
- Location: Same directory as .{project.code}-config.toml
- Auto-increment: Tools update this file when creating new CRs
- Manual override: Can be edited to skip numbers or restart sequence