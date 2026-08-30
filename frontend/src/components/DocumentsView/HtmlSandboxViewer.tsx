import type { DocumentFile } from './FileTree'
import { useCallback, useEffect, useRef, useState } from 'react'
import { authFetch } from '@/auth/authFetch'

interface PreviewTokenResponse {
  token: string
  expiresAt: string
}

interface HtmlSandboxViewerProps {
  projectId: string
  filePath: string
  fileInfo?: DocumentFile | null
  refreshToken?: number
  fileDeleted?: boolean
  updateState?: 'idle' | 'updated' | 'syncing'
}

type ViewerState = 'minting' | 'ready' | 'failed' | 'deleted'

/**
 * MDT-221 — Sandboxed HTML document preview.
 *
 * SECURITY INVARIANT (C-2.6, Edge-3.6): the iframe `sandbox` attribute is
 * hardcoded to "allow-scripts" and is NOT a prop. `allow-same-origin` must
 * never appear — that combination with allow-scripts collapses the isolation
 * boundary and lets previewed HTML read parent window/DOM/localStorage.
 *
 * The preview token is the only credential bridge from the owner-authenticated
 * parent (which can carry the SameSite=Strict cookie) to the opaque-origin
 * iframe (which cannot). It is embedded in the iframe src PATH so relative
 * subresources inherit the same scope.
 *
 * See docs/CRs/MDT-221/architecture.md §2/§6 and ux-design.md.
 */
export default function HtmlSandboxViewer({
  projectId,
  filePath,
  refreshToken,
  fileDeleted = false,
  updateState = 'idle',
}: HtmlSandboxViewerProps): React.JSX.Element {
  const [state, setState] = useState<ViewerState>('minting')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const loadedFilePathRef = useRef<string | null>(null)

  const mintTokenAndBuildUrl = useCallback(async (pathToLoad: string) => {
    setState('minting')
    setPreviewUrl(null)

    const response = await authFetch('/api/documents/preview-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, filePath: pathToLoad }),
    })

    if (!response.ok) {
      // No fallback to markdown — HTML is selected, the viewer must show HTML
      // or a clear failure. Read-session/403 surfaces here as 'failed'.
      setState('failed')
      return
    }

    const data = (await response.json()) as PreviewTokenResponse
    // Token in the PATH prefix (not a query param) so relative subresources
    // resolve under the same scope (Edge-3.7).
    const url = `/api/documents/raw-preview/${encodeURIComponent(data.token)}/${pathToLoad
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`
    setPreviewUrl(url)
    setState('ready')
  }, [projectId])

  useEffect(() => {
    if (fileDeleted) {
      setState('deleted')
      return
    }
    // (Re)mint when the file changes or refreshToken bumps (SSE external edit).
    loadedFilePathRef.current = filePath
    void mintTokenAndBuildUrl(filePath)
  }, [filePath, fileDeleted, mintTokenAndBuildUrl, refreshToken, updateState])

  // Bump iframe key on refreshToken so the iframe reloads with the fresh token
  // (the src itself changes, but the key guarantees a clean remount).
  const effectiveKey = `preview:${refreshToken ?? 0}`

  if (state === 'deleted' || fileDeleted) {
    return (
      <div data-testid="file-viewer" className="document-viewer__center document-viewer__deleted">
        <div className="document-viewer__deleted-content">
          <div className="document-viewer__deleted-title">File was deleted</div>
          <div className="document-viewer__deleted-help">Choose another document from the tree.</div>
        </div>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div data-testid="file-viewer" className="document-viewer__center">
        <div className="document-viewer__center-message">Preview unavailable for this document.</div>
      </div>
    )
  }

  if (state === 'minting' || !previewUrl) {
    return (
      <div data-testid="file-viewer" className="document-viewer__center">
        <div className="document-viewer__center-message">Loading preview…</div>
      </div>
    )
  }

  return (
    <div data-testid="file-viewer" className="html-sandbox-viewer">
      {/*
        SECURITY: sandbox is hardcoded. Do NOT make it a prop. Do NOT add
        allow-same-origin. The unit test (HtmlSandboxViewer.test.tsx) asserts
        allow-same-origin is absent — that test is the contract guard.
      */}
      <iframe
        key={effectiveKey}
        src={previewUrl}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        loading="lazy"
        title="Document preview"
        className="html-sandbox-viewer__frame"
      />
    </div>
  )
}
