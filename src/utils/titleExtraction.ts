/**
 * Title extraction utilities for MDT-064
 * H1 as Single Source of Truth for ticket titles
 */

/**
 * Extract title from H1 header with fallback to filename
 * Uses strict pattern matching: only lines starting with "# " (exact)
 *
 * @param content Markdown content
 * @param filePath Optional file path for fallback extraction
 * @returns Extracted title or null if no H1 found
 */
function _extractTitleFromH1(content: string, filePath?: string): string | null {
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ')) {
      return trimmed.slice(2).trim()
    }
  }

  // Fallback to filename extraction if provided
  if (filePath) {
    return _extractTitleFromFilename(filePath)
  }

  return null
}

/**
 * Extract title from filename when no H1 is present
 * Pattern: DEB-031-testing-ticket.md -> "testing-ticket"
 *
 * @param filePath File path
 * @returns Extracted filename-based title
 */
function _extractTitleFromFilename(filePath: string): string {
  const filename = filePath.split('/').pop()?.replace(/\.md$/, '') || ''

  // Look for pattern: CODE-NUMBER-title
  const match = filename.match(/^[A-Z]+-\d+-(.+)$/i)
  if (match) {
    return match[1].replace(/-/g, ' ').trim()
  }

  // Fallback: use entire filename (without extension)
  return filename.replace(/-/g, ' ').trim()
}

/**
 * Process content to remove additional H1 headers (keep only first)
 * This ensures content consistency when displaying in UI
 *
 * @param content Markdown content
 * @returns Processed content with only first H1 preserved
 */
export function processContentForDisplay(content: string): string {
  const lines = content.split('\n')
  let firstH1Found = false
  const processedLines: string[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('# ')) {
      if (!firstH1Found) {
        // Skip the first H1 entirely (it's used as title)
        firstH1Found = true
      }
      else {
        // Convert additional H1s to H2s for preservation
        const title = trimmedLine.slice(2).trim()
        processedLines.push(`## ${title}`)
      }
    }
    else {
      processedLines.push(line)
    }
  }

  return processedLines.join('\n')
}

/**
 * Remove leading H1 from content to avoid duplication
 * Used when user provides content that already includes H1 header
 *
 * @param content User-provided content
 * @returns Content without leading H1
 */
function _stripLeadingH1(content: string): string {
  const lines = content.split('\n')

  // Check if first non-empty line is H1
  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim()
    if (trimmedLine === '')
      continue // Skip empty lines

    if (trimmedLine.startsWith('# ')) {
      // Remove this H1 line and any following empty lines
      const remainingLines = lines.slice(i + 1)
      // Remove leading empty lines after H1
      let startIndex = 0
      while (startIndex < remainingLines.length && remainingLines[startIndex].trim() === '') {
        startIndex++
      }
      return remainingLines.slice(startIndex).join('\n').trim()
    }
    break // First non-empty line is not H1, keep all content
  }

  return content
}

/**
 * Add H1 header to content if it doesn't already have one
 * Used for ensuring content has proper title structure
 *
 * @param content Markdown content
 * @param title Title to use for H1
 * @returns Content with H1 header
 */
function _ensureH1Header(content: string, title: string): string {
  const hasH1 = content.split('\n').some((line) => {
    const trimmedLine = line.trim()
    return trimmedLine.startsWith('# ')
  })

  if (hasH1) {
    return content
  }

  return `# ${title}\n\n${content}`
}

/**
 * Check if content has a valid H1 header
 *
 * @param content Markdown content
 * @returns True if content has H1 header
 */
function _hasH1Header(content: string): boolean {
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine === '')
      continue
    return trimmedLine.startsWith('# ')
  }

  return false
}
