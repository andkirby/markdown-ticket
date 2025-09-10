import { Template, ValidationResult, CRType, CRData, CR, Suggestion } from '../models/Types.js';
import * as fs from 'fs';
import * as path from 'path';

export class TemplateService {
  private templates: Map<CRType, Template> = new Map();
  private templatesPath: string;

  constructor(templatesPath?: string) {
    // Default to shared templates directory
    this.templatesPath = templatesPath || path.join(__dirname, '..', 'templates');
    this.loadTemplates();
  }

  private loadTemplates(): void {
    try {
      const configPath = path.join(this.templatesPath, 'templates.json');
      
      if (!fs.existsSync(configPath)) {
        console.warn(`Templates config not found at ${configPath}, using fallback`);
        this.initializeFallbackTemplates();
        return;
      }

      const configContent = fs.readFileSync(configPath, 'utf-8');
      const templatesConfig = JSON.parse(configContent);

      for (const [type, config] of Object.entries(templatesConfig)) {
        const templatePath = path.join(this.templatesPath, (config as any).file);
        
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          
          this.templates.set(type as CRType, {
            type: type as CRType,
            requiredFields: (config as any).requiredFields,
            sections: (config as any).sections,
            template: templateContent
          });
        } else {
          console.warn(`Template file not found: ${templatePath}`);
        }
      }

      console.log(`Loaded ${this.templates.size} templates from ${this.templatesPath}`);
    } catch (error) {
      console.error('Failed to load templates from files:', error);
      this.initializeFallbackTemplates();
    }
  }

  private initializeFallbackTemplates(): void {
    console.log('Using fallback hardcoded templates');
    
    // Bug Fix Template (fallback)
    this.templates.set('Bug Fix', {
      type: 'Bug Fix',
      requiredFields: ['title', 'description', 'priority'],
      sections: [
        { name: 'Problem Statement', required: true, placeholder: 'Describe the bug with clear reproduction steps' },
        { name: 'Current Behavior', required: true, placeholder: "What's actually happening (wrong behavior)" },
        { name: 'Expected Behavior', required: true, placeholder: 'What should happen instead' },
        { name: 'Root Cause Analysis', required: false, placeholder: 'Why this bug exists - fill after investigation' },
        { name: 'Impact Assessment', required: true, placeholder: 'User impact, system stability, data integrity' }
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
*Related bug reports, documentation, code changes*`
    });

    // Feature Enhancement Template
    this.templates.set('Feature Enhancement', {
      type: 'Feature Enhancement',
      requiredFields: ['title', 'description'],
      sections: [
        { name: 'Problem Statement', required: true },
        { name: 'Current State', required: true },
        { name: 'Desired State', required: true },
        { name: 'Rationale', required: true },
        { name: 'Impact Areas', required: false }
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
*Related documents, designs, discussions*`
    });

    // Architecture Template
    this.templates.set('Architecture', {
      type: 'Architecture',
      requiredFields: ['title', 'description', 'rationale'],
      sections: [
        { name: 'Problem Statement', required: true },
        { name: 'Architecture Overview', required: true },
        { name: 'Design Decisions', required: true },
        { name: 'Trade-offs', required: true }
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
*Architecture diagrams, related ADRs, documentation*`
    });

    // Technical Debt Template
    this.templates.set('Technical Debt', {
      type: 'Technical Debt',
      requiredFields: ['title', 'description'],
      sections: [
        { name: 'Problem Statement', required: true },
        { name: 'Current Impact', required: true },
        { name: 'Proposed Solution', required: true }
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
*Code analysis, metrics, related improvements*`
    });

    // Documentation Template
    this.templates.set('Documentation', {
      type: 'Documentation',
      requiredFields: ['title', 'description'],
      sections: [
        { name: 'Documentation Gap', required: true },
        { name: 'Target Audience', required: true },
        { name: 'Content Outline', required: true }
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
*Existing documentation, style guides, examples*`
    });
  }

  getTemplate(type: CRType): Template {
    const template = this.templates.get(type);
    if (!template) {
      const validTypes = Array.from(this.templates.keys());
      throw new Error(`Invalid CR type '${type}'. Must be one of: ${validTypes.join(', ')}`);
    }
    return template;
  }

  validateCRData(data: CRData, type?: CRType): ValidationResult {
    const errors: Array<{field: string, message: string}> = [];
    const warnings: Array<{field: string, message: string}> = [];

    // Basic validation
    if (!data.title || data.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title is required' });
    } else if (data.title.length > 200) {
      warnings.push({ field: 'title', message: 'Title is very long, consider shortening' });
    }

    // Use type parameter if data.type is not provided (common in MCP calls)
    const effectiveType = data.type || type;
    
    if (!effectiveType) {
      errors.push({ field: 'type', message: 'Type is required' });
    } else {
      const validTypes: CRType[] = ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'];
      if (!validTypes.includes(effectiveType)) {
        errors.push({ 
          field: 'type', 
          message: `Invalid type '${effectiveType}'. Must be one of: ${validTypes.join(', ')}` 
        });
      }
    }

    if (data.priority) {
      const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
      if (!validPriorities.includes(data.priority)) {
        errors.push({ 
          field: 'priority', 
          message: `Invalid priority '${data.priority}'. Must be one of: ${validPriorities.join(', ')}` 
        });
      }
    } else {
      warnings.push({ field: 'priority', message: 'Priority not specified, will default to Medium' });
    }

    // Type-specific validation
    if (effectiveType) {
      const template = this.templates.get(effectiveType);
      if (template) {
        for (const field of template.requiredFields) {
          if (field === 'description' && (!data.description || data.description.trim().length === 0)) {
            if (effectiveType === 'Bug Fix') {
              errors.push({ field: 'description', message: 'Description with reproduction steps is required for bug fixes' });
            } else {
              warnings.push({ field: 'description', message: 'Description recommended for better CR quality' });
            }
          }
        }
      }
    }

    // General recommendations
    if (!data.description) {
      warnings.push({ field: 'description', message: 'Consider adding a description for better context' });
    }

    if (!data.impactAreas || data.impactAreas.length === 0) {
      warnings.push({ field: 'impactAreas', message: 'Consider specifying affected system areas' });
    }

    if (data.type === 'Bug Fix' && data.priority !== 'High' && data.priority !== 'Critical') {
      warnings.push({ field: 'priority', message: 'Bug fixes typically have High or Critical priority' });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  suggestImprovements(cr: CR): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Content analysis
    if (!cr.content || cr.content.length < 200) {
      suggestions.push({
        type: 'improvement',
        title: 'Expand Content',
        description: 'CR content is minimal. Consider adding more detailed description, analysis, and implementation notes.',
        actionable: true
      });
    }

    // Architecture-specific suggestions
    if (cr.type === 'Architecture') {
      if (!cr.content.includes('diagram') && !cr.content.includes('architecture')) {
        suggestions.push({
          type: 'improvement',
          title: 'Add Architecture Diagrams',
          description: 'Architecture CRs benefit from visual diagrams showing system structure and data flow.',
          actionable: true
        });
      }
    }

    // Bug Fix specific suggestions
    if (cr.type === 'Bug Fix') {
      if (!cr.content.includes('reproduction') && !cr.content.includes('steps')) {
        suggestions.push({
          type: 'improvement',
          title: 'Add Reproduction Steps',
          description: 'Bug fix CRs should include clear steps to reproduce the issue.',
          actionable: true
        });
      }

      if (!cr.content.includes('root cause')) {
        suggestions.push({
          type: 'improvement',
          title: 'Root Cause Analysis',
          description: 'Identify and document the root cause, not just the symptoms.',
          actionable: true
        });
      }
    }

    // General improvements
    if (cr.status === 'Proposed' && !cr.content.includes('acceptance criteria')) {
      suggestions.push({
        type: 'improvement',
        title: 'Define Acceptance Criteria',
        description: 'Add specific, testable criteria that define when this CR is complete.',
        actionable: true
      });
    }

    if (!cr.phaseEpic || cr.phaseEpic.includes('undefined')) {
      suggestions.push({
        type: 'improvement',
        title: 'Assign to Phase/Epic',
        description: 'Link this CR to a specific project phase or epic for better planning.',
        actionable: true
      });
    }

    if (!cr.implementationNotes && cr.status === 'Implemented') {
      suggestions.push({
        type: 'improvement',
        title: 'Add Implementation Notes',
        description: 'Document what was actually implemented, any deviations from the plan, and lessons learned.',
        actionable: true
      });
    }

    // Related CR suggestions
    suggestions.push({
      type: 'related',
      title: 'Find Related CRs',
      description: 'Use find_related_crs tool to discover CRs that might be related to this one.',
      actionable: true
    });

    // Priority and urgency
    if (cr.type === 'Technical Debt' && cr.priority === 'Low') {
      suggestions.push({
        type: 'improvement',
        title: 'Consider Priority',
        description: 'Technical debt often has compound effects. Consider if priority should be higher.',
        actionable: true
      });
    }

    return suggestions.slice(0, 8); // Return top 8 suggestions
  }
}