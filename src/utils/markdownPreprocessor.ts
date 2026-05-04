interface PreprocessorState {
  linkPlaceholders: string[]
  codeBlockPlaceholders: string[]
  inlineCodePlaceholders: string[]
}

/**
 * Safely replaces all occurrences of a placeholder with its content
 */
function safeReplace(text: string, placeholder: string, replacement: string): string {
  return text.split(placeholder).join(replacement)
}

/**
 * Protects code blocks from link processing by replacing them with placeholders
 * Uses line-by-line parsing for reliable detection
 */
function protectCodeBlocks(markdown: string, state: PreprocessorState): string {
  const lines = markdown.split('\n')
  let inCodeBlock = false
  let codeBlockStart = -1
  const codeBlocks: string[] = []
  let processed = markdown

  // Find all code blocks using line-by-line parsing
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeBlockStart = i
      }
      else {
        inCodeBlock = false
        const codeBlock = lines.slice(codeBlockStart, i + 1).join('\n')
        codeBlocks.push(codeBlock)
      }
    }
  }

  // Replace each code block with a placeholder
  codeBlocks.forEach((block) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${state.codeBlockPlaceholders.length}__`
    state.codeBlockPlaceholders.push(block)
    processed = safeReplace(processed, block, placeholder)
  })

  return processed
}

/**
 * Protects inline code from link processing
 */
function protectInlineCode(markdown: string, state: PreprocessorState): string {
  return markdown.replace(/`[^`\n]+`/g, (match) => {
    const placeholder = `__INLINE_CODE_PLACEHOLDER_${state.inlineCodePlaceholders.length}__`
    state.inlineCodePlaceholders.push(match)
    return placeholder
  })
}

/**
 * Normalizes two-space nested list indentation to four spaces so Showdown
 * preserves nested list structure in rendered HTML.
 */
function normalizeNestedListIndentation(markdown: string): string {
  return markdown
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s+)([*+-]|\d+\.)\s+/)
      if (!match) {
        return line
      }

      const indentation = match[1]
      if (indentation.length < 2 || indentation.length % 4 !== 2) {
        return line
      }

      return `${' '.repeat(indentation.length + 2)}${line.slice(indentation.length)}`
    })
    .join('\n')
}

/**
 * Protects existing Markdown links from processing.
 * MDT-150: Resolves relative .md hrefs in existing links to absolute URLs
 * before protecting them.
 */
function protectExistingLinks(markdown: string, state: PreprocessorState, sourcePath?: string, ticketKey?: string, projectCode?: string, ticketsPath?: string): string {
  return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
    // MDT-150: Resolve relative .md hrefs in existing links
    let resolvedHref = href
    if (sourcePath && ticketKey && projectCode && /\.md(#|$)/.test(href)) {
      resolvedHref = resolveDocumentRef(href, sourcePath, ticketKey, projectCode, ticketsPath)
    }
    const resolvedMatch = resolvedHref !== href ? `[${text}](${resolvedHref})` : match
    const placeholder = `__LINK_PLACEHOLDER_${state.linkPlaceholders.length}__`
    state.linkPlaceholders.push(resolvedMatch)
    return placeholder
  })
}

/**
 * Converts ticket references to markdown links with absolute URLs
 */
function convertTicketReferences(markdown: string, currentProject: string): string {
  const projectPattern = new RegExp(`\\b(${currentProject}-\\d+)\\b`, 'g')
  // Use absolute URLs to prevent Showdown.js from resolving relative to current page
  // Ensure the URLs are explicitly absolute to avoid any relative resolution issues
  return markdown.replace(projectPattern, `[$1](/prj/${currentProject}/ticket/$1)`)
}

/**
 * Resolve a path relative to a source directory.
 * Handles .., ./, and bare filenames correctly.
 */
function resolveRelativePath(sourceDir: string, relativePath: string): string {
  const sourceParts = sourceDir.replace(/\/$/, '').split('/')
  const relParts = relativePath.split('/')
  const result = [...sourceParts]
  for (const part of relParts) {
    if (part === '..') {
      result.pop()
    }
    else if (part !== '.') {
      result.push(part)
    }
  }
  return result.join('/')
}

/**
 * MDT-150: Resolve a document .md reference to an absolute URL.
 *
 * Uses sourcePath (relative to ticketsPath, e.g. "MDT-150/requirements.md")
 * for .. resolution, then classifies the result against ticketsPath.
 *
 * Returns the original href unchanged if it can't be resolved.
 */
