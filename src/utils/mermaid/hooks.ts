import mermaid from 'mermaid'
import { useCallback, useEffect, useRef } from 'react'
import { initMermaid } from './core'
import { addFullscreenButtons, updateFullscreenButtons } from './fullscreen'
import { disableZoom } from './zoom'

/**
 * Return type for useMermaid hook
 */
export interface UseMermaidReturn {
  /** Render all mermaid diagrams in the DOM */
  renderMermaid: () => Promise<void>
  /** Whether mermaid has been initialized */
  isInitialized: boolean
}

/**
 * React hook for mermaid diagram rendering
 *
 * Handles initialization, theme changes, and proper cleanup of event listeners.
 * Use this in components that render mermaid diagrams.
 *
 * @example
 * ```tsx
 * function MarkdownRenderer({ content }: { content: string }) {
 *   const { renderMermaid } = useMermaid()
 *
 *   useEffect(() => {
 *     renderMermaid()
 *   }, [content, renderMermaid])
 *
 *   return <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
 * }
 * ```
 */
export function useMermaid(): UseMermaidReturn {
  const initializedRef = useRef(false)

  const renderMermaid = useCallback(async () => {
    // Read theme at call time for fresh value
    const isDark = typeof document !== 'undefined'
      && document.documentElement.classList.contains('dark')

    initMermaid(isDark)
    initializedRef.current = true

    await mermaid.run()
    addFullscreenButtons()
  }, [])

  useEffect(() => {
    // Add fullscreen change listeners
    document.addEventListener('fullscreenchange', updateFullscreenButtons)
    document.addEventListener('webkitfullscreenchange', updateFullscreenButtons)
    document.addEventListener('msfullscreenchange', updateFullscreenButtons)

    return () => {
      // Cleanup fullscreen listeners
      document.removeEventListener('fullscreenchange', updateFullscreenButtons)
      document.removeEventListener('webkitfullscreenchange', updateFullscreenButtons)
      document.removeEventListener('msfullscreenchange', updateFullscreenButtons)

      // Cleanup any active zoom handlers
      const mermaidContainers = document.querySelectorAll('.mermaid-container')
      mermaidContainers.forEach((container) => {
        disableZoom(container as HTMLElement)
      })
    }
  }, [])

  return {
    renderMermaid,
    isInitialized: initializedRef.current,
  }
}
