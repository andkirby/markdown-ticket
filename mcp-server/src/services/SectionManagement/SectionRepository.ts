/**
 * SectionRepository - Read Operations for CR Sections
 *
 * Phase 2 Extraction: Consolidates read operations from multiple sources
 * - CRFileReader: CR file reading logic
 * - GetOperation: get operation logic
 * - ListOperation: list operation logic
 *
 * Responsibilities:
 * - Read CR file content
 * - Find sections by path
 * - List all sections with hierarchy
 *
 * Anti-duplication:
 * - Imports from MarkdownSectionService for section finding
 * - Imports from CRService for CR metadata
 * - No copying of section parsing logic
 */

import type { Project } from '@mdt/shared/models/Project.js'
import type { MarkdownSectionService, SectionMatch } from '@mdt/shared/services/MarkdownSectionService.js'
import type { CRService } from '../../services/crService.js'
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js'
import { ToolError } from '../../utils/toolError.js'

export interface CRFileContent {
  filePath: string
  title: string
  yamlBody: string
  markdownBody: string
}

/**
 * SectionRepository - Handles read operations for CR sections
 */
export class SectionRepository {
  private fileCache: Map<string, CRFileContent>

  constructor(
    private crService: CRService,
    private markdownSectionService: typeof MarkdownSectionService,
  ) {
    this.fileCache = new Map()
  }

  /**
   * Find a section by simple path in the CR document
   * @param project - Project context
   * @param key - CR key (e.g., MDT-123)
   * @param path - Section path to find
   * @returns Single matching section
   * @throws ToolError if section not found or multiple matches
   */
  async find(project: Project, key: string, path: string): Promise<SectionMatch> {
    const { markdownBody } = await this.readCR(project, key)
    const matches = this.markdownSectionService.findSection(markdownBody, path)
    return this.validateUnique(matches, path, key)
  }

  /**
   * List all sections in the CR document with hierarchy
   * @param project - Project context
   * @param key - CR key (e.g., MDT-123)
   * @returns All sections with hierarchical paths
   */
  async listAll(project: Project, key: string): Promise<SectionMatch[]> {
    const { markdownBody } = await this.readCR(project, key)
    return this.markdownSectionService.findSection(markdownBody, '')
  }

  /**
   * Read CR file content
   * @param project - Project context
   * @param key - CR key (e.g., MDT-123)
   * @returns Object with filePath, title, yamlBody, markdownBody
   * @throws ToolError if ticket not found or file format invalid
   */
  async readCR(project: Project, key: string): Promise<CRFileContent> {
    // Check cache first
    const cacheKey = `${project.project.code || project.id}-${key}`
    const cached = this.fileCache.get(cacheKey)
    if (cached) {
      return cached
    }

    // Get ticket info from CR service
    const ticket = await this.crService.getCR(project, key)
    if (!ticket) {
      throw ToolError.toolExecution(`CR '${key}' not found in project`)
    }

    // Read file content
    const fileContent = await MarkdownService.readFile(ticket.filePath)

    // Extract YAML frontmatter and markdown body
    const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (!frontmatterMatch) {
      throw ToolError.toolExecution(`Invalid CR file format for ${key}: No YAML frontmatter found`)
    }

    const result: CRFileContent = {
      filePath: ticket.filePath,
      title: ticket.title,
      yamlBody: frontmatterMatch[1],
      markdownBody: frontmatterMatch[2],
    }

    // Cache the result
    this.fileCache.set(cacheKey, result)

    return result
  }

  /**
   * Validate that section resolution is unique
   * @param matches - Array of matching sections
   * @param path - Original section path for error messages
   * @param key - CR key for error messages (optional)
   * @returns Single matching section
   * @throws ToolError if 0 matches or 2+ matches
   */
  private validateUnique(matches: SectionMatch[], path: string, key?: string): SectionMatch {
    if (matches.length === 0) {
      const keyMsg = key ? ` in CR ${key}` : ''
      throw ToolError.toolExecution(`Section '${path}' not found${keyMsg}.`)
    }

    if (matches.length > 1) {
      const paths = matches.map(m => m.hierarchicalPath).join('\n  - ')
      throw ToolError.toolExecution(
        `Multiple sections match '${path}'. Please use hierarchical path:\n  - ${paths}`,
      )
    }

    return matches[0]
  }

  /**
   * Clear the file cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.fileCache.clear()
  }
}
