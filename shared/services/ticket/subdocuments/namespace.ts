import type { SubDocument } from '../../../models/SubDocument.js'
import type { NamespaceParseResult } from '../types.js'

/**
 * Parse a filename into namespace components.
 * Rule: First dot segment = namespace, rest = sub-key.
 */
export function parseNamespace(filename: string): NamespaceParseResult | null {
  const dotIndex = filename.indexOf('.')
  if (dotIndex === -1) {
    return null
  }

  return {
    namespace: filename.slice(0, dotIndex),
    subKey: filename.slice(dotIndex + 1),
  }
}

/**
 * Group files into namespace-aware subdocuments with virtual folders.
 */
export function groupNamespacedFiles(
  files: string[],
  existingFolders: Set<string>,
  crId: string,
): SubDocument[] {
  const namespaceGroups = new Map<string, Map<string, SubDocument>>()
  const fileToNamespace = new Map<string, NamespaceParseResult>()

  for (const file of files) {
    const parsed = parseNamespace(file)
    if (parsed) {
      fileToNamespace.set(file, parsed)
    }
  }

  for (const [filename, { namespace, subKey }] of fileToNamespace) {
    const group = namespaceGroups.get(namespace) ?? new Map<string, SubDocument>()
    group.set(subKey, {
      name: subKey,
      kind: 'file',
      children: [],
      filePath: `${crId}/${filename}.md`,
    })
    namespaceGroups.set(namespace, group)
  }

  const result: SubDocument[] = []
  const processedNamespaces = new Set<string>()

  for (const file of files) {
    const parsed = parseNamespace(file)

    if (parsed) {
      const { namespace } = parsed
      if (processedNamespaces.has(namespace)) {
        continue
      }

      const hasRootFile = files.includes(namespace)
      const children: SubDocument[] = []

      if (hasRootFile) {
        children.push({
          name: 'main',
          kind: 'file',
          children: [],
          filePath: `${crId}/${namespace}.md`,
        })
      }

      const group = namespaceGroups.get(namespace)
      if (group) {
        const sortedSubKeys = [...group.keys()].sort()
        for (const subKey of sortedSubKeys) {
          children.push(group.get(subKey)!)
        }
      }

      result.push({
        name: namespace,
        kind: 'folder',
        children,
        isVirtual: !existingFolders.has(namespace),
        filePath: `${crId}/${namespace}.md`,
      })
      processedNamespaces.add(namespace)
      continue
    }

    const isInNamespace = files.some((candidate) => {
      const namespaceCandidate = parseNamespace(candidate)
      return namespaceCandidate?.namespace === file
    })

    if (!isInNamespace) {
      result.push({
        name: file,
        kind: 'file',
        children: [],
        filePath: `${crId}/${file}.md`,
      })
    }
  }

  return result
}
