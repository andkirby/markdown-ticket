import DOMPurify from 'dompurify'
import { useMemo } from 'react'
import showdown from 'showdown'
import { getLinkConfig } from '../../config/linkConfig'
import { classifyLink } from '../../utils/linkProcessor'
import { preprocessMarkdown } from '../../utils/markdownPreprocessor'
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
 * preprocess → convert → highlight → sanitize
 */
export function useMarkdownProcessor(
  markdown: string,
  currentProject: string,
  headerLevelStart: number,
): string {
  // Get link configuration (outside useMemo to ensure proper caching)
  const linkConfig = getLinkConfig()

  // Initialize Showdown converter
  const converter = useMemo(() => {
    return new showdown.Converter({
      tables: true,
      strikethrough: true,
      tasklists: true,
      ghCodeBlocks: true,
      smoothLivePreview: true,
      simpleLineBreaks: true,
      headerLevelStart,
      parseImgDimensions: true,
      simplifiedAutoLink: false, // Disabled to prevent conflicts with our preprocessor
      excludeTrailingPunctuationFromURLs: true,
      literalMidWordUnderscores: true,
      ghCompatibleHeaderId: true,
    })
  }, [headerLevelStart])

  // Process markdown through the rendering pipeline
  return useMemo(() => {
    if (!markdown) {
      return ''
    }

    try {
      // Step 1: Preprocess markdown with safe link conversion
      const preprocessedMarkdown = preprocessMarkdown(markdown, currentProject, linkConfig)

      // Step 2: Convert markdown to HTML
      const rawHTML = converter.makeHtml(preprocessedMarkdown)

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
  }, [markdown, currentProject, converter, linkConfig])
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
