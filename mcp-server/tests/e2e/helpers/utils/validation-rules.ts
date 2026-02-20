/**
 * Validation Rules Utility
 *
 * Centralized validation logic extracted from ProjectFactory.
 */

import type { ProjectCodeRegex, TestCRData, ValidationError, ValidationResult, ValidationWarning } from '../types/project-factory-types'

export class ValidationRules {
  private static readonly PROJECT_CODE_REGEX: ProjectCodeRegex = /^[A-Z]{2,10}$/
  private static readonly REQUIRED_CR_SECTIONS = ['## 1. Description', '## 2. Rationale']

  static validateProjectCode(projectCode: string): ValidationResult {
    const errors: ValidationError[] = []
    if (!projectCode) {
      errors.push({ code: 'PROJECT_CODE_REQUIRED', message: 'Project code is required', field: 'projectCode' })
    }
    else if (!ValidationRules.PROJECT_CODE_REGEX.test(projectCode)) {
      errors.push({
        code: 'PROJECT_CODE_INVALID_FORMAT',
        message: `Project code '${projectCode}' must be 2-10 uppercase letters (e.g., 'TEST', 'MDT')`,
        field: 'projectCode',
        value: projectCode,
      })
    }
    return { valid: errors.length === 0, errors, warnings: [] }
  }

  static validateProjectName(projectName: string): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (!projectName?.trim()) {
      errors.push({ code: 'PROJECT_NAME_REQUIRED', message: 'Project name is required', field: 'projectName' })
    }
    else {
      if (projectName.length > 100) {
        errors.push({
          code: 'PROJECT_NAME_TOO_LONG',
          message: 'Project name must be 100 characters or less',
          field: 'projectName',
          value: projectName,
        })
      }
      if (projectName.includes('<script>') || projectName.includes('javascript:')) {
        warnings.push({
          code: 'PROJECT_NAME_SUSPICIOUS_CONTENT',
          message: 'Project name contains potentially suspicious content',
          field: 'projectName',
        })
      }
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  static validateCRData(crData: TestCRData): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Title validation
    if (!crData.title?.trim()) {
      errors.push({ code: 'CR_TITLE_REQUIRED', message: 'CR title is required', field: 'title' })
    }
    else if (crData.title.length > 200) {
      errors.push({
        code: 'CR_TITLE_TOO_LONG',
        message: 'CR title must be 200 characters or less',
        field: 'title',
        value: crData.title,
      })
    }

    // Type validation
    if (!crData.type) {
      errors.push({ code: 'CR_TYPE_REQUIRED', message: 'CR type is required', field: 'type' })
    }

    // Content validation
    if (!crData.content?.trim()) {
      errors.push({ code: 'CR_CONTENT_REQUIRED', message: 'CR content is required', field: 'content' })
    }
    else {
      const missingSections = ValidationRules.REQUIRED_CR_SECTIONS.filter(
        section => !crData.content.includes(section),
      )
      if (missingSections.length > 0) {
        warnings.push({
          code: 'CR_CONTENT_MISSING_SECTIONS',
          message: `CR content is missing recommended sections: ${missingSections.join(', ')}`,
          field: 'content',
        })
      }
      const codeBlockCount = (crData.content.match(/```/g) || []).length
      if (codeBlockCount % 2 !== 0) {
        warnings.push({
          code: 'CR_CONTENT_UNCLOSED_CODE_BLOCK',
          message: 'CR content contains unclosed code block',
          field: 'content',
        })
      }
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  static sanitizeInput(input: string): string {
    return input
      ? input
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/\s+on\w+\s*=\s*[^>\s]+/gi, '')
          .trim()
      : input
  }

  static sanitizeProjectCode(projectCode: string): string {
    return projectCode ? projectCode.replace(/[^a-z]/gi, '').toUpperCase().substring(0, 10) : projectCode
  }

  static sanitizeProjectName(projectName: string): string {
    return ValidationRules.sanitizeInput(projectName)?.substring(0, 100) || projectName
  }

  static sanitizeCRTitle(title: string): string {
    return ValidationRules.sanitizeInput(title)?.substring(0, 200) || title
  }

  static sanitizeCRContent(content: string): string {
    return ValidationRules.sanitizeInput(content)
  }

  static validateAndSanitizeProjectCode(projectCode: string): ValidationResult & { sanitized: string } {
    const sanitized = ValidationRules.sanitizeProjectCode(projectCode)
    const result = ValidationRules.validateProjectCode(sanitized)
    return { ...result, sanitized }
  }

  static validateAndSanitizeProjectName(projectName: string): ValidationResult & { sanitized: string } {
    const sanitized = ValidationRules.sanitizeProjectName(projectName)
    const result = ValidationRules.validateProjectName(sanitized)
    return { ...result, sanitized }
  }

  static validateAndSanitizeCRData(crData: TestCRData): ValidationResult & { sanitized: Partial<TestCRData> } {
    const sanitized: Partial<TestCRData> = {
      title: ValidationRules.sanitizeCRTitle(crData.title || ''),
      content: ValidationRules.sanitizeCRContent(crData.content || ''),
      type: crData.type,
      status: crData.status,
      priority: crData.priority,
      phaseEpic: ValidationRules.sanitizeInput(crData.phaseEpic || ''),
      dependsOn: crData.dependsOn,
      blocks: crData.blocks,
      assignee: ValidationRules.sanitizeInput(crData.assignee || ''),
    }
    const result = ValidationRules.validateCRData(sanitized as TestCRData)
    return { ...result, sanitized }
  }
}