function resolveDocumentRef(
  href: string,
  sourcePath: string | undefined,
  ticketKey: string | undefined,
  projectCode: string,
  ticketsPath: string | undefined,
): string {
  if (!sourcePath || !ticketKey) {
    return href // Can't resolve without context
  }

  // Extract anchor
  let anchor = ''
  let pathPart = href
  const anchorIdx = href.indexOf('#')
  if (anchorIdx >= 0) {
    anchor = href.slice(anchorIdx)
    pathPart = href.slice(0, anchorIdx)
  }

  // 1. Ticket key pattern (bare: MDT-151, with .md: MDT-151.md, with suffix: MDT-150-smartlink-doc-urls.md)
  const ticketKeyMatch = pathPart.match(/^([A-Z]+-\d+)(?:-[^/]*?)?\.md$/)
  if (ticketKeyMatch) {
    return `/prj/${projectCode}/ticket/${ticketKeyMatch[1]}${anchor}`
  }

  // 2. Bare filename (no /, no ..) → ticket subdoc URL
  if (!pathPart.includes('/') && !pathPart.includes('..')) {
    return `/prj/${projectCode}/ticket/${ticketKey}/${pathPart}${anchor}`
  }

  // 3. Relative path (contains .. or /)
  // sourcePath is relative to ticketsPath (e.g., "MDT-150/requirements.md")
  // Use it directly for .. resolution so paths stay relative to ticketsPath
  const sourceDir = sourcePath.includes('/') ? sourcePath.substring(0, sourcePath.lastIndexOf('/')) : ''
  let resolvedPath = resolveRelativePath(sourceDir, pathPart)

  // Strip leading / from resolved path
  if (resolvedPath.startsWith('/')) {
    resolvedPath = resolvedPath.slice(1)
  }

  // Check if resolved path is a ticket-key .md file at the tickets level
  // e.g., "MDT-150-smartlink-doc-urls.md" or "MDT-151.md"
  const resolvedTicketMatch = resolvedPath.match(/^([A-Z]+-\d+)[^/]*\.md$/)
  if (resolvedTicketMatch) {
    return `/prj/${projectCode}/ticket/${resolvedTicketMatch[1]}${anchor}`
  }

  // Check if resolved path is inside the current ticket subdoc directory
  // e.g., "MDT-150/architecture.md" or "MDT-150/MDT-150/architecture.md" (duplicate from ./)
  const subdocPrefix = `${ticketKey}/`
  if (resolvedPath.startsWith(subdocPrefix)) {
    let subPath = resolvedPath.slice(subdocPrefix.length)
    // Normalize: strip duplicate ticket key prefix (e.g., ./MDT-150/architecture.md inside MDT-150/)
    if (subPath.startsWith(subdocPrefix)) {
      subPath = subPath.slice(subdocPrefix.length)
    }
    return `/prj/${projectCode}/ticket/${ticketKey}/${subPath}${anchor}`
  }

  // Path escapes the tickets directory → documents view
  // Prepend the appropriate prefix based on ticketsPath
  const tp = ticketsPath || 'docs/CRs'
  // Figure out how many ../ segments there are to determine the correct prefix
  // For a path like "README.md" (went above ticketsPath root), prepend docs/
  // For a path like "docs/README.md" (already has a prefix), use as-is
  const docsPrefix = tp.split('/').slice(0, -1).join('/') // e.g., "docs" from "docs/CRs"
  const fullPath = docsPrefix ? `${docsPrefix}/${resolvedPath}` : resolvedPath
  return `/prj/${projectCode}/documents?file=${encodeURIComponent(fullPath)}${anchor}`
}

/**
 * Converts document references to markdown links.
 * MDT-150: When sourcePath is available, resolves .md refs to absolute URLs
 * using resolveDocumentRef(). When no sourcePath, falls back to simple wrapping.
 */
