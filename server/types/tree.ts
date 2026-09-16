import type { SubDocumentDocKind } from '@mdt/domain-contracts'
import { classifySubdocumentDocKind } from '@mdt/domain-contracts'

export type TreeNodeType = 'file' | 'folder'

/**
 * Server-derived document kind. Only present on file nodes whose extension the
 * server can classify; absent (undefined) on folders and unclassified files.
 * The client maps undefined -> 'unsupported' at the viewer boundary; it does
 * NOT re-derive kind from extensions (server owns classification, OBL-1).
 *
 * 'unsupported' is intentionally not a stored value: it is the absence of a
 * known kind, decided at the viewer switch. Persisting a negative category
 * would force every future file type to be mis-categorized or silently added.
 */
export type DocumentKind = SubDocumentDocKind

export interface TreeNode {
  name: string
  path: string
  type: TreeNodeType
  kind?: DocumentKind
  children?: TreeNode[]
  favorite?: boolean
  favoritedAt?: string
}

/**
 * Derive DocumentKind from a filename. Returns undefined for unclassified
 * extensions. Delegates to `classifySubdocumentDocKind` in domain-contracts —
 * the single source of truth — so the documents tree (TreeBuilder,
 * PathSelectionStrategy) and the ticket-subdocument tree (SubdocumentService)
 * classify identically (MDT-221 UAT r2).
 */
export const deriveDocumentKind = classifySubdocumentDocKind
