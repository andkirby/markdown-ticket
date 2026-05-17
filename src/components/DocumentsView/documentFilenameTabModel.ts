import { parseFilenameNamespace, sortFilenameNamespaceKeys } from '@mdt/shared/services/filenameNamespace.js'

export interface DocumentFile {
  name: string
  path: string
  type: 'file' | 'folder'
  title?: string
  children?: DocumentFile[]
  dateCreated?: Date | string
  lastModified?: Date | string
}

export interface DocumentFilenameTab {
  key: string
  label: string
  filePath: string
}

export interface DocumentFilenameTabsModel {
  logicalBasePath: string
  activeTabKey: string
  tabs: DocumentFilenameTab[]
}

interface GroupEntry {
  logicalBasePath: string
  root?: DocumentFile
  variants: Map<string, DocumentFile>
}

function isMarkdownFile(file: DocumentFile): boolean {
  return file.type === 'file' && file.name.endsWith('.md')
}

function dirname(filePath: string): string {
  const slashIndex = filePath.lastIndexOf('/')
  return slashIndex === -1 ? '' : filePath.slice(0, slashIndex)
}

function basenameWithoutMarkdownExtension(name: string): string {
  return name.slice(0, -'.md'.length)
}

function joinPath(directory: string, name: string): string {
  return directory ? `${directory}/${name}` : name
}

function flattenFiles(files: DocumentFile[]): DocumentFile[] {
  return files.flatMap((file) => {
    if (file.type === 'folder') {
      return flattenFiles(file.children ?? [])
    }

    return [file]
  })
}

function groupMarkdownFiles(files: DocumentFile[]): Map<string, GroupEntry> {
  const groups = new Map<string, GroupEntry>()

  for (const file of flattenFiles(files)) {
    if (!isMarkdownFile(file)) {
      continue
    }

    const directory = dirname(file.path)
    const stem = basenameWithoutMarkdownExtension(file.name)
    const parsed = parseFilenameNamespace(stem)
    const baseName = parsed?.baseName ?? stem
    const logicalBasePath = joinPath(directory, baseName)
    const group = groups.get(logicalBasePath) ?? {
      logicalBasePath,
      variants: new Map<string, DocumentFile>(),
    }

    if (parsed) {
      group.variants.set(parsed.variantKey, file)
    }
    else {
      group.root = file
    }

    groups.set(logicalBasePath, group)
  }

  return groups
}

function findSelectedGroup(groups: Map<string, GroupEntry>, selectedFile: string): GroupEntry | null {
  for (const group of groups.values()) {
    if (group.root?.path === selectedFile) {
      return group
    }

    for (const variant of group.variants.values()) {
      if (variant.path === selectedFile) {
        return group
      }
    }
  }

  return null
}

export function resolveDocumentFilenameTabs(
  files: DocumentFile[],
  selectedFile: string | null,
): DocumentFilenameTabsModel | null {
  if (!selectedFile) {
    return null
  }

  const groups = groupMarkdownFiles(files)
  const selectedGroup = findSelectedGroup(groups, selectedFile)
  if (!selectedGroup || selectedGroup.variants.size === 0) {
    return null
  }

  const tabs: DocumentFilenameTab[] = []
  if (selectedGroup.root) {
    tabs.push({
      key: 'main',
      label: 'main',
      filePath: selectedGroup.root.path,
    })
  }

  for (const key of sortFilenameNamespaceKeys([...selectedGroup.variants.keys()])) {
    const file = selectedGroup.variants.get(key)!
    tabs.push({
      key,
      label: key,
      filePath: file.path,
    })
  }

  const activeTab = tabs.find(tab => tab.filePath === selectedFile)
  if (!activeTab) {
    return null
  }

  return {
    logicalBasePath: selectedGroup.logicalBasePath,
    activeTabKey: activeTab.key,
    tabs,
  }
}

export function resolveFilenameTabFallback(
  files: DocumentFile[],
  deletedFilePath: string,
): string | null {
  const groups = groupMarkdownFiles(files)

  for (const group of groups.values()) {
    const deletedDirectory = dirname(deletedFilePath)
    if (!deletedFilePath.startsWith(`${group.logicalBasePath}.`) && deletedFilePath !== `${group.logicalBasePath}.md`) {
      continue
    }
    if (dirname(group.logicalBasePath) !== deletedDirectory) {
      continue
    }

    if (group.root) {
      return group.root.path
    }

    const firstVariantKey = sortFilenameNamespaceKeys([...group.variants.keys()])[0]
    return firstVariantKey ? group.variants.get(firstVariantKey)!.path : null
  }

  return null
}
