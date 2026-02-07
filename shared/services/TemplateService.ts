// Direct imports for standard usage
import type { CRPriorityValue, CRTypeValue } from '@mdt/domain-contracts'
import type { Ticket, TicketData } from '../models/Ticket.js'
import type { Suggestion, Template, ValidationResult } from '../models/Types.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CRPriorities, CRStatus, CRType, CRTypes } from '@mdt/domain-contracts'
import { getDefaultPaths } from '../utils/constants.js'

/**
 * Interface for template configuration from templates.json
 */
interface TemplateConfig {
  file: string
  requiredFields: string[]
  sections: Array<{
    name: string
    required: boolean
    placeholder?: string
  }>
}

export class TemplateService {
  private templates: Map<string, Template> = new Map()
  private templatesPath: string
  private quiet: boolean

  constructor(templatesPath?: string, quiet: boolean = false) {
    // Default to shared templates directory from constants
    this.templatesPath = templatesPath || getDefaultPaths().TEMPLATES_DIR
    this.quiet = quiet
    this.loadTemplates()
  }

  private log(message: string): void {
    if (!this.quiet) {
      console.warn(message)
    }
  }

  private loadTemplates(): void {
    try {
      const configPath = join(this.templatesPath, 'templates.json')

      if (!existsSync(configPath)) {
        this.log(`Templates config not found at ${configPath}, using fallback`)
        this.initializeFallbackTemplates()
        return
      }

      const configContent = readFileSync(configPath, 'utf-8')
      const templatesConfig = JSON.parse(configContent)

      for (const [type, config] of Object.entries(templatesConfig)) {
        const templateConfig = config as TemplateConfig
        const templatePath = join(this.templatesPath, templateConfig.file)

        if (existsSync(templatePath)) {
          const templateContent = readFileSync(templatePath, 'utf-8')

          this.templates.set(type, {
            type,
            requiredFields: templateConfig.requiredFields,
            sections: templateConfig.sections,
            template: templateContent,
          })
        }
        else {
          this.log(`Template file not found: ${templatePath}`)
        }
      }

      this.log(`Loaded ${this.templates.size} templates from ${this.templatesPath}`)
    }
    catch (error) {
      this.log(`Failed to load templates from files: ${error}`)
      this.initializeFallbackTemplates()
    }
  }

