/**
 * ValidationFormatter utility for consistent error message formatting
 * Consolidates scattered error message generation from sectionHandlers.ts
 */

import {SectionMatch} from '@mdt/shared/services/MarkdownSectionService.js';
import {Sanitizer} from '../sanitizer.js';

export class ValidationFormatter {
    static formatSectionList(key: string, title: string, sections: SectionMatch[]): string {
        if (sections.length === 0) {
            return Sanitizer.sanitizeText(`📑 **Sections in CR ${key}**\n\n- Title: ${Sanitizer.sanitizeText(title)}\n\n*(No sections found - document may be empty or improperly formatted)*`);
        }

        const lines = [`📑 **Sections in CR ${key}** - ${Sanitizer.sanitizeText(title)}\n\nFound ${sections.length} section${sections.length === 1 ? '' : 's'}:\n`];
        for (const section of sections) {
            const indent = '  '.repeat(Math.max(0, section.headerLevel - 1));
            const preview = section.content.trim() ? ` (${section.content.length} chars)` : ' (empty)';
            lines.push(`${indent}- ${Sanitizer.sanitizeText(section.headerText)}${preview}`);
        }
        lines.push('\n**Usage:**\nTo read or update a section, you can use flexible formats:\n- User-friendly: `section: "1. Description"` or `section: "Description"`\n- Exact format: `section: "## 1. Description"`\n\n**Examples:**\n- `section: "1. Feature Description"` - matches "## 1. Feature Description"\n- `section: "Feature Description"` - matches "## 1. Feature Description"\n- `section: "### Key Features"` - exact match for subsection');
        return Sanitizer.sanitizeText(lines.join('\n'));
    }

    static formatSectionNotFoundError(section: string, key: string, available?: string[]): string {
        const keyMsg = key ? ` in CR ${key}` : '';
        return `Section '${section}' not found${keyMsg}.`;
    }

    static formatMultipleMatchesError(section: string, matches: SectionMatch[]): string {
        const paths = matches.map(m => m.hierarchicalPath).join('\n  - ');
        return `Multiple sections match '${section}'. Please use hierarchical path:\n  - ${paths}`;
    }

    static formatSectionValidationError(section: string, errors: string[], suggestions: string[], key: string): string {
        const msg = [`❌ **Section validation failed**\n\n**Errors:**\n${errors.map(e => `- ${e}`).join('\n')}\n`];
        if (suggestions.length > 0) msg.push(`**Suggestions:**\n${suggestions.map(s => `- ${s}`).join('\n')}\n`);
        msg.push(`Use \`manage_cr_sections\` with operation="list" to see all available sections in CR ${key}.`);
        return msg.join('\n');
    }

    static formatGetSectionOutput(key: string, matchedSection: SectionMatch, content: string): string {
        return Sanitizer.sanitizeText(`📖 **Section Content from CR ${key}**\n\n**Section:** ${Sanitizer.sanitizeText(matchedSection.hierarchicalPath)}\n**Content Length:** ${matchedSection.content.length} characters\n\n---\n\n${content}\n\n---\n\nUse \`manage_cr_sections\` with operation="replace", "append", or "prepend" to modify this section.`);
    }

    static formatModifyOutput(key: string, section: string, operation: string, contentLength: number,
                              title: string, filePath: string, timestamp: string,
                              contentModified: boolean, warningCount: number): string {
        const lines = [
`✅ **Updated Section in CR ${key}**

**Section:** ${Sanitizer.sanitizeText(section)}
**Operation:** ${operation}
**Content Length:** ${contentLength} characters

- Title: ${Sanitizer.sanitizeText(title)}
- Updated: ${timestamp}
- File: ${filePath}`];
        if (contentModified) {
            lines.push(`\n**Content Processing:**\n${warningCount > 0 ? '- Applied content sanitization and formatting\n- ' + warningCount + ' warning(s) logged to console' : '- Content processed successfully'}`);
        }
        if (operation === 'replace') {
            lines.push('\nThe section content has been completely replaced.');
        } else if (operation === 'append') {
            lines.push('\nContent has been added to the end of the section.');
        } else if (operation === 'prepend') {
            lines.push('\nContent has been added to the beginning of the section.');
        }
        return Sanitizer.sanitizeText(lines.join('\n'));
    }
}
