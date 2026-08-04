import type { Request, Response } from 'express'
import type { TreeNode } from '../types/tree.js'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import { getRequestAccess } from '../security/apiAuth.js'
import { mintPreviewToken, PreviewTokenError, verifyPreviewToken } from '../security/documentPreviewToken.js'
import { isWriteAccess } from '../security/projectSharing.js'

// Type definitions
interface DocumentService {
  discoverDocuments: (projectId: string) => Promise<TreeNode[]>
  getDocumentContent: (projectId: string, filePath: string) => Promise<string>
  updateDocumentFavs: (projectId: string, favState: unknown) => Promise<unknown>
  resolveRawPreviewPath: (projectId: string, docDir: string, requestedPath: string) => Promise<{ projectPath: string, resolvedPath: string, mime: string }>
}

interface AuthenticatedRequest extends Request {
  query: {
    projectId?: string
    filePath?: string
  }
}

interface DocumentFavsRequest extends Request {
  body: {
    projectId?: unknown
    favItems?: unknown
  }
}

interface PreviewTokenRequest extends Request {
  body: {
    projectId?: unknown
    filePath?: unknown
  }
}

/**
 * MDT-221 — CSP for raw HTML preview responses.
 *
 * DEVIATION from canonical contract (CR §4 / C-2.13). The canonical contract is
 * STRICT: `default-src 'none'`, no external origins, no `unsafe-eval`. v1 ships
 * a documented deviation so real working HTML (Tailwind CDN JIT, Alpine.js via
 * jsDelivr, Google Fonts) renders. TASK-14 replaces this hardcoded constant
 * with per-request CSP derived from `[project.document.preview]` config
 * (`allowedExternalDomains`, `allowUnsafeEval`), strict by default — at which
 * point this deviation becomes opt-in per project rather than global.
 *
 * Full rationale, the config model, and the follow-up scope:
 * `docs/CRs/MDT-221/security-tradeoffs.md`.
 *
 * Non-negotiable directives that hold in EVERY configuration (asserted as
 * `CSP_INVARIANTS` in the integration test):
 * - `connect-src 'none'` — fetch/XHR/WebSocket blocked (no API credentialed
 *   channel, no programmatic data exfil).
 * - `img-src 'self' data:` — external image loads blocked (no img-beacon
 *   exfiltration; only same-origin raw-preview assets and inline data URIs).
 * - `default-src 'none'` with no `object-src` override — blocks `<object>`/
 *   `<embed>` SVG script vectors.
 * - sandbox without `allow-same-origin` — the iframe stays opaque-origin; no
 *   parent DOM/localStorage access.
 */
const ALLOWED_CDN_SCRIPT_STYLES = 'https://cdn.tailwindcss.com https://cdn.jsdelivr.net'
const ALLOWED_CDN_FONTS = 'https://fonts.googleapis.com https://fonts.gstatic.com'
const RAW_PREVIEW_CSP = `sandbox allow-scripts; default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${ALLOWED_CDN_SCRIPT_STYLES}; style-src 'self' 'unsafe-inline' ${ALLOWED_CDN_SCRIPT_STYLES} ${ALLOWED_CDN_FONTS}; img-src 'self' data:; font-src 'self' ${ALLOWED_CDN_FONTS}; connect-src 'none'; base-uri 'none'; form-action 'none'`

/**
 * Controller layer for document-related HTTP endpoints.
 */
export class DocumentController {
  private documentService: DocumentService
  private previewTokenSecret: string

  constructor(documentService: DocumentService, previewTokenSecret: string) {
    this.documentService = documentService
    this.previewTokenSecret = previewTokenSecret
  }

