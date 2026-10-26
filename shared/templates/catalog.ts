/**
 * Authored source for MDT built-in template text and metadata.
 * File templates are generated projections; runtime fallback uses this same catalog.
 */
import type { Template, TemplateSection } from '@mdt/domain-contracts'

interface BuiltinTemplateDefinition {
  type: string
  file: string
  titlePlaceholder: string
  requiredFields: string[]
  sections: TemplateSection[]
}

export interface BuiltinTemplate extends Template {
  file: string
}

const definitions: BuiltinTemplateDefinition[] = [
  {
    type: 'Bug Fix',
    file: 'bug-fix.md',
    titlePlaceholder: '[Bug Title]',
    requiredFields: [
      'title',
      'description',
      'priority',
    ],
    sections: [
      {
        name: 'Problem Statement',
        required: true,
        placeholder: 'Describe the bug with clear reproduction steps',
      },
      {
        name: 'Current Behavior',
        required: true,
        placeholder: 'What\'s actually happening (wrong behavior)',
      },
      {
        name: 'Expected Behavior',
        required: true,
        placeholder: 'What should happen instead',
      },
      {
        name: 'Root Cause Analysis',
        required: false,
        placeholder: 'Why this bug exists - fill after investigation',
      },
      {
        name: 'Impact Assessment',
        required: true,
        placeholder: 'User impact, system stability, data integrity',
      },
    ],
  },
  {
    type: 'Architecture',
    file: 'architecture.md',
    titlePlaceholder: '[Architecture Title]',
    requiredFields: [
      'title',
      'description',
      'rationale',
    ],
    sections: [
      {
        name: 'Problem Statement',
        required: true,
        placeholder: 'What architectural challenge needs to be addressed?',
      },
      {
        name: 'Proposed Solution',
        required: true,
        placeholder: 'High-level architectural approach',
      },
      {
        name: 'Design Rationale',
        required: true,
        placeholder: 'Why this approach over alternatives',
      },
      {
        name: 'Impact Analysis',
        required: true,
        placeholder: 'System-wide implications and dependencies',
      },
    ],
  },
  {
    type: 'Feature Enhancement',
    file: 'feature-enhancement.md',
    titlePlaceholder: '[Feature Title]',
    requiredFields: [
      'title',
      'description',
    ],
    sections: [
      {
        name: 'Feature Description',
        required: true,
        placeholder: 'What new functionality is being added?',
      },
      {
        name: 'User Stories',
        required: true,
        placeholder: 'As a [user], I want [goal] so that [benefit]',
      },
      {
        name: 'Acceptance Criteria',
        required: true,
        placeholder: 'Specific, testable requirements',
      },
      {
        name: 'Technical Approach',
        required: false,
        placeholder: 'Implementation strategy and considerations',
      },
    ],
  },
  {
    type: 'Technical Debt',
    file: 'technical-debt.md',
    titlePlaceholder: '[Technical Debt Title]',
    requiredFields: [
      'title',
      'description',
      'rationale',
    ],
    sections: [
      {
        name: 'Current State',
        required: true,
        placeholder: 'What technical debt exists?',
      },
      {
        name: 'Problems Caused',
        required: true,
        placeholder: 'How does this debt impact development/maintenance?',
      },
      {
        name: 'Proposed Improvements',
        required: true,
        placeholder: 'What changes will address the debt?',
      },
      {
        name: 'Benefits',
        required: true,
        placeholder: 'How will this improve the codebase?',
      },
    ],
  },
  {
    type: 'Documentation',
    file: 'documentation.md',
    titlePlaceholder: '[Documentation Title]',
    requiredFields: [
      'title',
      'description',
    ],
    sections: [
      {
        name: 'Documentation Gap',
        required: true,
        placeholder: 'What documentation is missing or outdated?',
      },
      {
        name: 'Target Audience',
        required: true,
        placeholder: 'Who will use this documentation?',
      },
      {
        name: 'Content Outline',
        required: true,
        placeholder: 'Key topics and structure to cover',
      },
      {
        name: 'Success Criteria',
        required: true,
        placeholder: 'How will we know the documentation is effective?',
      },
    ],
  },
  {
    type: 'Research',
    file: 'research.md',
    titlePlaceholder: '[Research Title]',
    requiredFields: [
      'title',
      'description',
    ],
    sections: [
      {
        name: 'Research Objective',
        required: true,
        placeholder: 'What question or hypothesis should this research resolve?',
      },
      {
        name: 'Research Context',
        required: true,
        placeholder: 'What problem or decision motivates this research?',
      },
      {
        name: 'Scope',
        required: true,
        placeholder: 'What evidence and boundaries will make this research useful?',
      },
    ],
  },
]

function renderTemplate(definition: BuiltinTemplateDefinition): BuiltinTemplate {
  const sections = definition.sections.filter(section => section.required)
  const body = sections.map((section, index) => {
    const marker = section.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return `## ${index + 1}. ${section.name}\n<!-- mdt:placeholder:${marker} -->\n[${section.placeholder || section.name}]`
  }).join('\n\n')
  return {
    type: definition.type,
    file: definition.file,
    requiredFields: [...definition.requiredFields],
    sections: definition.sections.map(section => ({ ...section })),
    template: `# ${definition.titlePlaceholder}\n\n${body}\n`,
  }
}

export const builtinTemplateCatalog: readonly BuiltinTemplate[] = definitions.map(renderTemplate)
