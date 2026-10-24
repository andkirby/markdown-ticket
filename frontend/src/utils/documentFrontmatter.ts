/**
 * Leading YAML frontmatter extraction for arbitrary markdown documents
 * (docs/, ideas/, …). Shared by the documents viewer and the ticket side
 * pane — without it the closing `---` renders the whole block as a setext
 * heading. Ticket markdown is handled upstream by the ticket pipeline.
 */

export interface ParsedDocumentContent {
  frontmatter: string | null
  body: string
}

export function extractDocumentFrontmatter(value: string): ParsedDocumentContent {
  if (!value.startsWith('---\n') && !value.startsWith('---\r\n')) {
    return { frontmatter: null, body: value }
  }

  const marker = value.startsWith('---\r\n') ? '---\r\n' : '---\n'
  let searchIndex = marker.length

  while (searchIndex < value.length) {
    const nextLineIndex = value.indexOf('\n', searchIndex)
    const lineEnd = nextLineIndex === -1 ? value.length : nextLineIndex + 1
    const line = value.slice(searchIndex, lineEnd).replace(/\r?\n$/, '')

    if (line === '---') {
      const frontmatter = value.slice(marker.length, searchIndex).replace(/\r?\n$/, '')
      return {
        frontmatter: frontmatter.trim() ? frontmatter : null,
        body: value.slice(lineEnd),
      }
    }

    if (nextLineIndex === -1)
      break

    searchIndex = lineEnd
  }

  return { frontmatter: null, body: value }
}
