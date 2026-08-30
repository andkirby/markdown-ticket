import mermaid from 'mermaid'
import { useCallback, useEffect, useRef } from 'react'
import { initMermaid } from './core'
import { addFullscreenButtons } from './fullscreen'
import { disableZoom } from './zoom'

/**
 * Return type for useMermaid hook
 */
export interface UseMermaidReturn {
  /** Render all mermaid diagrams in the DOM */
  renderMermaid: (root?: ParentNode) => Promise<void>
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
  const renderCounterRef = useRef(0)

  const renderMermaid = useCallback(async (root: ParentNode = document) => {
    // Read theme at call time for fresh value
    const isDark = typeof document !== 'undefined'
      && document.documentElement.classList.contains('dark')

    initMermaid(isDark)
    initializedRef.current = true

    const containers = Array.from(root.querySelectorAll<HTMLElement>('.mermaid-container'))
    if (containers.length === 0) {
      return
    }

    for (const container of containers) {
      const diagram = container.querySelector<HTMLElement>('.mermaid')
      if (!diagram)
        continue

      const source = diagram.dataset.sourceEncoded
        ? decodeURIComponent(diagram.dataset.sourceEncoded)
        : diagram.textContent ?? ''

      diagram.classList.remove('mermaid-error')
      diagram.textContent = source

      try {
        const result = await mermaid.render(`${diagram.id}-svg-${++renderCounterRef.current}`, source)
        diagram.innerHTML = result.svg
        result.bindFunctions?.(diagram)
      }
      catch (error) {
        diagram.classList.add('mermaid-error')
        diagram.textContent = error instanceof Error ? error.message : String(error)
      }
    }

    addFullscreenButtons(root)
  }, [])

  useEffect(() => {
    return () => {
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
