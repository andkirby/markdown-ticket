/**
 * SectionPresenter - Output Formatting for Section Management
 * Phase 5: Extracted from ValidationFormatter - handles VIEW layer only
 */

import type { SectionMatch } from './types.js'
import { Sanitizer } from '../../utils/sanitizer.js'

/** Build section item with indent and preview */
function buildSectionItem(section: SectionMatch): string {
  const indent = '  '.repeat(Math.max(0, section.headerLevel - 1))
  const preview = section.content.trim() ? ` (${section.content.length} chars)` : ' (empty)'
  return `${indent}- ${Sanitizer.sanitizeText(section.headerText)}${preview}`
}

/** Usage instructions for section operations */
const USAGE_INSTRUCTIONS = [
  '\n**Usage:**',
  'To read or update a section, you can use flexible formats:',
  '- User-friendly: `section: "1. Description"` or `section: "Description"`',
  '- Exact format: `section: "## 1. Description"`',
  '',
  '**Examples:**',
  '- `section: "1. Feature Description"` - matches "## 1. Feature Description"',
  '- `section: "Feature Description"` - matches "## 1. Feature Description"',
  '- `section: "### Key Features"` - exact match for subsection',
].join('\n')

/** Operation result messages */
const OP_MESSAGES: Record<string, string> = {
  replace: 'The section content has been completely replaced.',
  append: 'Content has been added to the end of the section.',
  prepend: 'Content has been added to the beginning of the section.',
}

/** Presenter class for formatting section management output (static methods) */
export class SectionPresenter {
  /** Format section list output - hierarchical tree view of all sections */
  static formatList(key: string, title: string, sections: SectionMatch[]): string {
    if (sections.length === 0) {
      return Sanitizer.sanitizeText(
        `📑 **Sections in CR ${key}**\n\n`
        + `- Title: ${Sanitizer.sanitizeText(title)}\n\n`
        + `*(No sections found - document may be empty or improperly formatted)*`,
      )
    }

    return Sanitizer.sanitizeText([
      `📑 **Sections in CR ${key}** - ${Sanitizer.sanitizeText(title)}\n\n`
      + `Found ${sections.length} section${sections.length === 1 ? '' : 's'}:\n`,
      ...sections.map(buildSectionItem),
      USAGE_INSTRUCTIONS,
    ].join('\n'))
  }

  /** Format section content output with metadata */
  static formatGet(key: string, section: SectionMatch, content: string): string {
    return Sanitizer.sanitizeText(
      `📖 **Section Content from CR ${key}**\n\n`
      + `**Section:** ${Sanitizer.sanitizeText(section.hierarchicalPath)}\n`
      + `**Content Length:** ${section.content.length} characters\n\n`
      + `---\n\n${content}\n\n---\n\n`
      + `Use \`manage_cr_sections\` with operation="replace", "append", or "prepend" to modify this section.`,
    )
  }

  /** Format section modification success message */
  static formatModify(
    key: string,
    section: string,
    operation: string,
    contentLength: number,
    title: string,
    filePath: string,
    timestamp: string,
    contentModified: boolean,
    warningCount: number,
  ): string {
    const lines = [
      `✅ **Updated Section in CR ${key}**\n\n`
      + `**Section:** ${Sanitizer.sanitizeText(section)}\n`
      + `**Operation:** ${operation}\n`
      + `**Content Length:** ${contentLength} characters\n\n`
      + `- Title: ${Sanitizer.sanitizeText(title)}\n`
      + `- Updated: ${timestamp}\n`
      + `- File: ${filePath}`,
    ]

    if (contentModified) {
      lines.push(
        `\n**Content Processing:**\n${
          warningCount > 0
            ? `- Applied content sanitization and formatting\n- ${warningCount} warning(s) logged to console`
            : '- Content processed successfully'}`,
      )
    }

    if (OP_MESSAGES[operation])
      lines.push(`\n${OP_MESSAGES[operation]}`)

    return Sanitizer.sanitizeText(lines.join('\n'))
  }

  /** Format section not found error */
  static formatSectionNotFoundError(section: string, key?: string): string {
    return `Section '${section}' not found${key ? ` in CR ${key}` : ''}.`
  }

  /** Format multiple matches error with suggestions */
  static formatMultipleMatchesError(section: string, matches: SectionMatch[]): string {
    const paths = matches.map(m => m.hierarchicalPath).join('\n  - ')
    return `Multiple sections match '${section}'. Please use hierarchical path:\n  - ${paths}`
  }

  /** Format section validation error with suggestions */
  static formatValidationError(
    section: string,
    errors: string[],
    suggestions: string[],
    key: string,
  ): string {
    const parts = [
      `❌ **Section validation failed**\n\n**Errors:**\n${errors.map(e => `- ${e}`).join('\n')}\n`,
    ]

    if (suggestions.length > 0) {
      parts.push(`**Suggestions:**\n${suggestions.map(s => `- ${s}`).join('\n')}\n`)
    }

    parts.push(`Use \`manage_cr_sections\` with operation="list" to see all available sections in CR ${key}.`)

    return parts.join('\n')
  }

  /** Format generic error with context */
  static formatError(error: Error | string, context?: string): string {
    const errorMessage = error instanceof Error ? error.message : error
    const sanitizedMessage = Sanitizer.sanitizeError(errorMessage)
    return context ? `${context}: ${sanitizedMessage}` : sanitizedMessage
  }
}
