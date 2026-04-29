import type { SubDocument } from '../../models/SubDocument.js'
import type { ResolvedTicketLocation, SubdocumentReadResult } from './types.js'
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { isContainedPath } from '../../utils/path-resolver.js'
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
    if (!this.isSupportedSubdocumentPath(subDocName)) {
      return null
    }

    const directFilePath = join(location.ticketDir, `${subDocName}.md`)
    if (existsSync(directFilePath)) {
      // Containment check: verify resolved path stays within ticketDir
      if (!isContainedPath(directFilePath, location.ticketDir)) {
        return null
      }
      return directFilePath
    }

    const dotNotationPath = this.resolveDotNotationPath(location.ticketDir, subDocName)
    if (dotNotationPath) {
      if (!isContainedPath(dotNotationPath, location.ticketDir)) {
        return null
      }
      return dotNotationPath
    }

    const namespacedPath = this.findNamespacedSubDocumentPath(location.ticketDir, subDocName)
    if (namespacedPath && !isContainedPath(namespacedPath, location.ticketDir)) {
      return null
    }

    return namespacedPath
  }

  read(location: ResolvedTicketLocation, subDocName: string): SubdocumentReadResult {
    const filePath = this.resolvePath(location, subDocName)
    if (!filePath) {
      throw new Error('SubDocument not found')
    }

    // Symlink containment: default deny symlinks
    try {
      const lstat = lstatSync(filePath)
      if (lstat.isSymbolicLink()) {
        // Symlinks are denied unless explicitly allowed via config
        return this.handleSymlink(filePath, location)
      }
    }
    catch {
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

  /**
   * Handle symlink resolution with containment check.
   * If allowSymlinks is enabled: resolve target via realpathSync + containment check.
   * Otherwise: deny (default).
   */
  private handleSymlink(filePath: string, location: ResolvedTicketLocation): SubdocumentReadResult {
    // Default deny — symlinks are not followed unless explicitly enabled
    if (!location.allowSymlinks) {
      throw new Error('SubDocument not found')
    }

    // Resolve the real target of the symlink
    const realTarget = realpathSync(filePath)
    // Also resolve ticketDir to handle OS-level symlinks (e.g. macOS /tmp → /private/tmp)
    const realTicketDir = realpathSync(location.ticketDir)

    // Containment check: real target must be inside ticketDir
    if (!isContainedPath(realTarget, realTicketDir)) {
      throw new Error('SubDocument not found')
    }

    // Symlink target is inside ticketDir — safe to read
    const stat = statSync(filePath)
    const content = readFileSync(filePath, 'utf-8')

    // Extract code from filePath (filename without .md extension)
    const code = filePath.split('/').pop()?.replace(/\.md$/, '') ?? ''

    return {
      code,
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
        const children = this.discoverFolderChildren(fullPath, crId, entry)
        if (children.length === 0) {
          return null
        }

        existingFolders.add(entry)
        return {
          name: entry,
          kind: 'folder',
          children,
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

  /**
   * Validate subDocName input against security whitelist.
   * Rejects: '..' segments, null bytes, non-whitelisted chars, length >255, whitespace-only.
   * Allows: alphanumeric, hyphens, underscores, dots (within segments), single forward slash.
   */
  private isSupportedSubdocumentPath(subDocName: string): boolean {
    // Reject empty or whitespace-only
    if (!subDocName || !subDocName.trim()) {
      return false
    }

    // Reject null bytes
    if (subDocName.includes('\0')) {
      return false
    }

    // Reject if exceeds max length
    if (subDocName.length > 255) {
      return false
    }

    // Reject suspicious encoded characters (not valid in filenames)
    if (subDocName.includes('%')) {
      return false
    }

    // Reject unicode slash variants: ∕ (U+2215), ⁄ (U+2044), ／ (U+FF0F)
    if (/[\u2215\u2044\uFF0F]/.test(subDocName)) {
      return false
    }

    const segments = subDocName.split('/').filter(Boolean)

    // Reject wrong segment count
    if (segments.length < 1 || segments.length > 2) {
      return false
    }

    // Reject segments containing '..' (double dot)
    for (const segment of segments) {
      if (segment === '..' || segment.includes('..')) {
        return false
      }
    }

    // Whitelist: alphanumeric, hyphens, underscores, dots (single, within segments)
    const segmentPattern = /^[a-zA-Z0-9._-]+$/
    for (const segment of segments) {
      if (!segmentPattern.test(segment)) {
        return false
      }
    }

    return true
  }
}
