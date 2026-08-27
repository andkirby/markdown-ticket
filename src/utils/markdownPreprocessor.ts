import { buildDocumentPathWithAnchor, buildTicketPath, buildTicketSubDocPath } from '../routes'

interface PreprocessorState {
  linkPlaceholders: string[]
  codeBlockPlaceholders: string[]
  inlineCodePlaceholders: string[]
}

const DOCUMENT_REFERENCE_PATTERN = /(^|[\s([{<])((?:[\w.-]+\/)*\w[\w.-]*\.md(?:#[A-Za-z0-9][\w.~:/?#[\]@!$&'()*+,;=%-]*)?)(?=$|[\s)\]},>.;:!?'’"])/g

function isRelativeMarkdownHref(href: string): boolean {
  if (!/\.md(?:#[^\s)]*)?$/.test(href)) {
    return false
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//') || href.startsWith('/')) {
    return false
  }

  DOCUMENT_REFERENCE_PATTERN.lastIndex = 0
  const isMatch = DOCUMENT_REFERENCE_PATTERN.test(` ${href}`)
  DOCUMENT_REFERENCE_PATTERN.lastIndex = 0
  return isMatch
}

/** Escapes text for safe embedding inside raw-HTML emissions. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
 * Resolution context for MDT-237 inline-code document-reference conversion.
 * When absent (or document links disabled), inline code is protected verbatim —
 * byte-identical to pre-MDT-237 behavior.
 */
interface InlineCodeContext {
  sourcePath?: string
  ticketKey?: string
  projectCode?: string
  ticketsPath?: string
  enableDocumentLinks: boolean
  /**
   * MDT-237 follow-up: existence oracle over project-relative file paths.
   * Returns true/false when the project file index is loaded, null when
   * unknown (drives the relative -> project-root fallback chain).
   */
  fileExists?: (projectRelPath: string) => boolean | null
  /** Returns the unique project file path for a basename, or null when absent/ambiguous. */
  findUniqueByBasename?: (basename: string) => string | null
}

/**
 * MDT-237: whole-span document-reference shape. The span content must be
 * ONLY a relative .md path (optionally with #anchor) — anchored match, so a
 * command like `git mv old.md new.md` never qualifies (C1, Edge-1).
 *
 * C4: spaces and percent-encoded characters are allowed in path segments,
 * but a span containing a space must also contain a "/" — bare multi-word
 * spans (commands like `git mv old.md new.md`) stay verbatim.
 */
const WHOLE_SPAN_DOCUMENT_REFERENCE
  = /^[.\w%-]+(?:\/[. \w%-]+)*\.(?:md|html)(?:#[A-Za-z0-9][\w.~:/?#[\]@!$&'()*+,;=%-]*)?$/

function isWholeSpanDocumentReference(content: string): boolean {
  if (!WHOLE_SPAN_DOCUMENT_REFERENCE.test(content)) {
    return false
  }
  if (content.includes(' ') && !content.includes('/')) {
    return false
  }
  // .html documents render in the viewer too; the anchored regex already
  // rejects schemes, leading '/', and multi-word command spans.
  if (content.endsWith('.html')) {
    return true
  }
  // Percent-encoded spans decode to their real path before resolution (C4)
  if (content.includes('%')) {
    return true
  }
  return isRelativeMarkdownHref(content)
}

/** Best-effort percent-decoding that never throws and never double-decodes. */
function tryDecodeContent(content: string): string {
  if (!content.includes('%')) {
    return content
  }
  try {
    const decoded = decodeURIComponent(content)
    return decoded
  }
  catch {
    return content
  }
}

/**
 * MDT-237 follow-up: existence-aware resolution for inline-code references.
 *
 * The document index covers the project's configured document paths but, by
 * design, NOT the tickets area — so a ticket-relative interpretation cannot
 * be verified and stays pure path math (resolvedRelative). What IS knowable
 * is the project-root interpretation. Chain:
 *
 * 1. Project-root interpretation (e.g. `src/THEME.md` from a ticket body):
 *    when the referenced project file provably exists, resolve to the
 *    documents route — the correct destination (D8).
 * 2. Otherwise keep the relative resolution (existing behavior). References
 *    that escape the tickets area already land on the documents route, where
 *    SmartLink flags known-missing targets as broken (BR-2.1).
 *
 * `..`-prefixed refs are explicitly relative intents and never re-anchored.
 */
function resolveWithFallback(
  content: string,
  resolvedRelative: string,
  ctx: InlineCodeContext & { sourcePath: string, projectCode: string },
): string {
  const oracle = ctx.fileExists
  if (!oracle) {
    return resolvedRelative
  }

  const decoded = tryDecodeContent(content)
  const anchorIdx = decoded.indexOf('#')
  const pathPart = anchorIdx >= 0 ? decoded.slice(0, anchorIdx) : decoded
  const anchor = anchorIdx >= 0 ? decoded.slice(anchorIdx) : ''

  if (!pathPart || pathPart.includes('..')) {
    return resolvedRelative
  }

  if (oracle(pathPart) === true) {
    return buildDocumentPathWithAnchor(ctx.projectCode, pathPart, anchor)
  }

  // Unique-basename disambiguation (D10): a bare filename that exists nowhere
  // relative to the source (e.g. THEME.md in a ticket body) resolves to the
  // only project file with that basename (src/THEME.md). Ambiguous names and
  // unknown index keep the relative resolution. Zero extra fetches: the
  // basename map is built once per document-index load.
  const findUnique = ctx.findUniqueByBasename
  if (findUnique && !pathPart.includes('/')) {
    const uniqueMatch = findUnique(pathPart.slice(pathPart.lastIndexOf('/') + 1))
    if (uniqueMatch) {
      return buildDocumentPathWithAnchor(ctx.projectCode, uniqueMatch, anchor)
    }
  }
  return resolvedRelative
}

/**
 * Protects inline code from link processing.
 *
 * MDT-237: an inline-code span whose entire content is a relative .md
 * document reference (optional #anchor) is a navigable document reference,
 * not genuine code. Qualifying spans are resolved via resolveDocumentRef and
 * stored as markdown links in the LINK placeholder set — which restores last,
 * after ticket-key conversion, so the emitted link is never re-linkified
 * (nested-link guard, same mechanism as protectExistingLinks).
 */
function protectInlineCode(markdown: string, state: PreprocessorState, ctx?: InlineCodeContext): string {
  return markdown.replace(/`[^`\n]+`/g, (match) => {
    const content = match.slice(1, -1)
    if (
      ctx
      && ctx.enableDocumentLinks
      && ctx.sourcePath
      && ctx.projectCode
      && isWholeSpanDocumentReference(content)
    ) {
      // C4: resolve the decoded path; URLs encode it back via the query scheme
      const baseCtx = { sourcePath: ctx.sourcePath, projectCode: ctx.projectCode }
      const resolved = resolveWithFallback(
        content,
        resolveDocumentRef(
          tryDecodeContent(content),
          ctx.sourcePath,
          ctx.ticketKey,
          ctx.projectCode,
          ctx.ticketsPath,
        ),
        { ...ctx, ...baseCtx },
      )
      if (resolved !== content) {
        const link = `[${match}](${resolved})`
        const placeholder = `__LINK_PLACEHOLDER_${state.linkPlaceholders.length}__`
        state.linkPlaceholders.push(link)
        return placeholder
      }
    }

    // MDT-237 (D11): a code span containing a full URL (e.g.
    // `git clone https://git.example.com/some/path`) keeps the WHOLE span as
    // code, with only the URL part as an anchor INSIDE it:
    // <code>git clone <a href="…">…</a></code>. Markdown syntax cannot nest a
    // link inside a code span, so raw HTML is emitted — the pipeline passes it
    // through (html: true), DOMPurify keeps code/a, and SmartLink replaces the
    // anchor. The host must be a plausible ASCII hostname (letters, digits,
    // hyphens; dots and port optional) so prose like `https://…` never becomes
    // a punycode link.
    if (ctx && ctx.enableDocumentLinks) {
      const urlMatch = content.match(/https?:\/\/[a-zA-Z0-9][^\s)]*/)
      if (urlMatch) {
        const url = urlMatch[0]
        const before = content.slice(0, urlMatch.index ?? 0)
        const after = content.slice((urlMatch.index ?? 0) + url.length)
        const html = `<code>${escapeHtml(before)}<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>${escapeHtml(after)}</code>`
        const placeholder = `__LINK_PLACEHOLDER_${state.linkPlaceholders.length}__`
        state.linkPlaceholders.push(html)
        return placeholder
      }
    }
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
    // UAT 2026-07-21 (BR-5): engage when sourcePath+projectCode present,
    // regardless of ticketKey — documents-view mode uses sourcePath without ticketKey.
    let resolvedHref = href
    if (sourcePath && projectCode && isRelativeMarkdownHref(href)) {
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
  return markdown.replace(projectPattern, (_, ticketRef) => `[${ticketRef}](${buildTicketPath(currentProject, ticketRef)})`)
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
 * UAT 2026-07-21 (BR-5): sourcePath may also be a documents-view path
 * (project-relative, e.g. "docs/architecture/aaaa.md") when the source
 * document is being viewed in the documents view rather than a ticket.
 * Detection rule: sourcePath NOT starting with a ticket-key prefix
 * ("^[A-Z]+-\\d+/") is treated as documents-view mode. In documents mode
 * all .md refs (bare and ..-relative) resolve against the source document's
 * directory and route to the documents view, never to a ticket subdoc URL.
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
  if (!sourcePath) {
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

  // UAT 2026-07-21 (BR-5): documents-view mode. sourcePath is project-relative
  // (e.g. "docs/architecture/aaaa.md") — resolve .md refs against the source
  // document's directory and route to the documents view.
  // Detection: sourcePath is NOT a ticket-relative path. Ticket-relative forms are:
  //   - subdoc:   "MDT-150/requirements.md"  (ticket key + "/" + path)
  //   - main doc: "MDT-150.md"               (ticket key + ".md")
  if (!/^[A-Z]+-\d+(?:\/|\.md$)/.test(sourcePath)) {
    const sourceDir = sourcePath.includes('/') ? sourcePath.substring(0, sourcePath.lastIndexOf('/')) : ''
    const resolvedPath = resolveRelativePath(sourceDir, pathPart)
    // resolvedPath is project-relative; pass directly to buildDocumentPathWithAnchor
    return buildDocumentPathWithAnchor(projectCode, resolvedPath, anchor)
  }

  // Ticket-context mode (original behavior). Requires ticketKey.
  if (!ticketKey) {
    return href
  }

  // 1. Ticket key pattern (bare: MDT-151, with .md: MDT-151.md, with suffix: MDT-150-smartlink-doc-urls.md)
  const ticketKeyMatch = pathPart.match(/^([A-Z]+-\d+)(?:-[^/]*?)?\.md$/)
  if (ticketKeyMatch) {
    return buildTicketPath(projectCode, ticketKeyMatch[1], anchor)
  }

  // 2. Bare filename (no /, no ..) → ticket subdoc URL
  if (!pathPart.includes('/') && !pathPart.includes('..')) {
    return buildTicketSubDocPath(projectCode, ticketKey, pathPart, anchor)
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
  // eslint-disable-next-line regexp/no-super-linear-backtracking, regexp/optimal-quantifier-concatenation
  const resolvedTicketMatch = resolvedPath.match(/^([A-Z]+-\d+)[^/]*\.md$/)
  if (resolvedTicketMatch) {
    return buildTicketPath(projectCode, resolvedTicketMatch[1], anchor)
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
    return buildTicketSubDocPath(projectCode, ticketKey, subPath, anchor)
  }

  // Path escapes the tickets directory → documents view
  // Prepend the appropriate prefix based on ticketsPath
  const tp = ticketsPath || 'docs/CRs'
  // Figure out how many ../ segments there are to determine the correct prefix
  // For a path like "README.md" (went above ticketsPath root), prepend docs/
  // For a path like "docs/README.md" (already has a prefix), use as-is
  const docsPrefix = tp.split('/').slice(0, -1).join('/') // e.g., "docs" from "docs/CRs"
  const fullPath = docsPrefix ? `${docsPrefix}/${resolvedPath}` : resolvedPath
  return buildDocumentPathWithAnchor(projectCode, fullPath, anchor)
}

/**
 * Converts document references to markdown links.
 * MDT-150: When sourcePath is available, resolves .md refs to absolute URLs
 * using resolveDocumentRef(). When no sourcePath, falls back to simple wrapping.
 *
 * MDT-237 UAT (D10 applied to plain text): when the document index is loaded,
 * a plain-text .md token that provably names a project file (root path or
 * unique basename) links to that real file instead of an unverifiable
 * relative guess — .md linkification favors actual .md files.
 */
function convertDocumentReferences(
  markdown: string,
  sourcePath?: string,
  ticketKey?: string,
  projectCode?: string,
  ticketsPath?: string,
  fileExists?: (projectRelPath: string) => boolean | null,
  findUniqueByBasename?: (basename: string) => string | null,
): string {
  return markdown.replace(DOCUMENT_REFERENCE_PATTERN, (match, prefix, filename) => {
    // Positive-knowledge routing: prefer a provably-existing project file
    if (fileExists && findUniqueByBasename && projectCode && !filename.includes('..')) {
      const anchorIdx = filename.indexOf('#')
      const pathPart = anchorIdx >= 0 ? filename.slice(0, anchorIdx) : filename
      const anchor = anchorIdx >= 0 ? filename.slice(anchorIdx) : ''
      let target: string | null = null
      if (fileExists(pathPart) === true) {
        target = pathPart
      }
      else {
        target = findUniqueByBasename(pathPart.slice(pathPart.lastIndexOf('/') + 1))
      }
      if (target) {
        return `${prefix}[${filename}](${buildDocumentPathWithAnchor(projectCode, target, anchor)})`
      }
    }

    // Match .md references that may have path prefixes like ../ ./. etc.
    // If we have sourcePath context, resolve to absolute URLs.
    // UAT 2026-07-21 (BR-5): engage without ticketKey in documents-view mode.
    if (sourcePath && projectCode) {
      const resolved = resolveDocumentRef(filename, sourcePath, ticketKey, projectCode, ticketsPath)
      if (resolved !== filename) {
        // Successfully resolved — produce markdown link with absolute URL
        return `${prefix}[${filename}](${resolved})`
      }
    }

    // Fallback: simple wrapping (bare filename → relative link)
    // Skip filenames that start with a ticket key pattern (handled by convertTicketReferences)
    const ticketKeyPattern = /^[A-Z]+-\d.*\.md$/
    if (ticketKeyPattern.test(filename)) {
      return match
    }
    return `${prefix}[${filename}](${filename})`
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
  fileExists?: (projectRelPath: string) => boolean | null,
  findUniqueByBasename?: (basename: string) => string | null,
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
    processed = protectInlineCode(processed, state, {
      sourcePath,
      ticketKey: extractedTicketKey,
      projectCode: currentProject,
      ticketsPath: tp,
      enableDocumentLinks: linkConfig.enableDocumentLinks,
      fileExists,
      findUniqueByBasename,
    })
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
      processed = convertDocumentReferences(processed, sourcePath, extractedTicketKey, currentProject, tp, fileExists, findUniqueByBasename)
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
