import { jest } from '@jest/globals'

/**
 * Mock implementation of TitleExtractionService for testing
 */

export class TitleExtractionService {
  extractTitleFromMarkdown = jest.fn()
  extractTitleFromContent = jest.fn()
  sanitizeTitle = jest.fn()
}

// Export mock instance for easy access in tests
export const mockTitleExtractionService = new TitleExtractionService()
