import parse from 'html-react-parser'
import * as React from 'react'
import { useEffect } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { loadPrismTheme } from '../../utils/syntaxHighlight'
import { MarkdownErrorBoundary } from '../MarkdownErrorBoundary'
import { useHtmlParser } from './useHtmlParser'
import { useMarkdownProcessor } from './useMarkdownProcessor'
import { usePostRender } from './usePostRender'

interface MarkdownContentProps {
  markdown: string
  currentProject: string
  className?: string
  headerLevelStart?: number
  onRenderComplete?: () => void
}

const DEFAULT_CLASS_NAME = 'prose prose-sm max-w-none dark:prose-invert'

/**
 * MarkdownContent component that renders markdown with:
 * - Smart link handling (ticket refs, document refs, external links)
 * - Syntax highlighting
 * - Mermaid diagram rendering
 * - Theme-aware styling
 */
const MarkdownContent: React.FC<MarkdownContentProps> = ({
  markdown,
  currentProject,
  className = DEFAULT_CLASS_NAME,
  headerLevelStart = 1,
  onRenderComplete,
}) => {
  const { theme } = useTheme()
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Load Prism theme based on current theme
  useEffect(() => {
    loadPrismTheme(theme)
  }, [theme])

  // Process markdown through the rendering pipeline
  const processedContent = useMarkdownProcessor(markdown, currentProject, headerLevelStart)

  // Get parser options for SmartLink replacement
  const parserOptions = useHtmlParser(currentProject)

  // Handle post-render effects (Mermaid, link validation)
  usePostRender({
    containerRef,
    processedContent,
    onRenderComplete,
  })

  // Parse HTML and convert to React elements
  const renderContent = () => {
    if (!processedContent) {
      return null
    }
    return parse(processedContent, parserOptions)
  }

  return (
    <div ref={containerRef} className={className}>
      {renderContent()}
    </div>
  )
}

/**
 * MarkdownContent wrapped with error boundary for safe rendering.
 */
const MarkdownContentWithErrorBoundary: React.FC<MarkdownContentProps> = props => (
  <MarkdownErrorBoundary>
    <MarkdownContent {...props} />
  </MarkdownErrorBoundary>
)

export default MarkdownContentWithErrorBoundary
