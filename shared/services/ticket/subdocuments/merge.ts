import type { SubDocument } from '../../../models/SubDocument.js'
import { DEFAULT_SUBDOCUMENT_ORDER } from '../../../models/SubDocument.js'
import { groupNamespacedFiles, parseNamespace } from './namespace.js'

/**
 * Merge and sort children according to BR-12:
 * [main] first, then dot-notation alpha, then /folder alpha.
 */
export function mergeAndSortChildren(
  virtualChildren: SubDocument[],
  physicalChildren: SubDocument[],
): SubDocument[] {
  const result: SubDocument[] = []

  const mainChild = virtualChildren.find(child => child.name === 'main')
  if (mainChild) {
    result.push(mainChild)
  }

  const dotNotationChildren = virtualChildren
    .filter(child => child.name !== 'main')
    .sort((a, b) => a.name.localeCompare(b.name))
  result.push(...dotNotationChildren)

  const sortedPhysicalChildren = [...physicalChildren].sort((a, b) => a.name.localeCompare(b.name))
  result.push(...sortedPhysicalChildren)

  return result
}

export function mergeNamespaceGroupedEntries(
  entryMap: Map<string, SubDocument>,
  markdownFiles: string[],
  existingFolders: Set<string>,
  crId: string,
): void {
  for (const file of markdownFiles) {
    if (parseNamespace(file)) {
      entryMap.delete(file)
    }
  }

  const namespaceGrouped = groupNamespacedFiles(markdownFiles, existingFolders, crId)

  for (const namespacedDocument of namespaceGrouped) {
    const existingEntry = entryMap.get(namespacedDocument.name)
    if (!existingEntry) {
      entryMap.set(namespacedDocument.name, namespacedDocument)
      continue
    }

    mergeEntryWithNamespace(entryMap, existingEntry, namespacedDocument)
  }
}

export function sortSubDocuments(entryMap: Map<string, SubDocument>): SubDocument[] {
  const ordered: SubDocument[] = []

  for (const name of DEFAULT_SUBDOCUMENT_ORDER) {
    const entry = entryMap.get(name)
    if (entry) {
      ordered.push(entry)
      entryMap.delete(name)
    }
  }

  const remaining = [...entryMap.keys()]
    .sort()
    .map(name => entryMap.get(name)!)

  return [...ordered, ...remaining]
}

function mergeEntryWithNamespace(
  entryMap: Map<string, SubDocument>,
  existing: SubDocument,
  namespacedDocument: SubDocument,
): void {
  if (existing.kind === 'file' && namespacedDocument.kind === 'file') {
    return
  }

  if (existing.kind === 'file' && namespacedDocument.kind === 'folder') {
    entryMap.set(namespacedDocument.name, namespacedDocument)
    return
  }

  if (existing.kind === 'folder' && namespacedDocument.kind === 'folder') {
    mergeFolderEntries(existing, namespacedDocument)
  }
}

function mergeFolderEntries(existing: SubDocument, namespacedDocument: SubDocument): void {
  if (namespacedDocument.isVirtual && !existing.isVirtual) {
    existing.children = mergeAndSortChildren(namespacedDocument.children, existing.children)
    existing.isVirtual = false
    return
  }

  if (!namespacedDocument.isVirtual && !existing.isVirtual) {
    existing.children = mergeAndSortChildren(namespacedDocument.children, existing.children)
    existing.isVirtual = false
  }
}
