import { jest } from '@jest/globals';

/**
 * Mock implementation of MarkdownSectionService for testing
 */

export class MarkdownSectionService {
  findSection = jest.fn();
  replaceSection = jest.fn();
  appendToSection = jest.fn();
  prependToSection = jest.fn();
  findHierarchicalSection = jest.fn();
}

export interface SectionMatch {
  headerText: string;
  headerLevel: number;
  startLine: number;
  endLine: number;
  content: string;
  hierarchicalPath: string;
}

// Export mock instance for easy access in tests
export const mockMarkdownSectionService = new MarkdownSectionService();

