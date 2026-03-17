/**
 * Web Server Ticket Service Adapter
 * Adapts shared/services/TicketService.ts for web server API use
 * Converts projectId strings to Project objects for shared service
 * Per MDT-082: Uses consolidated CRUD operations from shared layer.
 */

import type { Project } from '@mdt/shared/models/Project.js'
import type { SubDocument } from '@mdt/shared/models/SubDocument.js'
import type { Ticket, TicketData } from '@mdt/shared/models/Ticket.js'
import type { CRStatus } from '@mdt/shared/models/Types.js'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_SUBDOCUMENT_ORDER } from '@mdt/shared/models/SubDocument.js'
import { TicketService as SharedTicketService } from '@mdt/shared/services/TicketService.js'
import { WorktreeService } from '@mdt/shared/services/WorktreeService.js'

export interface CRData {
  code?: string
  title: string
  type: string
  priority?: string
  description?: string
}

export interface CreateCRResult {
  success: boolean
  message: string
  crCode: string
  filename: string
  path: string
}

export interface UpdateCRResult {
  success: boolean
  message: string
  updatedFields: string[]
  projectId: string
  crId: string
}

export interface DeleteResult {
  success: boolean
  message: string
  filename: string
}

/**
 * Parse a filename into namespace components.
 * Rule: First dot segment = namespace, rest = sub-key
 *
 * @param filename - Filename without .md extension (e.g., "architecture.approve-it")
 * @returns Parsed namespace structure or null if no namespace
 */
export function parseNamespace(filename: string): { namespace: string, subKey: string } | null {
  const dotIndex = filename.indexOf('.')
  if (dotIndex === -1) {
    return null // No namespace, just a root document
  }
  return {
    namespace: filename.slice(0, dotIndex),
    subKey: filename.slice(dotIndex + 1),
  }
}

/**
 * Merge and sort children according to BR-12:
 * [Main] first, then dot-notation alpha, then /folder alpha
 */
function mergeAndSortChildren(
  virtualChildren: SubDocument[],
  physicalChildren: SubDocument[],
): SubDocument[] {
  const result: SubDocument[] = []

  // 1. Add 'main' first if present in virtual children
  const mainChild = virtualChildren.find(c => c.name === 'main')
  if (mainChild) {
    result.push(mainChild)
  }

  // 2. Add dot-notation children (sorted alpha, excluding 'main')
  const dotNotationChildren = virtualChildren
    .filter(c => c.name !== 'main')
    .sort((a, b) => a.name.localeCompare(b.name))
  result.push(...dotNotationChildren)

  // 3. Add physical children (sorted alpha)
  const sortedPhysical = [...physicalChildren].sort((a, b) => {
    return a.name.localeCompare(b.name)
  })
  result.push(...sortedPhysical)

  return result
}

/**
 * Group files into namespace-aware subdocuments with virtual folders.
 *
 * @param files - Array of markdown filenames (without .md extension)
 * @param existingFolders - Set of existing folder names (from directory scan)
 * @param crId - CR ID (e.g., 'MDT-138') for building filePath
 * @returns Array of SubDocument with virtual folders for dot-notation files
 */
