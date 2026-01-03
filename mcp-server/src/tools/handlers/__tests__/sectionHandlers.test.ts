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
jest.mock('../../../services/crService.js');

// Import the mock services
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js';
import { mockMarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js';

// Now we can import the handlers and other modules
import { SectionHandlers } from '../sectionHandlers.js';
import { CRService } from '../../../services/crService.js';
import { ToolError, JsonRpcErrorCode } from '../../../utils/toolError.js';
// Use local test fixtures instead of @mdt/shared imports
import type { Project, Ticket, SectionMatch } from '../../__tests__/test-fixtures.js';
import { createMockProject, createMockTicket, mockFullFileContent } from '../../__tests__/test-fixtures.js';
import * as fs from 'fs/promises';

describe('SectionHandlers - Behavioral Preservation Tests', () => {
  let sectionHandlers: SectionHandlers;
  let mockCrServiceInstance: jest.Mocked<CRService>;

  // Test project - use fixture helper
  const mockProject: Project = createMockProject({
    project: {
      ...createMockProject().project,
      description: 'Test project for MDT-102'
    }
  });

  // Test ticket - use fixture helper
  const mockTicket: Ticket = createMockTicket();

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

    // MDT-102: Mock MarkdownService static methods
    (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);
    (MarkdownService.writeFile as jest.MockedFunction<typeof MarkdownService.writeFile>).mockResolvedValue(undefined);

    // Mock sanitization disabled (default behavior)
    process.env.MCP_SANITIZATION_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.MCP_SANITIZATION_ENABLED;
  });

  describe('handleManageCRSections - list operation', () => {
    beforeEach(() => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);
    });

    it('should return formatted section list when sections exist', async () => {
      // Mock findSection to return all sections when searching with empty string
      const mockSections: SectionMatch[] = [
        {
          headerText: '# Test CR',
          headerLevel: 1,
          startLine: 0,
          endLine: 20,
          content: mockFullFileContent.split('---\n')[2],
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
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);
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
      )).rejects.toThrow("Section 'NonExistent' not found in CR MDT-001.");
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
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);
      (MarkdownService.writeFile as jest.MockedFunction<typeof MarkdownService.writeFile>).mockResolvedValue(undefined);
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
        mockFullFileContent.replace('This is the description section.', newContent)
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
      expect(MarkdownService.writeFile).toHaveBeenCalled();
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
      mockMarkdownSectionService.replaceSection.mockReturnValue(mockFullFileContent);

      await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'replace',
        'Description',
        newContent
      );

      expect(MarkdownService.writeFile).toHaveBeenCalled();
      const writeArgs = (MarkdownService.writeFile as jest.MockedFunction<typeof MarkdownService.writeFile>).mock.calls[0];
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
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);
      (MarkdownService.writeFile as jest.MockedFunction<typeof MarkdownService.writeFile>).mockResolvedValue(undefined);
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
        mockFullFileContent.replace('Existing content.', 'Existing content.\n\n' + contentToAppend)
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
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);
      (MarkdownService.writeFile as jest.MockedFunction<typeof MarkdownService.writeFile>).mockResolvedValue(undefined);
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
        mockFullFileContent.replace('Existing content.', contentToPrepend + '\n\nExisting content.')
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
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);
      (MarkdownService.writeFile as jest.MockedFunction<typeof MarkdownService.writeFile>).mockResolvedValue(undefined);

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
      mockMarkdownSectionService.replaceSection.mockReturnValue(mockFullFileContent);

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
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);

      mockMarkdownSectionService.findSection.mockReturnValue([]);

      await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'list'
      );

      expect(MarkdownService.readFile).toHaveBeenCalledWith(
        '/test/path/docs/CRs/MDT-001-test-cr-title.md'
      );
    });

    it('should read and write file for replace operation', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);
      (MarkdownService.writeFile as jest.MockedFunction<typeof MarkdownService.writeFile>).mockResolvedValue(undefined);

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
      mockMarkdownSectionService.replaceSection.mockReturnValue(mockFullFileContent);

      await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'replace',
        'Description',
        'New content'
      );

      expect(MarkdownService.readFile).toHaveBeenCalled();
      expect(MarkdownService.writeFile).toHaveBeenCalled();
    });

    it('should throw error for invalid YAML frontmatter', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(
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

  describe('handleManageCRSections - CR service integration (MDT-102 refactoring)', () => {
    it('should call crService.getCR to retrieve ticket with filePath', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);

      mockMarkdownSectionService.findSection.mockReturnValue([]);

      await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'list'
      );

      // Verify crService.getCR was called with project and CR key
      expect(mockCrServiceInstance.getCR).toHaveBeenCalledWith(mockProject, 'MDT-001');
      expect(mockCrServiceInstance.getCR).toHaveBeenCalledTimes(1);
    });

    it('should throw error when crService.getCR returns null (ticket not found)', async () => {
      // MDT-102: Previously tested glob returning empty array
      // Now tests crService.getCR returning null
      mockCrServiceInstance.getCR.mockResolvedValue(null);

      await expect(sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'list'
      )).rejects.toThrow("CR 'MDT-001' not found in project");
    });

    it('should use ticket.filePath from crService.getCR result', async () => {
      const ticketWithSpecificPath = {
        ...mockTicket,
        filePath: '/custom/path/to/MDT-001-custom.md'
      };

      mockCrServiceInstance.getCR.mockResolvedValue(ticketWithSpecificPath);
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);

      mockMarkdownSectionService.findSection.mockReturnValue([]);

      await sectionHandlers.handleManageCRSections(
        mockProject,
        'MDT-001',
        'list'
      );

      // Verify the filePath from crService.getCR is used for file reading
      expect(MarkdownService.readFile).toHaveBeenCalledWith(
        '/custom/path/to/MDT-001-custom.md'
      );
    });
  });

  describe('handleManageCRSections - section header renaming', () => {
    it('should support renaming section by providing new header in content', async () => {
      const contentWithNewHeader = '## 1. New Description Name\n\nNew content here.';

      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFullFileContent);
      (MarkdownService.writeFile as jest.MockedFunction<typeof MarkdownService.writeFile>).mockResolvedValue(undefined);

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
      mockMarkdownSectionService.replaceSection.mockReturnValue(mockFullFileContent);

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
