/**
 * Content Templates Utility
 *
 * Extracted from ProjectFactory to provide template-based CR content generation.
 * Centralizes all content creation logic and makes it easily maintainable.
 */

import type { CRType } from '../types/project-factory-types'

export interface ContentTemplateData {
  title: string
  description?: string
  rationale?: string
  solutionAnalysis?: string
  implementationSteps?: string[]
  acceptanceCriteria?: string[]
}

export interface CRContentTemplate {
  description?: string
  rationale?: string
  solutionAnalysis?: string
  implementationSteps?: string[]
  acceptanceCriteria?: string[]
}

/**
 * ContentTemplates class provides template-based CR content generation
 * Extracted from ProjectFactory for better separation of concerns
 */
export class ContentTemplates {
  // Section headers required in all CRs
  private static readonly SECTION_HEADERS = {
    DESCRIPTION: '## 1. Description',
    RATIONALE: '## 2. Rationale',
    SOLUTION_ANALYSIS: '## 3. Solution Analysis',
    IMPLEMENTATION: '## 4. Implementation Specification',
    ACCEPTANCE_CRITERIA: '## 5. Acceptance Criteria',
  } as const

  // Default content for different CR types
  private static readonly TYPE_TEMPLATES: Record<CRType, Partial<CRContentTemplate>> = {
    'Architecture': {
      rationale: 'Architectural decisions shape the foundation of the system and impact long-term maintainability',
      solutionAnalysis: 'Will analyze requirements and design a scalable, maintainable architecture',
    },
    'Feature Enhancement': {
      rationale: 'This feature enhances user experience and provides additional value',
      solutionAnalysis: 'Building on existing architecture to add new functionality',
    },
    'Bug Fix': {
      rationale: 'Fixing this bug is critical for system stability and user trust',
      solutionAnalysis: 'Identified the root cause and will implement targeted fix',
    },
    'Technical Debt': {
      rationale: 'Addressing technical debt improves code quality and developer productivity',
      solutionAnalysis: 'Refactoring legacy code to improve maintainability and performance',
    },
    'Documentation': {
      rationale: 'Good documentation ensures knowledge transfer and reduces onboarding time',
      solutionAnalysis: 'Creating comprehensive documentation that serves as reference material',
    },
  }

  /**
   * Generate standard CR content with all required sections
   *
   * @param data - Content template data
   * @param type - Type of CR for type-specific variations
   * @returns Complete CR content as markdown string
   */
  static generateStandardCRContent(data: ContentTemplateData, type?: CRType): string {
    const sections: string[] = []

    // Get type-specific template if provided
    const typeTemplate = type ? this.TYPE_TEMPLATES[type] : {}

    // Build content sections
    sections.push(
      this.SECTION_HEADERS.DESCRIPTION,
      '',
      data.description || 'Description of the change or feature',
      '',
      this.SECTION_HEADERS.RATIONALE,
      '',
      data.rationale || typeTemplate.rationale || 'This change is necessary to improve the system',
      '',
      this.SECTION_HEADERS.SOLUTION_ANALYSIS,
      '',
      data.solutionAnalysis || typeTemplate.solutionAnalysis || 'Will implement the solution following best practices',
      '',
      this.SECTION_HEADERS.IMPLEMENTATION,
      '',
    )

    // Add implementation steps
    const steps = data.implementationSteps || ['Analyze requirements', 'Implement solution', 'Test thoroughly']
    steps.forEach((step, index) => {
      sections.push(`${index + 1}. ${step}`)
    })

    sections.push(
      '',
      this.SECTION_HEADERS.ACCEPTANCE_CRITERIA,
      '',
    )

    // Add acceptance criteria
    const criteria = data.acceptanceCriteria || ['Solution meets requirements', 'Tests pass', 'Documentation updated']
    criteria.forEach((criterion) => {
      sections.push(`- [ ] ${criterion}`)
    })

    return sections.join('\n')
  }

  /**
   * Generate CR content for a specific scenario type
   */
  static generateScenarioCRContent(
    scenarioType: 'standard-project' | 'complex-project',
    crData: { title: string, type: CRType, description?: string },
  ): string {
    const templates = {
      'standard-project': {
        'Architecture': {
          steps: ['Create directory structure', 'Initialize configuration files', 'Setup documentation'],
          criteria: ['Project structure created', 'Configuration files in place', 'Documentation initialized'],
        },
        'Bug Fix': {
          steps: ['Debug the issue', 'Identify root cause', 'Implement fix', 'Add tests'],
          criteria: ['Bug is resolved', 'Tests pass', 'No regression introduced'],
        },
      },
      'complex-project': {
        'Architecture': {
          steps: ['Analyze requirements and constraints', 'Design system components', 'Define interfaces and contracts', 'Create architecture diagrams', 'Review with stakeholders'],
          criteria: ['Architecture approved', 'Diagrams created', 'Documentation complete', 'Performance benchmarks defined'],
        },
        'Feature Enhancement': {
          steps: ['Design feature architecture', 'Implement core functionality', 'Create UI components', 'Add integration points', 'Write comprehensive tests'],
          criteria: ['Feature works as designed', 'UI is responsive', 'Integration complete', 'Test coverage > 90%', 'Performance meets requirements'],
        },
      },
    }

    const scenario = templates[scenarioType]
    const template = (scenario as any)[crData.type] || {}

    return this.generateStandardCRContent({
      title: crData.title,
      description: crData.description || `Create ${crData.type.toLowerCase()} for ${scenarioType}`,
      implementationSteps: template.steps || ['TBD'],
      acceptanceCriteria: template.criteria || ['TBD'],
    }, crData.type)
  }

  /**
   * Get a minimal CR template with just the required sections
   */
  static getMinimalCRTemplate(title: string, description: string): string {
    return this.generateStandardCRContent({
      title,
      description,
      implementationSteps: ['TBD'],
      acceptanceCriteria: ['TBD'],
    })
  }

  /**
   * Get the list of required section headers
   */
  static getRequiredSectionHeaders(): readonly string[] {
    return Object.values(this.SECTION_HEADERS)
  }
}
