import { jest } from '@jest/globals'

/**
 * Mock implementation of TemplateService for testing
 */

export class TemplateService {
  validateTicketData = jest.fn()
  suggestImprovements = jest.fn()
  getTemplate = jest.fn()
  generateTemplate = jest.fn()
  applyTemplate = jest.fn()
}

// Export mock instance for easy access in tests
export const mockTemplateService = new TemplateService()
