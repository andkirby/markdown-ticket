import { jest } from '@jest/globals';

/**
 * Mock implementation of MarkdownSectionService for testing
 *
 * The real MarkdownSectionService has static methods, so the mock
 * must also have static methods to match the interface.
 */

export interface SectionMatch {
  headerText: string;
  headerLevel: number;
  startLine: number;
  endLine: number;
  content: string;
  hierarchicalPath: string;
}

export class MarkdownSectionService {
  // Static methods to match the real service
  static findSection = jest.fn();
  static replaceSection = jest.fn();
  static appendToSection = jest.fn();
  static prependToSection = jest.fn();
  static findHierarchicalSection = jest.fn();
}

// Export the class itself as the mock (matches typeof MarkdownSectionService)
export const mockMarkdownSectionService = MarkdownSectionService;

