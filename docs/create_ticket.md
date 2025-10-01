# Change Requests (CRs) Manual

This manual describes how to create, manage, and maintain Change Requests (CRs) in any project. CRs serve a dual purpose as both implementation specifications and permanent Architectural Decision Records (ADRs).

⸻

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

Every CR includes YAML frontmatter with standardized attributes (handled automatically by MCP tools):

### Complete Attribute Reference

| Attribute | Required | Description | Example |
|-----------|----------|-------------|---------|
| `code` | Yes | CR identifier | "MDT-001", "CR-A007" |
| `title` | Yes | Brief descriptive title | "Push-based file watching" |
| `status` | Yes | Current status | Proposed, Approved, In Progress, Implemented, Rejected, On Hold |
| `type` | Yes | CR category | Architecture, Feature Enhancement, Bug Fix, Technical Debt, Documentation |
| `priority` | Yes | Priority level | P1 (Critical), P2 (High), P3 (Medium), P4 (Low) |
| `phaseEpic` | No | Project phase/epic | "Phase A (Foundation)", "Phase B (Enhancement)" |
| `relatedTickets` | No | Related CR codes | "CR-A001,CR-A002" |
| `dependsOn` | No | Dependencies | "MDT-001,MDT-005" |
| `blocks` | No | CRs blocked by this | "MDT-010,MDT-015" |
| `assignee` | No | Person responsible for implementation | "Alice Smith" |
| `implementationDate` | No | Date when implementation was completed | "2025-09-20" |
| `implementationNotes` | No | Brief notes about implementation completion | Post-implementation details |

### YAML Frontmatter vs Markdown Content

**YAML Frontmatter** contains only **metadata**:
- System fields: `code`, `dateCreated`, `lastModified`
- Required: `title`, `status`, `type`, `priority`
- Optional: `phaseEpic`, `assignee`, `relatedTickets`, `dependsOn`, `blocks`, `implementationDate`, `implementationNotes`

**Markdown Content** contains all **descriptive text**:
- `## 1. Description` - Problem statement, current state, desired state, impact areas
- `## 2. Rationale` - Why this change is needed
- `## 3. Solution Analysis` - Approaches considered, trade-offs, chosen solution
- `## 4. Implementation Specification` - Technical requirements
- `## 5. Acceptance Criteria` - Testable completion criteria

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

⸻

## CR Content Structure

### 1. Description
- **Problem Statement**: What problem are we solving?
- **Current State**: What is the current behavior/implementation?
- **Desired State**: What should the new behavior/implementation be?
- **Rationale**: Why is this change important? Why now?
- **Impact Areas**: What parts of the system will be affected?

### 2. Solution Analysis
- **Approaches Considered**: List alternative solutions evaluated
- **Trade-offs Analysis**: Pros/cons of different approaches
- **Decision Factors**: Technical constraints, timeline, resources, user impact
- **Chosen Approach**: Why this solution was selected
- **Rejected Alternatives**: Why other approaches were not chosen

### 3. Implementation Specification
- **Technical Requirements**: Specific technical changes needed
- **UI/UX Changes**: User interface modifications
- **API Changes**: New endpoints, modified responses, breaking changes
- **Database Changes**: Schema modifications, data migrations
- **Configuration**: New settings, environment variables, deployment changes

### 4. Acceptance Criteria
- List specific conditions that must be met
- Include both functional and non-functional requirements
- Specify testing requirements and success metrics
- Define rollback criteria if applicable

⸻

## Priority Guidelines

| Priority | When to Use | Examples |
|----------|-------------|----------|
| **P1 (Critical)** | System down, security issues, data loss | Production outages, security vulnerabilities |
| **P2 (High)** | Major features, significant improvements | Core functionality, performance issues |
| **P3 (Medium)** | Standard features, enhancements | New features, UI improvements |
| **P4 (Low)** | Nice-to-have, technical debt | Code cleanup, documentation updates |

⸻

## Best Practices for LLMs

### Content Quality
- **Be comprehensive**: Include full context and decision-making rationale
- **Document alternatives**: Record all approaches considered and why they were rejected
- **Think long-term**: Write for developers who will read this months or years later
- **Cross-reference**: Link to related CRs using markdown links

### Implementation Notes (Post-Implementation)
Always add after completion:
- **Completion Date**: When implementation was finished
- **Deviations**: Any changes from original specification
- **Lessons Learned**: Insights gained during implementation
- **Follow-up Actions**: Any related work or technical debt created

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
