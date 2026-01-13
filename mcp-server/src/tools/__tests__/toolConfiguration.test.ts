/**
 * Behavioral Preservation Tests for Tool Configuration Extraction
 *
 * Purpose: Verify tool configuration after extracting to a single configuration file.
 * These tests check that all 10 tools are properly defined and accessible.
 *
 * Extraction Complete: All tool configurations consolidated into config/allTools.ts
 * Impact: Should not change any runtime behavior, only code organization
 */

import fs from 'fs/promises';
import path from 'path';
import { ALL_TOOLS, TOOL_NAMES } from '../config/allTools.js';

describe('Behavioral Preservation: Tool Configuration Structure', () => {
  const builtToolsPath = path.join(process.cwd(), 'dist', 'tools', 'index.js');
  const configPath = path.join(process.cwd(), 'src', 'tools', 'config', 'allTools.ts');

  beforeAll(async () => {
    // Ensure the MCP server is built
    const builtIndex = path.join(process.cwd(), 'dist', 'index.js');
    const indexExists = await fs.access(builtIndex).then(() => true).catch(() => false);

    if (!indexExists) {
      throw new Error('MCP server not built. Run `npm run build` first.');
    }
  });

  describe('Centralized tool configuration structure', () => {
    it('should have exactly 10 tools in ALL_TOOLS export', () => {
      // Check that ALL_TOOLS contains exactly 10 tools
      expect(ALL_TOOLS).toHaveLength(10);

      // Extract tool names
      const toolNames = ALL_TOOLS.map(tool => tool.name);

      // Verify all expected tools are present
      const expectedTools = [
        // Project tools
        TOOL_NAMES.LIST_PROJECTS,
        TOOL_NAMES.GET_PROJECT_INFO,
        // CR/Section tools
        TOOL_NAMES.LIST_CRS,
        TOOL_NAMES.CREATE_CR,
        TOOL_NAMES.GET_CR,
        TOOL_NAMES.UPDATE_CR_STATUS,
        TOOL_NAMES.UPDATE_CR_ATTRS,
        TOOL_NAMES.DELETE_CR,
        TOOL_NAMES.MANAGE_CR_SECTIONS,
        TOOL_NAMES.SUGGEST_CR_IMPROVEMENTS
      ];

      expectedTools.forEach(tool => {
        expect(toolNames).toContain(tool);
      });
    });

    it('should have tool definitions in config/allTools.ts', async () => {
      const configContent = await fs.readFile(configPath, 'utf-8');

      // Should export ALL_TOOLS
      expect(configContent).toContain('export const ALL_TOOLS: Tool[]');

      // Should have project tools defined
      expect(configContent).toContain('export const PROJECT_TOOLS: Tool[]');
      expect(configContent).toContain("name: 'list_projects'");
      expect(configContent).toContain("name: 'get_project_info'");

      // Should have CR/Section tools defined
      expect(configContent).toContain('export const CR_SECTION_TOOLS: Tool[]');
      expect(configContent).toContain("name: 'list_crs'");
    });

    it('should NOT have getProjectTools method in ProjectHandlers', async () => {
      const handlersPath = path.join(process.cwd(), 'src', 'tools', 'handlers', 'projectHandlers.ts');
      const handlersContent = await fs.readFile(handlersPath, 'utf-8');

      // Should NOT contain tool definitions
      expect(handlersContent).not.toContain('getProjectTools(): Tool[]');
      expect(handlersContent).not.toContain("name: 'list_projects'");
      expect(handlersContent).not.toContain("name: 'get_project_info'");
    });

    it('should import ALL_TOOLS in index.ts', async () => {
      const sourcePath = path.join(process.cwd(), 'src', 'tools', 'index.ts');
      const sourceContent = await fs.readFile(sourcePath, 'utf-8');

      // Should import from config
      expect(sourceContent).toContain("import { ALL_TOOLS, TOOL_NAMES } from './config/allTools.js'");

      // Should use ALL_TOOLS in getTools
      expect(sourceContent).toContain('return ALL_TOOLS;');

      // Should NOT have inline tool definitions
      expect(sourceContent).not.toContain('crAndSectionTools: Tool[]');
      expect(sourceContent).not.toContain("name: 'list_crs'");
    });

    it('should use TOOL_NAMES constants for routing', async () => {
      const sourcePath = path.join(process.cwd(), 'src', 'tools', 'index.ts');
      const sourceContent = await fs.readFile(sourcePath, 'utf-8');

      // Should use TOOL_NAMES for project tools
      expect(sourceContent).toContain('TOOL_NAMES.LIST_PROJECTS, TOOL_NAMES.GET_PROJECT_INFO');

      // Should use TOOL_NAMES for CR tools
      expect(sourceContent).toContain('TOOL_NAMES.LIST_CRS');
      expect(sourceContent).toContain('TOOL_NAMES.CREATE_CR');
      expect(sourceContent).toContain('TOOL_NAMES.GET_CR');

      // Should use TOOL_NAMES for error handling
      expect(sourceContent).toContain('Object.values(TOOL_NAMES)');
    });
  });

  describe('Tool schema preservation', () => {
    it('should maintain exact enum values for status', () => {
      const listCRsTool = ALL_TOOLS.find(t => t.name === TOOL_NAMES.LIST_CRS);
      expect(listCRsTool).toBeDefined();

      // Check status filter enum
      const statusProp = (listCRsTool?.inputSchema as any).properties?.filters?.properties?.status;
      expect(statusProp?.oneOf).toBeDefined();

      // Extract enum values
      const statusEnum = statusProp?.oneOf?.find((item: any) => item.enum)?.enum;
      expect(statusEnum).toEqual(['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected']);
    });

    it('should maintain exact enum values for type', () => {
      const listCRsTool = ALL_TOOLS.find(t => t.name === TOOL_NAMES.LIST_CRS);
      expect(listCRsTool).toBeDefined();

      // Check type filter enum
      const typeProp = (listCRsTool?.inputSchema as any).properties?.filters?.properties?.type;
      expect(typeProp?.oneOf).toBeDefined();

      // Extract enum values
      const typeEnum = typeProp?.oneOf?.find((item: any) => item.enum)?.enum;
      expect(typeEnum).toEqual(['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation']);
    });

    it('should maintain exact enum values for priority', () => {
      const listCRsTool = ALL_TOOLS.find(t => t.name === TOOL_NAMES.LIST_CRS);
      expect(listCRsTool).toBeDefined();

      // Check priority filter enum
      const priorityProp = (listCRsTool?.inputSchema as any).properties?.filters?.properties?.priority;
      expect(priorityProp?.oneOf).toBeDefined();

      // Extract enum values
      const priorityEnum = priorityProp?.oneOf?.find((item: any) => item.enum)?.enum;
      expect(priorityEnum).toEqual(['Low', 'Medium', 'High', 'Critical']);
    });
  });

  describe('Tool order preservation', () => {
    it('should maintain project tools before CR/Section tools', () => {
      const toolNames = ALL_TOOLS.map(tool => tool.name);

      // Project tools should come first
      const projectToolsIndex = toolNames.findIndex(t => t === TOOL_NAMES.LIST_PROJECTS);
      const crToolsIndex = toolNames.findIndex(t => t === TOOL_NAMES.LIST_CRS);

      expect(projectToolsIndex).toBeLessThan(crToolsIndex);
      expect(projectToolsIndex).toBe(0);
      expect(toolNames[1]).toBe(TOOL_NAMES.GET_PROJECT_INFO);
      expect(toolNames[2]).toBe(TOOL_NAMES.LIST_CRS);
    });
  });

  describe('Built output verification', () => {
    it('should have all 10 tools in built output', async () => {
      const builtConfigPath = path.join(process.cwd(), 'dist', 'tools', 'config', 'allTools.js');

      // Check if built config exists
      try {
        await fs.access(builtConfigPath);
      } catch {
        // Config might be inlined in index.js
        const toolsContent = await fs.readFile(builtToolsPath, 'utf-8');

        // Count tool definitions
        const toolMatches = toolsContent.match(/name:\s*['"]([^'"]+)['"]/g);
        const toolCount = toolMatches ? toolMatches.length : 0;

        // Should have all 10 tools
        expect(toolCount).toBe(10);
      }
    });
  });

  describe('Extension Rule Verification', () => {
    it('should have TOOL_NAMES constant for type safety', async () => {
      const configContent = await fs.readFile(configPath, 'utf-8');

      // Should export TOOL_NAMES constant
      expect(configContent).toContain('export const TOOL_NAMES = {');
      expect(configContent).toContain('LIST_PROJECTS:');
      expect(configContent).toContain('GET_PROJECT_INFO:');
      expect(configContent).toContain('LIST_CRS:');
    });

    it('should have TOOL_CATEGORIES for organization', async () => {
      const configContent = await fs.readFile(configPath, 'utf-8');

      // Should export TOOL_CATEGORIES
      expect(configContent).toContain('export const TOOL_CATEGORIES = {');
      expect(configContent).toContain('PROJECT:');
      expect(configContent).toContain('CR_SECTION:');
    });
  });
});