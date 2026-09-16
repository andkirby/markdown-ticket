import { z } from 'zod'

/**
 * MDT-221 UAT r2 — Document classification for file subdocuments, mirroring
 * `DocumentKind` in `server/types/tree.ts`. `kind` is the tree-shape axis
 * (file/folder); `docKind` says what the file IS. Absent on folders and
 * unclassified files; the client decides rendering at the viewer boundary.
 */
export type SubDocumentDocKind = 'markdown' | 'html'

/**
 * Classify a filename into a SubDocumentDocKind. Returns undefined for
 * unclassified extensions (assets stay invisible in tab trees). Single source
 * of truth for document-kind derivation: `deriveDocumentKind` in
 * `server/types/tree.ts` delegates here, so the documents tree and the
 * ticket-subdocument tree can never classify differently.
 */
export function classifySubdocumentDocKind(name: string): SubDocumentDocKind | undefined {
  if (name.endsWith('.md')) {
    return 'markdown'
  }
  if (name.endsWith('.html') || name.endsWith('.htm')) {
    return 'html'
  }
  return undefined
}

export interface SubDocument {
  name: string
  kind: 'file' | 'folder'
  children: SubDocument[]
  isVirtual?: boolean
  filePath?: string
  docKind?: SubDocumentDocKind
}

export const DEFAULT_SUBDOCUMENT_ORDER: readonly string[] = [
  'requirements',
  'bdd',
  'architecture',
  'tests',
  'tasks',
  'design',
  'notes',
]

export const SubDocumentSchema: z.ZodType<SubDocument> = z.lazy(() => z.object({
  name: z.string(),
  kind: z.enum(['file', 'folder']),
  children: z.array(SubDocumentSchema),
  isVirtual: z.boolean().optional(),
  filePath: z.string().optional(),
  docKind: z.enum(['markdown', 'html']).optional(),
}))
