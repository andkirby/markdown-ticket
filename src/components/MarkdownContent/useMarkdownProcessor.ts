import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
// @ts-expect-error markdown-it-task-lists has no type declarations
import taskLists from 'markdown-it-task-lists'
import { useMemo } from 'react'
import { getLinkConfig } from '../../config/linkConfig'
import { classifyLink } from '../../utils/linkProcessor'
import { markdownItWireframePlugin } from '../../utils/markdownItWireframePlugin'
import { preprocessMarkdown } from '../../utils/markdownPreprocessor'
import { slugify } from '../../utils/slugify'
import { processMermaidBlocks } from '../../utils/mermaid'
import { highlightCodeBlocks } from '../../utils/syntaxHighlight'
import { ALLOWED_ATTR, ALLOWED_TAGS } from './domPurifyConfig'

interface LinkConfig {
  enableAutoLinking: boolean
  enableTicketLinks: boolean
  enableDocumentLinks: boolean
}

/**
 * Hook that processes markdown through the rendering pipeline:
 * preprocess → render → mermaid → highlight → sanitize
 */
export function useMarkdownProcessor(
  markdown: string,
  currentProject: string,
  headerLevelStart: number,
  sourcePath?: string,
  ticketsPath?: string,
): string {
  // Get link configuration (outside useMemo to ensure proper caching)
  const linkConfig = getLinkConfig()

  // Initialize markdown-it converter
  const converter = useMemo(() => {
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    })

    // Enable strikethrough (built-in)
    md.enable('strikethrough')

    // Plugins
    md.use(markdownItWireframePlugin)
    md.use(taskLists, { disabled: true })
    md.use(anchor, {
      slugify,
      level: Array.from({ length: 6 }, (_, i) => i + 1),
      permalink: (slug, _opts, state, idx) => {
        // Wrap heading content in anchor so entire title is clickable
        // Token stream: heading_open [inline] heading_close
        // Insert link_open after heading_open, link_close before heading_close
        const linkOpen = new state.Token('link_open', 'a', 1)
        linkOpen.attrs = [
          ['class', 'header-anchor'],
          ['href', `#${slug}`],
        ]
        linkOpen.info = 'auto'
        const linkClose = new state.Token('link_close', 'a', -1)
        // idx+1 = first content token; splice in link_open there
        state.tokens.splice(idx + 1, 0, linkOpen)
        // Find heading_close (now shifted by +1 due to splice)
        const closeIdx = state.tokens.findIndex(
          (t, i) => i > idx + 2 && t.type === 'heading_close',
        )
        state.tokens.splice(closeIdx, 0, linkClose)
      },
    })

    // Apply headerLevelStart by adjusting heading levels
    if (headerLevelStart > 1) {
      const originalHeadingOpen = md.renderer.rules.heading_open
      md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        const level = parseInt(token.tag.slice(1)) // e.g., 'h1' → 1
        const adjusted = Math.min(level + headerLevelStart - 1, 6)
        token.tag = `h${adjusted}`
        if (originalHeadingOpen) {
          return originalHeadingOpen(tokens, idx, options, env, self)
        }
        return self.renderToken(tokens, idx, options)
      }
    }

    return md
  }, [headerLevelStart])

  // Process markdown through the rendering pipeline
  return useMemo(() => {
    if (!markdown) {
      return ''
    }

    try {
      // Step 1: Preprocess markdown with safe link conversion
      const preprocessedMarkdown = preprocessMarkdown(markdown, currentProject, linkConfig, sourcePath, ticketsPath)

      // Step 2: Convert markdown to HTML
      const rawHTML = converter.render(preprocessedMarkdown)

      // Step 3: Process Mermaid diagrams
      const mermaidProcessed = processMermaidBlocks(rawHTML)

      // Step 4: Highlight code blocks
      const codeHighlighted = highlightCodeBlocks(mermaidProcessed)

      // Step 5: Sanitize HTML
      const sanitized = DOMPurify.sanitize(codeHighlighted, {
        ALLOWED_TAGS: [...ALLOWED_TAGS],
        ALLOWED_ATTR: [...ALLOWED_ATTR],
      })

      return sanitized
    }
    catch (error) {
      console.error('Markdown processing error:', error)
      return `<div class="text-red-600 p-4 border border-red-200 rounded">Error processing markdown: ${error instanceof Error ? error.message : 'Unknown error'}</div>`
    }
  }, [markdown, currentProject, converter, linkConfig, sourcePath, ticketsPath])
}

/**
 * Gets the link configuration for markdown processing.
 * Exported for use in parser options.
 */
export function getLinkConfigForProcessor(): LinkConfig {
  return getLinkConfig()
}

/**
 * Re-export classifyLink for use in parser options.
 */
export { classifyLink }
