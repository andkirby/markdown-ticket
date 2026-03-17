import type { SubDocument } from '../../models/SubDocument.js'
import type { ResolvedTicketLocation, SubdocumentReadResult } from './types.js'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { mergeNamespaceGroupedEntries, sortSubDocuments } from './subdocuments/merge.js'
import { parseNamespace } from './subdocuments/namespace.js'

export class SubdocumentService {
  discover(location: ResolvedTicketLocation, crId: string): SubDocument[] {
    if (!existsSync(location.ticketDir)) {
      return []
    }

    const entries = this.readDirectorySafe(location.ticketDir)
    if (entries.length === 0) {
      return []
    }

    const { entryMap, markdownFiles, existingFolders } = this.scanEntries(entries, location.ticketDir, crId)
    mergeNamespaceGroupedEntries(entryMap, markdownFiles, existingFolders, crId)

    return sortSubDocuments(entryMap)
  }

  resolvePath(location: ResolvedTicketLocation, subDocName: string): string | null {
    const directFilePath = join(location.ticketDir, `${subDocName}.md`)
    if (existsSync(directFilePath)) {
      return directFilePath
    }

    const dotNotationPath = this.resolveDotNotationPath(location.ticketDir, subDocName)
    if (dotNotationPath) {
      return dotNotationPath
    }

    return this.findNamespacedSubDocumentPath(location.ticketDir, subDocName)
  }

  read(location: ResolvedTicketLocation, subDocName: string): SubdocumentReadResult {
    const filePath = this.resolvePath(location, subDocName)
    if (!filePath) {
      throw new Error('SubDocument not found')
    }

    const stat = statSync(filePath)
    const content = readFileSync(filePath, 'utf-8')

    return {
      code: subDocName,
      content,
      dateCreated: stat.birthtime,
      lastModified: stat.mtime,
    }
  }

  private readDirectorySafe(dirPath: string): string[] {
    try {
      return readdirSync(dirPath)
    }
    catch {
      return []
    }
  }

  private scanEntries(
    entries: string[],
    subdocumentDir: string,
    crId: string,
  ): {
    entryMap: Map<string, SubDocument>
    markdownFiles: string[]
    existingFolders: Set<string>
  } {
    const entryMap = new Map<string, SubDocument>()
    const markdownFiles: string[] = []
    const existingFolders = new Set<string>()

    for (const entry of entries) {
      const subdocument = this.buildEntryFromPath(entry, subdocumentDir, crId, existingFolders)
      if (!subdocument) {
        continue
      }

      if (subdocument.kind === 'file') {
        markdownFiles.push(subdocument.name)
      }

      this.handleEntryConflict(entryMap, subdocument)
    }

    return { entryMap, markdownFiles, existingFolders }
  }

  private buildEntryFromPath(
    entry: string,
    subdocumentDir: string,
    crId: string,
    existingFolders: Set<string>,
  ): SubDocument | null {
    const fullPath = join(subdocumentDir, entry)

    try {
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        existingFolders.add(entry)
        return {
          name: entry,
          kind: 'folder',
          children: this.discoverFolderChildren(fullPath, crId, entry),
          filePath: `${crId}/${entry}`,
          isVirtual: false,
        }
      }

      if (entry.endsWith('.md')) {
        return {
          name: entry.replace(/\.md$/, ''),
          kind: 'file',
          children: [],
          filePath: `${crId}/${entry}`,
        }
      }

      return null
    }
    catch {
      return null
    }
  }

  private discoverFolderChildren(dirPath: string, crId: string, folderName: string): SubDocument[] {
    return this.readDirectorySafe(dirPath)
      .filter(entry => entry.endsWith('.md'))
      .sort()
      .map(entry => ({
        name: entry.replace(/\.md$/, ''),
        kind: 'file' as const,
        children: [],
        filePath: `${crId}/${folderName}/${entry}`,
      }))
  }

  private handleEntryConflict(entryMap: Map<string, SubDocument>, subdocument: SubDocument): void {
    const existing = entryMap.get(subdocument.name)
    if (!existing) {
      entryMap.set(subdocument.name, subdocument)
      return
    }

    if (existing.kind === 'folder' && subdocument.kind === 'file') {
      return
    }

    entryMap.set(subdocument.name, subdocument)
  }

  private resolveDotNotationPath(ticketDir: string, subDocName: string): string | null {
    if (!subDocName.includes('/')) {
      return null
    }

    const dotNotationPath = join(ticketDir, `${subDocName.replace(/\//g, '.')}.md`)
    return existsSync(dotNotationPath) ? dotNotationPath : null
  }

  private findNamespacedSubDocumentPath(ticketDir: string, subDocName: string): string | null {
    try {
      const entries = readdirSync(ticketDir)
      const lastSegment = subDocName.split('/').pop()
      if (!lastSegment) {
        return null
      }

      const matchingEntry = entries.find((entry) => {
        const name = entry.replace(/\.md$/, '')
        return parseNamespace(name)?.subKey === lastSegment
      })

      return matchingEntry ? join(ticketDir, matchingEntry) : null
    }
    catch {
      return null
    }
  }
}
