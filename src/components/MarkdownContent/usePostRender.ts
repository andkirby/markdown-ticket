import type { RefObject } from 'react'
import { useEffect } from 'react'
import { validateAllReferences } from '../../utils/linkValidator'
import { useMermaid } from '../../utils/mermaid'

interface UsePostRenderOptions {
  containerRef: RefObject<HTMLDivElement | null>
  processedContent: string
  onRenderComplete?: () => void
}

/**
 * Hook that handles post-render effects:
 * - Mermaid diagram rendering
 * - Link validation
 */
export function usePostRender({
  containerRef,
  processedContent,
  onRenderComplete,
}: UsePostRenderOptions): void {
  const { renderMermaid } = useMermaid()

  // Render Mermaid diagrams and validate links after HTML is ready
  useEffect(() => {
    if (processedContent && containerRef.current) {
      const timeoutId = setTimeout(() => {
        renderMermaid()

        // Validate link conversion
        if (containerRef.current) {
          validateAllReferences(containerRef.current)
        }

        onRenderComplete?.()
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [processedContent, onRenderComplete, renderMermaid, containerRef])
}
