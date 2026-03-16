import { useEffect, type RefObject } from 'react'
import { useMermaid } from '../../utils/mermaid'
import { validateAllReferences } from '../../utils/linkValidator'

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
