/**
 * Behavioral Preservation Tests for SectionHandlers
 * MDT-102 Phase 1: Lock current behavior before refactoring
 *
 * Purpose: These tests call actual handler methods and verify outputs.
 * They document the CURRENT behavior that must be preserved after refactoring.
 *
 * Key behaviors to lock:
 * 1. Response format and structure for all section operations
 * 2. Error messages and validation behavior
 * 3. File I/O operations (currently using fs, will migrate to MarkdownService)
 * 4. Section parsing and manipulation behavior
 */

// Mock ALL external modules BEFORE any imports
jest.mock('fs/promises');
jest.mock('glob');
jest.mock('../../../services/crService.js');

// Setup factory function for the service that needs special mocking
const mockMarkdownSectionService = {
  findSection: jest.fn(),
  replaceSection: jest.fn(),
  appendToSection: jest.fn(),
  prependToSection: jest.fn(),
  findHierarchicalSection: jest.fn()
};

jest.mock('@mdt/shared/services/MarkdownSectionService.js', () => ({
  MarkdownSectionService: mockMarkdownSectionService,
  SectionMatch: expect.any(Object)
}));

// Now we can import the handlers and other modules
import { SectionHandlers } from '../sectionHandlers.js';
import { CRService } from '../../../services/crService.js';
import { ToolError, JsonRpcErrorCode } from '../../../utils/toolError.js';
import { Project } from '@mdt/shared/models/Project.js';
import { Ticket } from '@mdt/shared/models/Ticket.js';
import type { SectionMatch } from '@mdt/shared/services/MarkdownSectionService.js';
import * as fs from 'fs/promises';
import { glob } from 'glob';