  private initializeFallbackTemplates(): void {
    this.log('Using fallback hardcoded templates')

    // Bug Fix Template (fallback)
    this.templates.set(CRType.BUG_FIX, {
      type: CRType.BUG_FIX,
      requiredFields: ['title', 'description', 'priority'],
      sections: [
        { name: 'Problem Statement', required: true, placeholder: 'Describe the bug with clear reproduction steps' },
        { name: 'Current Behavior', required: true, placeholder: 'What\'s actually happening (wrong behavior)' },
        { name: 'Expected Behavior', required: true, placeholder: 'What should happen instead' },
        { name: 'Root Cause Analysis', required: false, placeholder: 'Why this bug exists - fill after investigation' },
        { name: 'Impact Assessment', required: true, placeholder: 'User impact, system stability, data integrity' },
      ],
      template: `# [Bug Title]

## 1. Description

### Problem Statement
[Describe the bug with clear reproduction steps]

### Current Behavior (Wrong)
[What's actually happening]

### Expected Behavior
[What should happen instead]

### Root Cause Analysis
[Why this bug exists - fill after investigation]

### Impact Assessment
[User impact, system stability, data integrity]

## 2. Solution Analysis
[Investigation findings and fix approach]

## 3. Implementation Specification
[Technical fix details]

## 4. Acceptance Criteria
- [ ] Bug is reproducible in test environment
- [ ] Root cause is identified and documented
- [ ] Fix addresses root cause, not just symptoms
- [ ] Regression tests added to prevent recurrence
- [ ] No new bugs introduced by the fix

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References
*Related bug reports, documentation, code changes*`,
    })

    // Feature Enhancement Template
    this.templates.set(CRType.FEATURE_ENHANCEMENT, {
      type: CRType.FEATURE_ENHANCEMENT,
      requiredFields: ['title', 'description'],
      sections: [
        { name: 'Problem Statement', required: true },
        { name: 'Current State', required: true },
        { name: 'Desired State', required: true },
        { name: 'Rationale', required: true },
        { name: 'Impact Areas', required: false },
      ],
      template: `# [Feature Title]

## 1. Description

### Problem Statement
[What problem does this feature solve?]

### Current State
[How things work now]

### Desired State
[How things should work after implementation]

### Rationale
[Why this feature is needed]

### Impact Areas
[Areas of the system that will be affected]

## 2. Solution Analysis

### Approaches Considered
[Different ways to implement this feature]

### Trade-offs Analysis
[Pros and cons of different approaches]

### Chosen Approach
[Selected implementation strategy]

### Rejected Alternatives
[Why other approaches were not chosen]

## 3. Implementation Specification

### Technical Requirements
[Specific technical details]

### UI/UX Changes
[User interface changes if applicable]

### API Changes
[API modifications if applicable]

### Database Changes
[Schema changes if applicable]

## 4. Acceptance Criteria
[Specific, testable conditions that must be met]

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References
*Related documents, designs, discussions*`,
    })

    // Architecture Template
    this.templates.set(CRType.ARCHITECTURE, {
      type: CRType.ARCHITECTURE,
      requiredFields: ['title', 'description', 'rationale'],
      sections: [
        { name: 'Problem Statement', required: true },
        { name: 'Architecture Overview', required: true },
        { name: 'Design Decisions', required: true },
        { name: 'Trade-offs', required: true },
      ],
      template: `# [Architecture Title]

## 1. Description

### Problem Statement
[What architectural problem are we solving?]

### Current Architecture
[How the system is currently structured]

### Proposed Architecture
[New architectural approach]

### Rationale
[Why this architectural change is needed]

## 2. Solution Analysis

### Architecture Overview
[High-level description of the new architecture]

### Key Components
[Major architectural components and their roles]

### Design Decisions
[Important architectural decisions and their reasoning]

### Trade-offs Analysis
[What we gain vs what we lose with this approach]

## 3. Implementation Specification

### Technical Requirements
[Specific implementation requirements]

### Migration Strategy
[How to transition from current to new architecture]

### Dependencies
[External dependencies and constraints]

### Risk Assessment
[Potential risks and mitigation strategies]

## 4. Acceptance Criteria
[How we'll know the architecture is successfully implemented]

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References
*Architecture diagrams, related ADRs, documentation*`,
    })

    // Technical Debt Template
    this.templates.set(CRType.TECHNICAL_DEBT, {
      type: CRType.TECHNICAL_DEBT,
      requiredFields: ['title', 'description'],
      sections: [
        { name: 'Problem Statement', required: true },
        { name: 'Current Impact', required: true },
        { name: 'Proposed Solution', required: true },
      ],
      template: `# [Technical Debt Title]

## 1. Description

### Problem Statement
[What technical debt are we addressing?]

### Current Impact
[How this technical debt is affecting the system]

### Root Cause
[Why this technical debt exists]

### Future Impact
[What happens if we don't address this]

## 2. Solution Analysis

### Proposed Solution
[How we plan to address this technical debt]

### Alternatives Considered
[Other approaches we evaluated]

### Refactoring Strategy
[Step-by-step approach to improvement]

## 3. Implementation Specification

### Technical Requirements
[What needs to be changed]

### Breaking Changes
[Any breaking changes to APIs or interfaces]

### Testing Strategy
[How to ensure we don't break existing functionality]

## 4. Acceptance Criteria
[How we'll know the technical debt is resolved]

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References
*Code analysis, metrics, related improvements*`,
    })

    // Documentation Template
    this.templates.set(CRType.DOCUMENTATION, {
      type: CRType.DOCUMENTATION,
      requiredFields: ['title', 'description'],
      sections: [
        { name: 'Documentation Gap', required: true },
        { name: 'Target Audience', required: true },
        { name: 'Content Outline', required: true },
      ],
      template: `# [Documentation Title]

## 1. Description

### Documentation Gap
[What documentation is missing or needs improvement?]

### Target Audience
[Who will use this documentation?]

### Current State
[What documentation exists now, if any]

### Desired State
[What documentation should exist]

## 2. Content Analysis

### Content Outline
[Structure and topics to be covered]

### Format and Medium
[How the documentation will be delivered]

### Maintenance Strategy
[How to keep documentation up-to-date]

## 3. Implementation Specification

### Content Requirements
[Specific content that must be included]

### Style Guidelines
[Writing style and formatting standards]

### Review Process
[How documentation will be reviewed and approved]

## 4. Acceptance Criteria
[How we'll know the documentation is complete and useful]

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References
*Existing documentation, style guides, examples*`,
    })

    // Research Template
    this.templates.set(CRType.RESEARCH, {
      type: CRType.RESEARCH,
      requiredFields: ['title', 'description'],
      sections: [
        { name: 'Research Objective', required: true },
        { name: 'Research Context', required: true },
        { name: 'Scope', required: true },
      ],
      template: `# [Research Title]

## 1. Description

### Research Objective
Clear statement of what hypothesis or question this research validates:
- Primary hypothesis or research question
- What decision depends on this research
- What uncertainty this research resolves

### Research Context
Write 2-3 bullets providing context:
- What problem or gap motivates this research
- What constraints or assumptions exist
- What prior work or knowledge is relevant

### Scope
Clearly define research boundaries:
- **In scope**: What questions this research addresses
- **Out of scope**: What questions are NOT addressed

## 2. Research Questions

Use table format for all research questions:

| ID | Research Question | Success Criteria | Priority |
|----|-------------------|------------------|----------|
| RQ1 | Specific question to answer | Measurable outcome | High/Medium/Low |
| RQ2 | Specific question to answer | Measurable outcome | High/Medium/Low |
| RQ3 | Specific question to answer | Measurable outcome | High/Medium/Low |

**Guidelines**:
- Each RQ must be answerable with evidence
- Success criteria must be observable/measurable
- Priority guides resource allocation if time-constrained

## 3. Validation Approach

### Research Method
Describe how each RQ will be validated:
- RQ1: Method (e.g., literature review, prototype, experiment, analysis)
- RQ2: Method with specific data sources or tools
- RQ3: Method with measurement approach

### Data Sources
List sources of evidence for each RQ:
- RQ1: Specific documents, codebases, systems to analyze
- RQ2: Specific user groups, metrics, or benchmarks
- RQ3: Specific technologies, frameworks, or patterns to evaluate

### Success Metrics
Define measurable outcomes:
- Evidence threshold for answering each RQ
- Confidence level required for conclusions
- Decision criteria for proceeding vs. pivoting

## 4. Acceptance Criteria

### Research Completion
Checkboxes for each RQ (NOT in code blocks):
- [ ] RQ1 answered with evidence: [summary of findings]
- [ ] RQ2 answered with evidence: [summary of findings]
- [ ] RQ3 answered with evidence: [summary of findings]

### Decision Outcomes
Define possible outcomes and next steps:
- If hypothesis confirmed: [specific action or CR to create]
- If hypothesis refuted: [alternative approach or pivot]
- If inconclusive: [what additional work needed]

### Artifacts Produced
List deliverables from this research:
- Research summary document with findings
- Evidence data (benchmarks, prototypes, analysis)
- Recommendation: [Create new CR / Modify existing CR / Abandon approach]

## 5. Dependencies & Next Steps

### Prerequisites
What must exist before research starts:
- Access to systems, data, or documentation
- Setup or configuration required
- Stakeholder input or approval needed

### Blocked By
List any dependencies:
- [ ] CR-XXX: Prior research or implementation
- [ ] System Y: Access to environment or tool
- [ ] Stakeholder Z: Input or approval

### Next Steps After Research
Based on research outcomes:
- **Positive outcome**: Create CR for [specific feature/change]
- **Negative outcome**: Pivot to [alternative approach]
- **Inconclusive**: Additional research needed for [specific RQ]

## 6. References
*Related research, documentation, proof-of-concepts*`,
    })
  }