  /**
   * Discover documents for a project.
   */
  async getDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.query

      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })

        return
      }

      const documents = await this.documentService.discoverDocuments(projectId)

      res.json(documents)
    }
    catch (error: unknown) {
      console.error('Error discovering documents:', error)

      if (error instanceof Error && error.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: error.message })
      }
      else if (error instanceof Error && error.message === 'No document configuration found') {
        res.status(404).json({ error: 'Not Found', message: error.message })
      }
      else {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to discover documents' })
      }
    }
  }

  /**
   * Get document content.
   */
  async getDocumentContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, filePath } = req.query

      if (!projectId || !filePath) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and file path are required' })

        return
      }

      const content = await this.documentService.getDocumentContent(projectId, filePath)

      res.send(content)
    }
    catch (error: unknown) {
      console.error('Error reading document:', error)

      if (!(error instanceof Error)) {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to read document' })

        return
      }

      switch (error.message) {
        case 'Project not found': {
          res.status(404).json({ error: 'Not Found', message: error.message })

          break
        }
        case 'File not found': {
          res.status(404).json({ error: 'Not Found', message: error.message })

          break
        }
        case 'Invalid file path': {
          res.status(403).json({ error: 'Forbidden', message: error.message })

          break
        }
        case 'Only markdown files are allowed': {
          res.status(400).json({ error: 'Bad Request', message: error.message })

          break
        }
        case 'Access denied': {
          res.status(403).json({ error: 'Forbidden', message: error.message })

          break
        }
        case 'File is outside configured document paths': {
          res.status(403).json({ error: 'Forbidden', message: error.message })

          break
        }
        default: {
          res.status(500).json({ error: 'Internal Server Error', message: 'Failed to read document' })
        }
      }
    }
  }

  async putDocumentFavs(req: DocumentFavsRequest, res: Response): Promise<void> {
    try {
      const { projectId, favItems } = req.body

      if (typeof projectId !== 'string') {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })

        return
      }

      const state = await this.documentService.updateDocumentFavs(projectId, { favItems })

      res.json(state)
    }
    catch (error: unknown) {
      console.error('Error writing document favs:', error)

      if (!(error instanceof Error)) {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to write document favs' })

        return
      }

      switch (error.message) {
        case 'Project not found': {
          res.status(404).json({ error: 'Not Found', message: error.message })
          break
        }
        case 'Invalid document fav target': {
          res.status(400).json({ error: 'Bad Request', message: error.message })
          break
        }
        default: {
          res.status(400).json({ error: 'Bad Request', message: 'Invalid document fav state' })
        }
      }
    }
  }

  /**
   * MDT-221 — Mint a short-lived, directory-scoped preview token for an HTML
   * document. Owner-only: read-token/shared sessions are rejected (C-2.5).
   * Project visibility is enforced by requireVisibleProject route middleware.
   */
  async mintPreviewToken(req: PreviewTokenRequest, res: Response): Promise<void> {
    try {
      // Reject read-only / shared sessions. The token grants raw file reads
      // scoped to a directory; only the owner may mint it in v1.
      if (!isWriteAccess(getRequestAccess(req))) {
        res.status(403).json({ error: 'Forbidden', message: 'Preview tokens may only be minted by the project owner' })
        return
      }

      const { projectId, filePath } = req.body
      if (typeof projectId !== 'string' || typeof filePath !== 'string' || !projectId || !filePath) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and file path are required' })
        return
      }

      // The token is scoped to the directory of the selected HTML file so that
      // relative subresources (css/js/png) resolve under the same scope.
      const docDir = dirname(filePath.replace(/\\/g, '/')).replace(/\/+$/, '')

      const result = mintPreviewToken(projectId, docDir, this.previewTokenSecret)
      res.json(result)
    }
    catch (error: unknown) {
      console.error('Error minting preview token:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to mint preview token' })
    }
  }

  /**
   * MDT-221 — Serve a raw document asset from a token-scoped virtual root.
   * Gates G2-G10 (architecture.md §3): signature, expiry, project lookup,
   * docDir scope, configured-paths containment, project-root containment,
   * MIME, then set headers (CSP, nosniff is global, X-Frame-Options
   * SAMEORIGIN override) and stream bytes.
   */
  async serveRawPreview(req: Request, res: Response): Promise<void> {
    const token = req.params.token as string | undefined
    // Express 4 unnamed wildcard (*) puts the captured segment in params[0].
    const documentPath = req.params[0] as string | undefined

    try {
      if (!token || !documentPath) {
        res.status(400).json({ error: 'Bad Request', message: 'Token and document path are required' })
        return
      }

      // Gates G2/G3: signature + expiry. Rejects before any fs work.
      let payload
      try {
        payload = verifyPreviewToken(token, this.previewTokenSecret).payload
      }
      catch (error) {
        if (error instanceof PreviewTokenError) {
          res.status(403).json({ error: 'Forbidden', message: error.message })
          return
        }
        throw error
      }

      // Gates G4-G9: project lookup, docDir scope, docPaths, root containment, MIME.
      const { resolvedPath, mime } = await this.documentService.resolveRawPreviewPath(
        payload.projectId,
        payload.docDir,
        documentPath,
      )

      // Gate G10 + headers: override the global X-Frame-Options DENY so the
      // same-origin iframe can load; set the pinned CSP and Content-Type.
      res.setHeader('Content-Security-Policy', RAW_PREVIEW_CSP)
      res.setHeader('X-Frame-Options', 'SAMEORIGIN')
      res.setHeader('Content-Type', mime)
      // Cache-Control: preview tokens are short-lived and scoped; do not cache.
      res.setHeader('Cache-Control', 'no-store')

      // Binary-safe streaming (createReadStream, no utf8 decode). C-2.18/C-2.20.
      const fileStat = await stat(resolvedPath)
      res.setHeader('Content-Length', fileStat.size)

      createReadStream(resolvedPath)
        .on('error', (err) => {
          console.error('Error streaming raw preview:', err)
          if (!res.headersSent) {
            res.status(404).json({ error: 'Not Found', message: 'File not found' })
          }
          else {
            res.end()
          }
        })
        .pipe(res)
    }
    catch (error: unknown) {
      console.error('Error serving raw preview:', error)
      if (!(error instanceof Error)) {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to serve raw preview' })
        return
      }
      switch (error.message) {
        case 'Project not found':
        case 'File not found':
          res.status(404).json({ error: 'Not Found', message: error.message })
          break
        case 'Invalid file path':
        case 'Access denied':
        case 'File is outside configured document paths':
          res.status(403).json({ error: 'Forbidden', message: error.message })
          break
        case 'Unsupported document type':
          res.status(415).json({ error: 'Unsupported Media Type', message: error.message })
          break
        default:
          // Never leak filesystem absolute paths in errors.
          res.status(500).json({ error: 'Internal Server Error', message: 'Failed to serve raw preview' })
      }
    }
  }
}