describe('SectionHandlers - Behavioral Preservation Tests', () => {
  let sectionHandlers: SectionHandlers;
  let mockCrServiceInstance: jest.Mocked<CRService>;

  // Test project - follows Project interface
  const mockProject: Project = {
    id: 'test-project-id',
    project: {
      code: 'MDT',
      name: 'Test Project',
      path: '/test/path',
      configFile: '/test/path/.mdt-config.toml',
      ticketsPath: 'docs/CRs',
      active: true,
      description: 'Test project for MDT-102'
    },
    metadata: {
      dateRegistered: '2024-01-01T00:00:00.000Z',
      lastAccessed: '2024-01-02T00:00:00.000Z',
      version: '1.0.0'
    }
  };

  // Test ticket
  const mockTicket: Ticket = {
    code: 'MDT-001',
    title: 'Test CR Title',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
    phaseEpic: 'Phase 1',
    assignee: 'developer',
    dateCreated: new Date('2024-01-01'),
    lastModified: new Date('2024-01-02'),
    content: '# Test CR\n\n## Description\nTest content here.',
    filePath: '/test/path/docs/CRs/MDT-001-test-cr-title.md',
    relatedTickets: [],
    dependsOn: [],
    blocks: []
  };

  // Mock file content with YAML frontmatter
  const mockFileContent = `---
code: MDT-001
title: Test CR Title
status: Proposed
type: Feature Enhancement
priority: Medium
phaseEpic: Phase 1
lastModified: 2024-01-01T00:00:00.000Z
---

# Test CR

## 1. Description

This is the description section.

## 2. Rationale

This is the rationale section.

### Key Points

- Point 1
- Point 2

## 3. Solution Analysis

Analysis content here.

## 4. Implementation Specification

Implementation details.

## 5. Acceptance Criteria

Criteria here.
`;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock CRService instance
    mockCrServiceInstance = {
      listCRs: jest.fn(),
      getCR: jest.fn(),
      createCR: jest.fn(),
      updateCRStatus: jest.fn(),
      updateCRAttrs: jest.fn(),
      deleteCR: jest.fn(),
      getNextCRNumber: jest.fn()
    } as any;

    // Create handlers with mocked dependencies
    sectionHandlers = new SectionHandlers(
      mockCrServiceInstance,
      mockMarkdownSectionService as any
    );

    // Mock glob to return test file path
    (glob as jest.MockedFunction<typeof glob>).mockResolvedValue([
      '/test/path/docs/CRs/MDT-001-test-cr-title.md'
    ]);

    // Mock sanitization disabled (default behavior)
    process.env.MCP_SANITIZATION_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.MCP_SANITIZATION_ENABLED;
  });

  describe('handleManageCRSections - list operation', () => {
    beforeEach(() => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockFileContent);
    });

    it('should return formatted section list when sections exist', async () => {
      // Mock findSection to return all sections when searching with empty string
      const mockSections: SectionMatch[] = [
        {
          headerText: '# Test CR',
          headerLevel: 1,
          startLine: 0,
          endLine: 20,
          content: mockFileContent.split('---\n')[2],
          hierarchicalPath: '# Test CR'
        },
        {
          headerText: '## 1. Description',
          headerLevel: 2,
          startLine: 9,
          endLine: 13,
          content: 'This is the description section.',
          hierarchicalPath: '# Test CR / ## 1. Description'
        },
        {
          headerText: '## 2. Rationale',
          headerLevel: 2,
          startLine: 13,
          endLine: 20,
          content: 'This is the rationale section.',
          hierarchicalPath: '# Test CR / ## 2. Rationale'
        }
      ];

      mockMarkdownSectionService.findSection.mockReturnValue(mockSections);

      const result = await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'list'
      );

      expect(result).toContain('Sections in CR MDT-001');
      expect(result).toContain('Test CR Title');
      expect(result).toContain('Found');
      expect(result).toContain('section');
    });

    it('should return message when no sections found', async () => {
      // Mock findSection to return empty array
      mockMarkdownSectionService.findSection.mockReturnValue([]);

      const result = await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'list'
      );

      expect(result).toContain('Sections in CR MDT-001');
      expect(result).toContain('No sections found');
    });

    it('should show usage information in list output', async () => {
      const mockSections: SectionMatch[] = [
        {
          headerText: '## 1. Description',
          headerLevel: 2,
          startLine: 0,
          endLine: 5,
          content: 'Content here',
          hierarchicalPath: '## 1. Description'
        }
      ];

      mockMarkdownSectionService.findSection.mockReturnValue(mockSections);

      const result = await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'list'
      );

      expect(result).toContain('Usage:');
      expect(result).toContain('To read or update a section');
    });
  });

  describe('handleManageCRSections - get operation', () => {
    beforeEach(() => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockFileContent);
    });

    it('should return section content when found', async () => {
      const mockSection: SectionMatch[] = [
        {
          headerText: '## 1. Description',
          headerLevel: 2,
          startLine: 9,
          endLine: 13,
          content: 'This is the description section.',
          hierarchicalPath: '## 1. Description'
        }
      ];

      mockMarkdownSectionService.findSection.mockReturnValue(mockSection);

      const result = await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'get',
        'Description'
      );

      expect(result).toContain('Section Content from CR MDT-001');
      expect(result).toContain('Section:');
      expect(result).toContain('Content Length:');
      expect(result).toContain('characters');
    });

    it('should throw error when section not found', async () => {
      mockMarkdownSectionService.findSection.mockReturnValue([]);

      await expect(sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'get',
        'NonExistent'
      )).rejects.toThrow('Section "NonExistent" not found in CR MDT-001');
    });

    it('should throw error when multiple sections match', async () => {
      const mockSections: SectionMatch[] = [
        {
          headerText: '## Description',
          headerLevel: 2,
          startLine: 5,
          endLine: 10,
          content: 'Content 1',
          hierarchicalPath: '## Description'
        },
        {
          headerText: '### Description',
          headerLevel: 3,
          startLine: 11,
          endLine: 15,
          content: 'Content 2',
          hierarchicalPath: '## Description / ### Description'
        }
      ];

      mockMarkdownSectionService.findSection.mockReturnValue(mockSections);

      await expect(sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'get',
        'Description'
      )).rejects.toThrow('Multiple sections match');
    });

    it('should require section parameter for get operation', async () => {
      await expect(sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'get'
      )).rejects.toThrow(ToolError);
    });
  });

  describe('handleManageCRSections - replace operation', () => {
    const newContent = 'This is the updated content.';

    beforeEach(() => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockFileContent);
      (fs.writeFile as jest.MockedFunction<typeof fs.writeFile>).mockResolvedValue(undefined);
    });

    it('should replace section content and return confirmation', async () => {
      const mockSection: SectionMatch[] = [
        {
          headerText: '## 1. Description',
          headerLevel: 2,
          startLine: 9,
          endLine: 13,
          content: 'Old content',
          hierarchicalPath: '## 1. Description'
        }
      ];

      mockMarkdownSectionService.findSection.mockReturnValue(mockSection);
      mockMarkdownSectionService.replaceSection.mockReturnValue(
        mockFileContent.replace('This is the description section.', newContent)
      );

      const result = await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'replace',
        'Description',
        newContent
      );

      expect(result).toContain('Updated Section in CR MDT-001');
      expect(result).toContain('**Operation:** replace');
      expect(result).toContain('Content Length:');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should update lastModified timestamp in YAML', async () => {
      const mockSection: SectionMatch[] = [
        {
          headerText: '## 1. Description',
          headerLevel: 2,
          startLine: 9,
          endLine: 13,
          content: 'Old content',
          hierarchicalPath: '## 1. Description'
        }
      ];

      mockMarkdownSectionService.findSection.mockReturnValue(mockSection);
      mockMarkdownSectionService.replaceSection.mockReturnValue(mockFileContent);

      await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'replace',
        'Description',
        newContent
      );

      expect(fs.writeFile).toHaveBeenCalled();
      const writeArgs = (fs.writeFile as jest.MockedFunction<typeof fs.writeFile>).mock.calls[0];
      const writtenContent = writeArgs[1] as string;
      expect(writtenContent).toMatch(/lastModified:\s*\d{4}-\d{2}-\d{2}T/);
    });

    it('should throw error when section not found', async () => {
      mockMarkdownSectionService.findSection.mockReturnValue([]);

      await expect(sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'replace',
        'NonExistent',
        newContent
      )).rejects.toThrow('Section');
    });

    it('should require section and content parameters for replace', async () => {
      await expect(sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'replace'
      )).rejects.toThrow(ToolError);
    });
  });

  describe('handleManageCRSections - append operation', () => {
    const contentToAppend = 'Additional content to append.';

    beforeEach(() => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockFileContent);
      (fs.writeFile as jest.MockedFunction<typeof fs.writeFile>).mockResolvedValue(undefined);
    });

    it('should append content to section and return confirmation', async () => {
      const mockSection: SectionMatch[] = [
        {
          headerText: '## 1. Description',
          headerLevel: 2,
          startLine: 9,
          endLine: 13,
          content: 'Existing content.',
          hierarchicalPath: '## 1. Description'
        }
      ];

      mockMarkdownSectionService.findSection.mockReturnValue(mockSection);
      mockMarkdownSectionService.appendToSection.mockReturnValue(
        mockFileContent.replace('Existing content.', 'Existing content.\n\n' + contentToAppend)
      );

      const result = await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'append',
        'Description',
        contentToAppend
      );

      expect(result).toContain('Updated Section in CR MDT-001');
      expect(result).toContain('**Operation:** append');
      expect(result).toContain('Content has been added to the end of the section');
    });
  });

  describe('handleManageCRSections - prepend operation', () => {
    const contentToPrepend = 'Initial content.';

    beforeEach(() => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockFileContent);
      (fs.writeFile as jest.MockedFunction<typeof fs.writeFile>).mockResolvedValue(undefined);
    });

    it('should prepend content to section and return confirmation', async () => {
      const mockSection: SectionMatch[] = [
        {
          headerText: '## 1. Description',
          headerLevel: 2,
          startLine: 9,
          endLine: 13,
          content: 'Existing content.',
          hierarchicalPath: '## 1. Description'
        }
      ];

      mockMarkdownSectionService.findSection.mockReturnValue(mockSection);
      mockMarkdownSectionService.prependToSection.mockReturnValue(
        mockFileContent.replace('Existing content.', contentToPrepend + '\n\nExisting content.')
      );

      const result = await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'prepend',
        'Description',
        contentToPrepend
      );

      expect(result).toContain('Updated Section in CR MDT-001');
      expect(result).toContain('**Operation:** prepend');
      expect(result).toContain('Content has been added to the beginning of the section');
    });
  });

  describe('handleManageCRSections - validation errors', () => {
    it('should throw protocol error for invalid CR key', async () => {
      await expect(sectionHandlers.handleManageCRSections(
        mockProject,
        'INVALID',
        'list'
      )).rejects.toThrow(ToolError);

      try {
        await sectionHandlers.handleManageCRSections(
          mockProject,
          'INVALID',
          'list'
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ToolError);
        const toolError = error as ToolError;
        expect(toolError.isProtocolError()).toBe(true);
        expect(toolError.code).toBe(JsonRpcErrorCode.InvalidParams);
      }
    });

    it('should throw protocol error for invalid operation', async () => {
      await expect(sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'invalid'
      )).rejects.toThrow(ToolError);
    });

    it('should support legacy "update" operation mapped to "replace"', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockFileContent);
      (fs.writeFile as jest.MockedFunction<typeof fs.writeFile>).mockResolvedValue(undefined);

      const mockSection: SectionMatch[] = [
        {
          headerText: '## 1. Description',
          headerLevel: 2,
          startLine: 9,
          endLine: 13,
          content: 'Old content',
          hierarchicalPath: '## 1. Description'
        }
      ];

      mockMarkdownSectionService.findSection.mockReturnValue(mockSection);
      mockMarkdownSectionService.replaceSection.mockReturnValue(mockFileContent);

      // Should work the same as 'replace'
      const result = await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'update',
        'Description',
        'New content'
      );

      expect(result).toContain('Updated Section in CR MDT-001');
    });
  });

  describe('handleManageCRSections - file I/O behavior', () => {
    it('should read file content for list operation', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockFileContent);

      mockMarkdownSectionService.findSection.mockReturnValue([]);

      await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'list'
      );

      expect(fs.readFile).toHaveBeenCalledWith(
        '/test/path/docs/CRs/MDT-001-test-cr-title.md',
        'utf-8'
      );
    });

    it('should read and write file for replace operation', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockFileContent);
      (fs.writeFile as jest.MockedFunction<typeof fs.writeFile>).mockResolvedValue(undefined);

      const mockSection: SectionMatch[] = [
        {
          headerText: '## 1. Description',
          headerLevel: 2,
          startLine: 9,
          endLine: 13,
          content: 'Old content',
          hierarchicalPath: '## 1. Description'
        }
      ];

      mockMarkdownSectionService.findSection.mockReturnValue(mockSection);
      mockMarkdownSectionService.replaceSection.mockReturnValue(mockFileContent);

      await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'replace',
        'Description',
        'New content'
      );

      expect(fs.readFile).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should throw error for invalid YAML frontmatter', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(
        'No frontmatter here\nJust plain content'
      );

      mockMarkdownSectionService.findSection.mockReturnValue([]);

      await expect(sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'list'
      )).rejects.toThrow('Invalid CR file format');
    });
  });

  describe('handleManageCRSections - glob behavior', () => {
    it('should use glob to find ticket file path', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockFileContent);

      mockMarkdownSectionService.findSection.mockReturnValue([]);

      await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'list'
      );

      expect(glob).toHaveBeenCalledWith(
        '/test/path/docs/CRs/MDT-001-*.md',
        { absolute: true }
      );
    });

    it('should throw error when glob returns no files', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (glob as jest.MockedFunction<typeof glob>).mockResolvedValue([]);

      await expect(sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'list'
      )).rejects.toThrow("CR file for 'MDT-001' not found");
    });
  });

  describe('handleManageCRSections - section header renaming', () => {
    it('should support renaming section by providing new header in content', async () => {
      const contentWithNewHeader = '## 1. New Description Name\n\nNew content here.';

      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockFileContent);
      (fs.writeFile as jest.MockedFunction<typeof fs.writeFile>).mockResolvedValue(undefined);

      const mockSection: SectionMatch[] = [
        {
          headerText: '## 1. Description',
          headerLevel: 2,
          startLine: 9,
          endLine: 13,
          content: 'Old content',
          hierarchicalPath: '## 1. Description'
        }
      ];

      mockMarkdownSectionService.findSection.mockReturnValue(mockSection);
      mockMarkdownSectionService.replaceSection.mockReturnValue(mockFileContent);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'replace',
        'Description',
        contentWithNewHeader
      );

      // Should log warning about section renaming
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('is being renamed to')
      );

      consoleSpy.mockRestore();
    });
  });
});
