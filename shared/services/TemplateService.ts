// Direct imports for standard usage
import type { CRPriorityValue, CRTypeValue, TemplateConfig } from '@mdt/domain-contracts'
import type { Ticket, TicketData } from '../models/Ticket.js'
import type { Suggestion, Template, ValidationResult } from '../models/Types.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CRPriorities, CRStatus, CRTypes, TemplateConfigSchema, TemplatesFileSchema } from '@mdt/domain-contracts'
import { builtinTemplateCatalog } from '../templates/catalog.js'
import { getDefaultPaths } from '../utils/constants.js'

export class TemplateService {
  private templates: Map<string, Template> = new Map()
  private templatesPath: string
  private quiet: boolean

  constructor(templatesPath?: string, quiet: boolean = false) {
    // Default to shared templates directory from constants
    this.templatesPath = templatesPath || getDefaultPaths().TEMPLATES_DIR
    this.quiet = quiet
    if (templatesPath) {
      this.loadTemplates()
    }
    else {
      this.initializeFallbackTemplates()
    }
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
      const templatesConfig = TemplatesFileSchema.parse(JSON.parse(configContent))

      for (const [type, config] of Object.entries(templatesConfig)) {
        // Boundary validation: templates.json is external input (MDT-101)
        const parsedConfig = TemplateConfigSchema.safeParse(config)
        if (!parsedConfig.success) {
          this.log(`Invalid template config for '${type}': ${parsedConfig.error.message}`)
          continue
        }
        const templateConfig: TemplateConfig = parsedConfig.data
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
    this.log('Using compiled built-in templates')
    for (const template of builtinTemplateCatalog) {
      this.templates.set(template.type, {
        type: template.type,
        requiredFields: [...template.requiredFields],
        sections: template.sections.map(section => ({ ...section })),
        template: template.template,
      })
    }
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
