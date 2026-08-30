import type { RefObject } from 'react'
import { useEffect } from 'react'
import { validateAllReferences } from '../../utils/linkValidator'
import { useMermaid } from '../../utils/mermaid'
import { renderWireloomElements } from '../../utils/wireloomRenderer'

interface UsePostRenderOptions {
  containerRef: RefObject<HTMLDivElement | null>
  processedContent: string
  onRenderComplete?: () => void
}

/**
 * Hook that handles post-render effects:
 * - Mermaid diagram rendering
 * - Wireloom wireframe rendering
 * - Link validation
 * - Re-renders diagrams on theme change
 */
export function usePostRender({
  containerRef,
  processedContent,
  onRenderComplete,
}: UsePostRenderOptions): void {
  const { renderMermaid } = useMermaid()

  // Render Mermaid diagrams, Wireloom wireframes, and validate links after HTML is ready
  useEffect(() => {
    if (processedContent && containerRef.current) {
      const timeoutId = setTimeout(() => {
        void (async () => {
          if (!containerRef.current)
            return

          await renderMermaid(containerRef.current)
          renderWireloomElements(containerRef.current)
          validateAllReferences(containerRef.current)

          onRenderComplete?.()
        })()
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [processedContent, onRenderComplete, renderMermaid, containerRef])

  // Re-render Mermaid and Wireloom on theme change
  useEffect(() => {
    const handleThemeChange = () => {
      if (!containerRef.current)
        return

      void renderMermaid(containerRef.current)
      renderWireloomElements(containerRef.current)
    }

    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [renderMermaid, containerRef])
}