  getTemplate(type: string): Template {
    const template = this.templates.get(type)
    if (!template) {
      const validTypes = Array.from(this.templates.keys())
      throw new Error(`Invalid CR type '${type}'. Must be one of: ${validTypes.join(', ')}`)
    }
    return template
  }

  validateTicketData(data: TicketData, type?: string): ValidationResult {
    const errors: Array<{ field: string, message: string }> = []
    const warnings: Array<{ field: string, message: string }> = []

    // Basic validation
    if (!data.title || data.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title is required' })
    }
    else if (data.title.length > 200) {
      warnings.push({ field: 'title', message: 'Title is very long, consider shortening' })
    }

    // Use type parameter if data.type is not provided (common in MCP calls)
    const effectiveType = data.type || type

    if (!effectiveType) {
      errors.push({ field: 'type', message: 'Type is required' })
    }
    else {
      if (!CRTypes.includes(effectiveType as CRTypeValue)) {
        errors.push({
          field: 'type',
          message: `Invalid type '${effectiveType}'. Must be one of: ${CRTypes.join(', ')}`,
        })
      }
    }

    if (data.priority) {
      if (!CRPriorities.includes(data.priority as CRPriorityValue)) {
        errors.push({
          field: 'priority',
          message: `Invalid priority '${data.priority}'. Must be one of: ${CRPriorities.join(', ')}`,
        })
      }
    }
    else {
      warnings.push({ field: 'priority', message: 'Priority not specified, will default to Medium' })
    }

    // Type-specific validation
    if (effectiveType) {
      const template = this.templates.get(effectiveType)
      if (template) {
        for (const field of template.requiredFields) {
          if (field === 'content' && (!data.content || data.content.trim().length === 0)) {
            if (effectiveType === 'Bug Fix') {
              warnings.push({ field: 'content', message: 'Consider providing full content with ## Description (including reproduction steps) for bug fixes' })
            }
            else {
              warnings.push({ field: 'content', message: 'Consider providing full content with ## Description and ## Rationale sections for better CR quality' })
            }
          }
        }
      }
    }

    // General recommendations
    if (!data.content) {
      warnings.push({ field: 'content', message: 'Consider adding full markdown content with ## Description and ## Rationale sections for better context' })
    }

    if (!data.impactAreas || data.impactAreas.length === 0) {
      warnings.push({ field: 'impactAreas', message: 'Consider specifying affected system areas' })
    }

    if (data.type === 'Bug Fix' && data.priority !== 'High' && data.priority !== 'Critical') {
      warnings.push({ field: 'priority', message: 'Bug fixes typically have High or Critical priority' })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  suggestImprovements(ticket: Ticket): Suggestion[] {
    const suggestions: Suggestion[] = []

    // Content analysis
    if (!ticket.content || ticket.content.length < 200) {
      suggestions.push({
        type: 'improvement',
        title: 'Expand Content',
        description: 'CR content is minimal. Consider adding more detailed description, analysis, and implementation notes.',
        actionable: true,
        priority: 'medium',
      })
    }

    // Architecture-specific suggestions
    if (ticket.type === 'Architecture') {
      if (!ticket.content.includes('diagram') && !ticket.content.includes('architecture')) {
        suggestions.push({
          type: 'improvement',
          title: 'Add Architecture Diagrams',
          description: 'Architecture CRs benefit from visual diagrams showing system structure and data flow.',
          actionable: true,
          priority: 'medium',
        })
      }
    }

    // Bug Fix specific suggestions
    if (ticket.type === 'Bug Fix') {
      if (!ticket.content.includes('reproduction') && !ticket.content.includes('steps')) {
        suggestions.push({
          type: 'improvement',
          title: 'Add Reproduction Steps',
          description: 'Bug fix CRs should include clear steps to reproduce the issue.',
          actionable: true,
          priority: 'medium',
        })
      }

      if (!ticket.content.includes('root cause')) {
        suggestions.push({
          type: 'improvement',
          title: 'Root Cause Analysis',
          description: 'Identify and document the root cause, not just the symptoms.',
          actionable: true,
          priority: 'medium',
        })
      }
    }

    // General improvements
    if (ticket.status === CRStatus.PROPOSED && !ticket.content.includes('acceptance criteria')) {
      suggestions.push({
        type: 'improvement',
        title: 'Define Acceptance Criteria',
        description: 'Add specific, testable criteria that define when this CR is complete.',
        actionable: true,
        priority: 'medium',
      })
    }

    if (!ticket.phaseEpic || ticket.phaseEpic.includes('undefined')) {
      suggestions.push({
        type: 'improvement',
        title: 'Assign to Phase/Epic',
        description: 'Link this CR to a specific project phase or epic for better planning.',
        actionable: true,
        priority: 'medium',
      })
    }

    if (!ticket.implementationNotes && ticket.status === CRStatus.IMPLEMENTED) {
      suggestions.push({
        type: 'improvement',
        title: 'Add Implementation Notes',
        description: 'Document what was actually implemented, any deviations from the plan, and lessons learned.',
        actionable: true,
        priority: 'medium',
      })
    }

    // Related CR suggestions
    suggestions.push({
      type: 'related',
      title: 'Find Related CRs',
      description: 'Use find_related_crs tool to discover CRs that might be related to this one.',
      actionable: true,
      priority: 'medium',
    })

    // Priority and urgency
    if (ticket.type === 'Technical Debt' && ticket.priority === 'Low') {
      suggestions.push({
        type: 'improvement',
        title: 'Consider Priority',
        description: 'Technical debt often has compound effects. Consider if priority should be higher.',
        actionable: true,
        priority: 'medium',
      })
    }

    return suggestions.slice(0, 8) // Return top 8 suggestions
  }
}