export function groupNamespacedFiles(
  files: string[],
  existingFolders: Set<string>,
  crId: string,
): SubDocument[] {
  const namespaceGroups = new Map<string, Map<string, SubDocument>>()

  // Track which files belong to which namespace
  const fileToNamespace = new Map<string, { namespace: string, subKey: string }>()

  for (const file of files) {
    const parsed = parseNamespace(file)
    if (parsed) {
      fileToNamespace.set(file, parsed)
    }
  }

  // Build namespace groups
  for (const [filename, { namespace, subKey }] of fileToNamespace) {
    if (!namespaceGroups.has(namespace)) {
      namespaceGroups.set(namespace, new Map())
    }
    namespaceGroups.get(namespace)!.set(subKey, {
      name: subKey,
      kind: 'file',
      children: [],
      filePath: `${crId}/${filename}.md`,
    })
  }

  // Build result with proper ordering
  const result: SubDocument[] = []
  const processedNamespaces = new Set<string>()

  // Process files in original order, grouping by namespace
  for (const file of files) {
    const parsed = parseNamespace(file)

    if (parsed) {
      const { namespace } = parsed

      // Check if this is a root file that already exists
      const hasRootFile = files.includes(namespace)
      const isExistingFolder = existingFolders.has(namespace)

      // Skip if we already processed this namespace
      if (processedNamespaces.has(namespace)) {
        continue
      }

      // Create virtual folder for namespace
      const children: SubDocument[] = []

      // Add [main] tab only if root file exists
      if (hasRootFile) {
        children.push({
          name: 'main',
          kind: 'file',
          children: [],
          filePath: `${crId}/${namespace}.md`,
        })
      }

      // Add all sub-files sorted alphanumerically
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
        isVirtual: !isExistingFolder, // Mark as virtual if no physical folder
        filePath: `${crId}/${namespace}.md`,
      })

      processedNamespaces.add(namespace)
    }
    else if (!fileToNamespace.has(file)) {
      // This is a root file without dot-notation
      // Check if it's part of a namespace group
      const isInNamespace = files.some(f => {
        const p = parseNamespace(f)
        return p && p.namespace === file
      })

      if (!isInNamespace) {
        // Standalone file
        result.push({
          name: file,
          kind: 'file',
          children: [],
          filePath: `${crId}/${file}.md`,
        })
      }
    }
  }

  return result
}

interface CRPartialUpdates {
  status?: string
  priority?: string
  phaseEpic?: string
  assignee?: string
  relatedTickets?: string
  dependsOn?: string
  blocks?: string
  [key: string]: unknown
}

interface ProjectDiscovery {
  getAllProjects: () => Promise<Project[]>
}

interface ResolvedTicketLocation {
  projectRoot: string
  ticketDir: string
  ticketsPath: string
  isWorktree: boolean
}

/**
 * Web Server Ticket Service
 * Adapts shared TicketService for web API use (string projectIds vs Project objects).
 */
