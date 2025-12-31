import { jest } from '@jest/globals';

/**
 * Mock implementation of MarkdownService for testing
 */

export class MarkdownService {
  static parseMarkdownContent = jest.fn();
  static extractYAMLFrontmatter = jest.fn();
  static parseTicketFromMarkdown = jest.fn();
  static formatTicketAsMarkdown = jest.fn();
  static validateYAMLFormat = jest.fn();
  static sanitizeContent = jest.fn();
  static readFile = jest.fn();
  static writeFile = jest.fn();
  static parseMarkdownFile = jest.fn();
  static generateMarkdownContent = jest.fn();
  static writeMarkdownFile = jest.fn();

  // Instance methods
  parseMarkdownContent = jest.fn();
  extractYAMLFrontmatter = jest.fn();
  parseTicketFromMarkdown = jest.fn();
  formatTicketAsMarkdown = jest.fn();
  validateYAMLFormat = jest.fn();
  sanitizeContent = jest.fn();
  readFile = jest.fn();
  writeFile = jest.fn();
  parseMarkdownFile = jest.fn();
  generateMarkdownContent = jest.fn();
  writeMarkdownFile = jest.fn();
}

// Export mock methods for easy access in tests
export const mockMarkdownService = {
  parseMarkdownContent: MarkdownService.parseMarkdownContent,
  extractYAMLFrontmatter: MarkdownService.extractYAMLFrontmatter,
  parseTicketFromMarkdown: MarkdownService.parseTicketFromMarkdown,
  formatTicketAsMarkdown: MarkdownService.formatTicketAsMarkdown,
  validateYAMLFormat: MarkdownService.validateYAMLFormat,
  sanitizeContent: MarkdownService.sanitizeContent,
  readFile: MarkdownService.readFile,
  writeFile: MarkdownService.writeFile,
  parseMarkdownFile: MarkdownService.parseMarkdownFile,
  generateMarkdownContent: MarkdownService.generateMarkdownContent,
  writeMarkdownFile: MarkdownService.writeMarkdownFile,
};
