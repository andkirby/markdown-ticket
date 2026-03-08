/**
 * SubDocument model - MDT-093.
 *
 * Represents a sub-document entry discovered in a ticket's sub-document directory.
 * Files use kind='file'; directories use kind='folder' with nested children.
 */

export interface SubDocument {
  /** Entry name without file extension (e.g. 'requirements', 'poc') */
  name: string
  /** 'file' for markdown files, 'folder' for directories */
  kind: 'file' | 'folder'
  /** Nested entries (only populated for kind='folder') */
  children: SubDocument[]
}

/**
 * Default ordering for top-level sub-document names.
 * Entries matching these names appear first in this order.
 * Unknown names are appended alphabetically after ordered entries.
 */
export const DEFAULT_SUBDOCUMENT_ORDER: readonly string[] = [
  'requirements',
  'architecture',
  'bdd',
  'tests',
  'tasks',
  'design',
  'notes',
]