export class TicketService {
  private projectDiscovery: ProjectDiscovery
  private sharedTicketService: SharedTicketService
  private readonly worktreeService: WorktreeService

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery
    this.sharedTicketService = new SharedTicketService(false)
    this.worktreeService = new WorktreeService()
  }

  /**
   * Convert projectId to Project object.
   * Supports lookup by both project.id and project.project.code.
   */
  private async getProject(projectId: string): Promise<Project> {
    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(p => p.id === projectId || p.project.code === projectId)

    if (!project) {
      throw new Error('Project not found')
    }

    return project
  }

  /**
   * Get CRs for a specific project.
   */
  async getProjectCRs(projectId: string): Promise<Ticket[]> {
    const project = await this.getProject(projectId)

    return await this.sharedTicketService.listCRs(project)
  }

  /**
   * Get specific CR from a project, including discovered sub-documents.
   */
  async getCR(projectId: string, crId: string): Promise<Ticket> {
    const project = await this.getProject(projectId)
    const cr = await this.sharedTicketService.getCR(project, crId)

    if (!cr) {
      throw new Error('CR not found')
    }

    // MDT-093: Await discoverSubDocuments now that it's async
    cr.subdocuments = await this.discoverSubDocuments(project, crId)
    return cr
  }

  /**
   * Discover sub-documents for a CR, ordered by default order then alphabetically.
   * MDT-093: Enhanced with worktree support - resolves ticket location before discovery.
   * MDT-138: Enhanced with namespace parsing - groups dot-notation files into virtual folders.
   */
  private async discoverSubDocuments(project: Project, crId: string): Promise<SubDocument[]> {
    const location = await this.resolveTicketLocation(project, crId)
    return this.discoverSubDocumentsInDirectory(location.ticketDir, crId)
  }

  /**
   * Native subdocument discovery against a resolved ticket directory.
   */
  private discoverSubDocumentsInDirectory(ticketDir: string, crId: string): SubDocument[] {
    if (!existsSync(ticketDir)) {
      return []
    }

    const entries = this.readDirectorySafe(ticketDir)
    if (entries.length === 0) {
      return []
    }

    const { entryMap, markdownFiles, existingFolders } = this.scanEntries(entries, ticketDir, crId)

    // Apply namespace grouping and merge with scanned entries
    this.mergeNamespaceGrouped(entryMap, markdownFiles, existingFolders, crId)

    return this.sortSubDocuments(entryMap)
  }

  /**
   * Resolve the effective ticket location with worktree support.
   * Once resolved, downstream logic works against native paths only.
   */
  private async resolveTicketLocation(project: Project, crId: string): Promise<ResolvedTicketLocation> {
    const ticketsPath = project.project.ticketsPath ?? 'docs/CRs'
    const projectCode = project.project.code

    const projectRoot = projectCode
      ? await this.worktreeService.resolvePath(
          project.project.path,
          crId,
          ticketsPath,
          projectCode,
        )
      : project.project.path

    return {
      projectRoot,
      ticketDir: join(projectRoot, ticketsPath, crId),
      ticketsPath,
      isWorktree: projectRoot !== project.project.path,
    }
  }

  /**
   * Safely read directory contents, returning empty array on failure.
   */
  private readDirectorySafe(dirPath: string): string[] {
    try {
      return readdirSync(dirPath)
    }
    catch {
      return []
    }
  }

  /**
   * Scan directory entries and build entry map with conflict resolution.
   */
  private scanEntries(
    entries: string[],
    subdocDir: string,
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
      const doc = this.buildEntryFromPath(entry, subdocDir, crId, existingFolders)
      if (!doc) continue

      if (doc.kind === 'file') {
        markdownFiles.push(doc.name)
      }

      this.handleEntryConflict(entryMap, doc)
    }

    return { entryMap, markdownFiles, existingFolders }
  }

  /**
   * Build a SubDocument from a directory entry.
   */
  private buildEntryFromPath(
    entry: string,
    subdocDir: string,
    crId: string,
    existingFolders: Set<string>,
  ): SubDocument | null {
    const fullPath = join(subdocDir, entry)

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

  /**
   * Discover children files within a physical folder.
   */
  private discoverFolderChildren(dirPath: string, crId: string, folderName: string): SubDocument[] {
    const childEntries = this.readDirectorySafe(dirPath)

    return childEntries
      .filter(e => e.endsWith('.md'))
      .sort()
      .map(e => ({
        name: e.replace(/\.md$/, ''),
        kind: 'file' as const,
        children: [],
        filePath: `${crId}/${folderName}/${e}`,
      }))
  }

  /**
   * Handle name conflicts between files and folders.
   * Folder entries take precedence over file entries with the same name.
   */
  private handleEntryConflict(entryMap: Map<string, SubDocument>, doc: SubDocument): void {
    const existing = entryMap.get(doc.name)

    if (!existing) {
      entryMap.set(doc.name, doc)
      return
    }

    // Folder wins over file - keep existing folder, discard new file
    if (existing.kind === 'folder' && doc.kind === 'file') {
      return
    }

    // Replace file with folder
    entryMap.set(doc.name, doc)
  }

  /**
   * Merge namespace-grouped entries with scanned entries.
   * Removes dot-notation files from top-level, then merges virtual/physical folders.
   */
  private mergeNamespaceGrouped(
    entryMap: Map<string, SubDocument>,
    markdownFiles: string[],
    existingFolders: Set<string>,
    crId: string,
  ): void {
    // Remove dot-notation files from top-level (they're now in namespace folders)
    for (const file of markdownFiles) {
      if (parseNamespace(file)) {
        entryMap.delete(file)
      }
    }

    // Merge namespace-grouped virtual folders with scanned entries
    const namespaceGrouped = groupNamespacedFiles(markdownFiles, existingFolders, crId)

    for (const nsDoc of namespaceGrouped) {
      const existing = entryMap.get(nsDoc.name)

      if (!existing) {
        entryMap.set(nsDoc.name, nsDoc)
        continue
      }

      this.mergeEntryWithNamespace(entryMap, existing, nsDoc)
    }
  }

  /**
   * Merge a single namespace entry with an existing entry.
   */
  private mergeEntryWithNamespace(
    entryMap: Map<string, SubDocument>,
    existing: SubDocument,
    nsDoc: SubDocument,
  ): void {
    // Both files - keep existing (directory scan precedence)
    if (existing.kind === 'file' && nsDoc.kind === 'file') {
      return
    }

    // Replace file with namespace folder
    if (existing.kind === 'file' && nsDoc.kind === 'folder') {
      entryMap.set(nsDoc.name, nsDoc)
      return
    }

    // Both folders - merge children based on virtual state
    if (existing.kind === 'folder' && nsDoc.kind === 'folder') {
      this.mergeFolderEntries(existing, nsDoc)
    }
  }

  /**
   * Merge two folder entries, handling virtual vs physical state.
   * BR-12: Order is [Main] first, then dot-notation alpha, then /folder alpha.
   */
  private mergeFolderEntries(existing: SubDocument, nsDoc: SubDocument): void {
    // Existing is physical, nsDoc is virtual - merge children
    if (nsDoc.isVirtual && !existing.isVirtual) {
      existing.children = mergeAndSortChildren(nsDoc.children, existing.children)
      existing.isVirtual = false
      return
    }

    // Existing is virtual, nsDoc is physical - replace
    if (!nsDoc.isVirtual && existing.isVirtual) {
      // Can't modify map here, handled by caller
      return
    }

    // Both are physical - merge children (both may have dot-notation files)
    if (!nsDoc.isVirtual && !existing.isVirtual) {
      existing.children = mergeAndSortChildren(nsDoc.children, existing.children)
      existing.isVirtual = false
    }
    // Both virtual - keep existing
  }

  /**
   * Sort subdocuments: default order first, then alphabetically.
   */
  private sortSubDocuments(entryMap: Map<string, SubDocument>): SubDocument[] {
    const ordered: SubDocument[] = []
    const remaining: SubDocument[] = []

    // Extract ordered entries first
    for (const name of DEFAULT_SUBDOCUMENT_ORDER) {
      const entry = entryMap.get(name)
      if (entry) {
        ordered.push(entry)
        entryMap.delete(name)
      }
    }

    // Append remaining alphabetically
    const sortedNames = [...entryMap.keys()].sort()
    for (const name of sortedNames) {
      remaining.push(entryMap.get(name)!)
    }

    return [...ordered, ...remaining]
  }

  /**
   * Get individual sub-document content for a CR.
   * MDT-093: Enhanced with worktree support - resolves ticket location before retrieval.
   * MDT-138: Enhanced with namespace support - handles dot-notation files.
   */
  async getSubDocument(
    projectId: string,
    crId: string,
    subDocName: string,
  ): Promise<{ code: string, content: string, dateCreated: Date | null, lastModified: Date | null }> {
    const project = await this.getProject(projectId)
    const location = await this.resolveTicketLocation(project, crId)
    const filePath = this.resolveSubDocumentPath(location.ticketDir, subDocName)

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

  /**
   * Resolve a subdocument name to a concrete file path inside a resolved ticket directory.
   */
  private resolveSubDocumentPath(
    ticketDir: string,
    subDocName: string,
  ): string | null {
    const directFilePath = join(ticketDir, `${subDocName}.md`)
    if (existsSync(directFilePath)) {
      return directFilePath
    }

    const dotNotationFilePath = this.resolveDotNotationPath(ticketDir, subDocName)
    if (dotNotationFilePath) {
      return dotNotationFilePath
    }

    return this.findNamespacedSubDocumentPath(ticketDir, subDocName)
  }

  /**
   * Convert folder-like subdocument names to dot-notation file paths when applicable.
   */
  private resolveDotNotationPath(subdocDir: string, subDocName: string): string | null {
    if (!subDocName.includes('/')) {
      return null
    }

    const dotNotationPath = join(subdocDir, `${subDocName.replace(/\//g, '.')}.md`)
    return existsSync(dotNotationPath) ? dotNotationPath : null
  }

  /**
   * Find a dot-notation subdocument file by matching the requested final path segment.
   */
  private findNamespacedSubDocumentPath(subdocDir: string, subDocName: string): string | null {
    try {
      const entries = readdirSync(subdocDir)
      const lastSegment = subDocName.split('/').pop()!
      const dotNotationFile = entries.find(entry => {
        const name = entry.replace(/\.md$/, '')
        const parsed = parseNamespace(name)
        return parsed && parsed.subKey === lastSegment
      })

      return dotNotationFile ? join(subdocDir, dotNotationFile) : null
    }
    catch {
      return null
    }
  }

  /**
   * Create new CR in a project.
   */
  async createCR(projectId: string, crData: CRData): Promise<CreateCRResult> {
    const { title, type, priority, description } = crData

    if (!title || !type) {
      throw new Error('Title and type are required')
    }

    const project = await this.getProject(projectId)

    // Convert CRData to TicketData format
    const ticketData: TicketData = {
      title,
      type,
      priority: priority || 'Medium',
      content: description ? `## 1. Description\n\n${description}\n\n` : undefined,
    }

    // Use shared service to create CR
    const ticket = await this.sharedTicketService.createCR(project, type, ticketData)

    return {
      success: true,
      message: 'CR created successfully',
      crCode: ticket.code,
      filename: ticket.filePath.split('/').pop() || '',
      path: ticket.filePath,
    }
  }

  /**
   * Update CR partially (specific fields).
   */
  async updateCRPartial(projectId: string, crId: string, updates: CRPartialUpdates): Promise<UpdateCRResult> {
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No fields provided for update')
    }

    const project = await this.getProject(projectId)
    const updatedFields: string[] = []

    // Handle status update separately using the dedicated method
    if (updates.status !== undefined) {
      await this.sharedTicketService.updateCRStatus(project, crId, updates.status as CRStatus)
      updatedFields.push('status')
    }

    // Convert web server updates to TicketData format
    const ticketUpdates: Partial<TicketData> = {}

    // Map allowed fields (excluding status which is handled above)
    if (updates.priority !== undefined) {
      ticketUpdates.priority = updates.priority
    }
    if (updates.phaseEpic !== undefined) {
      ticketUpdates.phaseEpic = updates.phaseEpic
    }
    if (updates.assignee !== undefined) {
      ticketUpdates.assignee = updates.assignee
    }
    if (updates.relatedTickets !== undefined) {
      ticketUpdates.relatedTickets = updates.relatedTickets
    }
    if (updates.dependsOn !== undefined) {
      ticketUpdates.dependsOn = updates.dependsOn
    }
    if (updates.blocks !== undefined) {
      ticketUpdates.blocks = updates.blocks
    }

    // Use shared service to update attributes if there are any remaining fields
    if (Object.keys(ticketUpdates).length > 0) {
      await this.sharedTicketService.updateCRAttrs(project, crId, ticketUpdates)
      updatedFields.push(...Object.keys(ticketUpdates))
    }

    return {
      success: true,
      message: 'CR updated successfully',
      updatedFields,
      projectId,
      crId,
    }
  }

  /**
   * Delete CR from a project.
   */
  async deleteCR(projectId: string, crId: string): Promise<DeleteResult> {
    const project = await this.getProject(projectId)
    const cr = await this.sharedTicketService.getCR(project, crId)

    if (!cr) {
      throw new Error('CR not found')
    }

    await this.sharedTicketService.deleteCR(project, crId)

    return {
      success: true,
      message: 'CR deleted successfully',
      filename: cr.filePath.split('/').pop() || '',
    }
  }
}