function convertDocumentReferences(
  markdown: string,
  sourcePath?: string,
  ticketKey?: string,
  projectCode?: string,
  ticketsPath?: string,
): string {
  return markdown.replace(/(\S+\.md(?:#\S+)?)/g, (match, filename) => {
    // Match .md references that may have path prefixes like ../ ./. etc.
    // If we have sourcePath context, resolve to absolute URLs
    if (sourcePath && ticketKey && projectCode) {
      const resolved = resolveDocumentRef(filename, sourcePath, ticketKey, projectCode, ticketsPath)
      if (resolved !== filename) {
        // Successfully resolved — produce markdown link with absolute URL
        return `[${filename}](${resolved})`
      }
    }

    // Fallback: simple wrapping (bare filename → relative link)
    // Skip filenames that start with a ticket key pattern (handled by convertTicketReferences)
    const ticketKeyPattern = /^[A-Z]+-\d.*\.md$/
    if (ticketKeyPattern.test(filename)) {
      return match
    }
    return `[${filename}](${filename})`
  })
}

/**
 * Restores all protected content in the correct order
 */
function restoreProtectedContent(markdown: string, state: PreprocessorState): string {
  let processed = markdown

  // Restore in reverse order: code blocks first (largest), then inline code, then links
  state.codeBlockPlaceholders.forEach((code, index) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${index}__`
    processed = safeReplace(processed, placeholder, code)
  })

  state.inlineCodePlaceholders.forEach((code, index) => {
    const placeholder = `__INLINE_CODE_PLACEHOLDER_${index}__`
    processed = safeReplace(processed, placeholder, code)
  })

  state.linkPlaceholders.forEach((link, index) => {
    const placeholder = `__LINK_PLACEHOLDER_${index}__`
    processed = safeReplace(processed, placeholder, link)
  })

  // Safety check: clean up any remaining placeholders
  const remainingPlaceholders = processed.match(/__[A-Z_]+_PLACEHOLDER_\d+__/g)
  if (remainingPlaceholders) {
    console.warn('Cleaning up unrestored placeholders:', remainingPlaceholders)
    remainingPlaceholders.forEach((placeholder) => {
      processed = safeReplace(processed, placeholder, '')
    })
  }

  return processed
}

/**
 * Main preprocessing function that safely processes markdown for link conversion
 */
export function preprocessMarkdown(
  markdown: string,
  currentProject: string,
  linkConfig: {
    enableAutoLinking: boolean
    enableTicketLinks: boolean
    enableDocumentLinks: boolean
  },
  sourcePath?: string,
  ticketsPath?: string,
): string {
  if (!linkConfig.enableAutoLinking) {
    return markdown
  }

  const state: PreprocessorState = {
    linkPlaceholders: [],
    codeBlockPlaceholders: [],
    inlineCodePlaceholders: [],
  }

  let processed = markdown

  try {
    // Extract ticketKey from sourcePath for resolution
    const extractedTicketKey = sourcePath?.match(/^([A-Z]+-\d+)/)?.[1]

    // Construct full source path relative to project root
    // sourcePath is relative to ticketsPath (e.g., "MDT-150/requirements.md")
    // resolveDocumentRef uses sourcePath (relative) for .. resolution
    const tp = ticketsPath || 'docs/CRs'

    // Step 1: Protect existing content
    processed = protectExistingLinks(processed, state, sourcePath, extractedTicketKey, currentProject, tp)
    processed = protectCodeBlocks(processed, state)
    processed = protectInlineCode(processed, state)
    processed = normalizeNestedListIndentation(processed)

    // Step 1.5: Protect ALL ticket-key .md filenames from partial ticket conversion
    // Must happen BEFORE convertTicketReferences to prevent corruption
    // Protects both bare ticket-key.md (MDT-151.md) and prefixed ones (MDT-150-smartlink-doc-urls.md)
    const ticketFilenamePlaceholders: string[] = []
    processed = processed.replace(/\b([A-Z]+-\d\S*\.md(?:#\S+)?)\b/g, (match) => {
      const placeholder = `__TICKET_FILENAME_PLACEHOLDER_${ticketFilenamePlaceholders.length}__`
      ticketFilenamePlaceholders.push(match)
      return placeholder
    })

    // Step 2: Convert references to links
    if (linkConfig.enableTicketLinks) {
      processed = convertTicketReferences(processed, currentProject)
    }

    if (linkConfig.enableDocumentLinks) {
      processed = convertDocumentReferences(processed, sourcePath, extractedTicketKey, currentProject, tp)
    }

    // Step 2.5: Restore ticket-key filenames with resolved absolute URLs
    // These are resolved using sourcePath context if available
    ticketFilenamePlaceholders.forEach((filename, index) => {
      const placeholder = `__TICKET_FILENAME_PLACEHOLDER_${index}__`
      if (sourcePath && extractedTicketKey && currentProject) {
        const resolved = resolveDocumentRef(filename, sourcePath, extractedTicketKey, currentProject, tp)
        processed = safeReplace(processed, placeholder, `[${filename}](${resolved})`)
      }
      else {
        processed = safeReplace(processed, placeholder, filename)
      }
    })

    // Step 3: Restore protected content
    processed = restoreProtectedContent(processed, state)

    return processed
  }
  catch (error) {
    console.error('Markdown preprocessing error:', error)
    // Fallback: try to restore what we can
    return restoreProtectedContent(processed, state)
  }
}

/**
 * Test function to validate the preprocessor works correctly
 */
function _testPreprocessor(): boolean {
  const testMarkdown = `# Test Document

Here's a mermaid diagram:

\`\`\`mermaid
graph TB
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

And some inline code: \`const x = 1\`

Also a ticket reference: MDT-001

And an existing link: [GitHub](https://github.com)

Document reference: README.md
`

  const config = {
    enableAutoLinking: true,
    enableTicketLinks: true,
    enableDocumentLinks: true,
  }

  const result = preprocessMarkdown(testMarkdown, 'MDT', config)

  // Verify mermaid block is preserved
  const hasMermaidBlock = result.includes('```mermaid\ngraph TB\n    A[Start] --> B[Process]\n    B --> C[End]\n```')

  // Verify inline code is preserved
  const hasInlineCode = result.includes('`const x = 1`')

  // Verify ticket was converted
  const hasTicketLink = result.includes('[MDT-001](MDT-001)')

  // Verify existing link is preserved
  const hasExistingLink = result.includes('[GitHub](https://github.com)')

  // Verify no placeholders remain
  const hasNoPlaceholders = !result.match(/__[A-Z_]+_PLACEHOLDER_\d+__/)

  const success = hasMermaidBlock && hasInlineCode && hasTicketLink && hasExistingLink && hasNoPlaceholders

  if (!success) {
    console.error('Preprocessor test failed:', {
      hasMermaidBlock,
      hasInlineCode,
      hasTicketLink,
      hasExistingLink,
      hasNoPlaceholders,
      result,
    })
  }

  return success
}
