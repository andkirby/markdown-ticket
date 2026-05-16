import { slugify } from './slugify'

export interface TocItem {
  id: string
  text: string
  level: number
}

/**
 * Strip inline markdown syntax from heading text.
 * Removes bold, italic, code, and link markup to produce plain text.
 */
function stripInlineMarkdown(text: string): string {
  return text
    // Links: [text](url) → text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Bold: **text** or __text__ → text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    // Italic: *text* or _text_ → text
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Inline code: `text` → text
    .replace(/`(.+?)`/g, '$1')
    .trim()
}

/**
 * Remove fenced code blocks from markdown content so heading extraction
 * does not pick up # comments inside code blocks.
 * Handles both backtick (```) and tilde (~~~) fences with optional info strings.
 */
function stripFencedCodeBlocks(content: string): string {
  return content.replace(/(^|\n)(:{0,3})(```|~~~)([^`\n]*\n[\s\S]*?\n\2\3)[ \t]*/g, '')
}

/**
 * Extract table of contents from raw markdown content.
 * Parses headings directly from markdown text via regex — no rendering dependency.
 * Uses shared slugify() for ID generation to match markdown-it-anchor output.
 */
export function extractTableOfContents(content: string, headerLevelStart: number = 1): TocItem[] {
  // Strip fenced code blocks before extracting headings to avoid
  // picking up # comments in bash/python/yaml etc.
  const contentWithoutCode = stripFencedCodeBlocks(content)

  const toc: TocItem[] = []
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  let match

  while ((match = headingRegex.exec(contentWithoutCode)) !== null) {
    const level = match[1].length
    const rawText = match[2].trim()

    // Strip inline markdown from heading text
    const text = stripInlineMarkdown(rawText)

    // Generate slug ID using shared slugify
    const id = slugify(text)

    // Apply headerLevelStart offset: level becomes level + headerLevelStart - 1
    const adjustedLevel = Math.min(level + headerLevelStart - 1, 6)

    toc.push({ id, text, level: adjustedLevel })
  }

  return toc
}
