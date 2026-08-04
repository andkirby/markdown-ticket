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
export type DocumentKind = 'markdown' | 'html'

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
 * extensions. Centralised here so both TreeBuilder and PathSelectionStrategy
 * classify identically (single source of truth for kind derivation).
 */
export function deriveDocumentKind(name: string): DocumentKind | undefined {
  if (name.endsWith('.md')) {
    return 'markdown'
  }
  if (name.endsWith('.html') || name.endsWith('.htm')) {
    return 'html'
  }
  return undefined
}
