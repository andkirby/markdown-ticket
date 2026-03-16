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
   * MDT-093: Enhanced with worktree support - resolves path for sub-document discovery.
   * MDT-138: Enhanced with namespace parsing - groups dot-notation files into virtual folders.
   */
  private async discoverSubDocuments(project: Project, crId: string): Promise<SubDocument[]> {
    const ticketsPath = project.project.ticketsPath ?? 'docs/CRs'
    const projectCode = project.project.code

    // MDT-093: Resolve path using WorktreeService for worktree support
    // If project code is undefined, skip worktree resolution and use main project path
    const resolvedPath = projectCode
      ? await this.worktreeService.resolvePath(
          project.project.path,
          crId,
          ticketsPath,
          projectCode,
        )
      : project.project.path

    const subdocDir = join(resolvedPath, ticketsPath, crId)

    if (!existsSync(subdocDir)) {
      return []
    }

    let entries: string[]
    try {
      entries = readdirSync(subdocDir)
    }
    catch {
      return []
    }

    const result: SubDocument[] = []
    const unordered: SubDocument[] = []

    const nameOf = (entry: string): string => entry.replace(/\.md$/, '')
    const isMarkdownFile = (entry: string): boolean => entry.endsWith('.md')

    // Collect physical folders for namespace grouping
    const existingFolders = new Set<string>()

    const discoverChildren = (dirPath: string, folderPath: string): SubDocument[] => {
      let childEntries: string[]
      try {
        childEntries = readdirSync(dirPath)
      }
      catch {
        return []
      }
      return childEntries
        .filter(e => isMarkdownFile(e))
        .sort()
        .map(e => ({
          name: nameOf(e),
          kind: 'file' as const,
          children: [],
          filePath: `${crId}/${folderPath}/${e}`,
        }))
    }

    const buildEntry = (entry: string): SubDocument | null => {
      const fullPath = join(subdocDir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        existingFolders.add(entry) // Track physical folders
        return {
          name: entry,
          kind: 'folder',
          children: discoverChildren(fullPath, entry),
          filePath: `${crId}/${entry}`,
        }
      }
      if (isMarkdownFile(entry)) {
        return { name: nameOf(entry), kind: 'file', children: [], filePath: `${crId}/${entry}` }
      }
      return null
    }

    const entryMap = new Map<string, SubDocument>()
    const markdownFiles: string[] = []

    for (const entry of entries) {
      const doc = buildEntry(entry)
      if (doc) {
        if (doc.kind === 'file') {
          markdownFiles.push(doc.name)
        }
        entryMap.set(doc.name, doc)
      }
    }

    // MDT-138: Apply namespace grouping to merge dot-notation files into virtual folders
    const namespaceGrouped = groupNamespacedFiles(markdownFiles, existingFolders, crId)

    // MDT-138: Remove dot-notation files from entryMap since they are now in namespace folders
    // This prevents duplicate entries (e.g., 'bdd.trace' appearing both as top-level file
    // and as child inside 'bdd' folder)
    for (const file of markdownFiles) {
      const parsed = parseNamespace(file)
      if (parsed) {
        // This file is now inside a namespace folder, remove from top-level entryMap
        entryMap.delete(file)
      }
    }

    // Merge namespace-grouped entries with entryMap, giving precedence to namespace folders
    for (const nsDoc of namespaceGrouped) {
      const existing = entryMap.get(nsDoc.name)
      if (!existing) {
        // No existing entry, add the namespace-grouped one
        entryMap.set(nsDoc.name, nsDoc)
      }
      else if (existing.kind === 'file' && nsDoc.kind === 'file') {
        // Both are files - keep existing (directory scan takes precedence)
        // Don't replace with namespace-grouped version
      }
      else if (existing.kind === 'file' && nsDoc.kind === 'folder') {
        // Replace file entry with namespace folder (e.g., architecture.md → architecture/ virtual folder)
        entryMap.set(nsDoc.name, nsDoc)
      }
      else if (existing.kind === 'folder' && nsDoc.kind === 'folder') {
        // Both are folders - merge children
        // BR-12: Order is [Main] first, then dot-notation alpha, then /folder alpha
        if (nsDoc.isVirtual && !existing.isVirtual) {
          // Physical folder exists, merge children from virtual folder
          // Note: physical children get / prefix to distinguish from virtual children with same name
          const physicalChildren = existing.children.map(child => ({
            ...child,
            name: `/${child.name}`,
          }))

          // Merge and sort according to BR-12
          existing.children = mergeAndSortChildren(nsDoc.children, physicalChildren)
          existing.isVirtual = false
        }
        else if (!nsDoc.isVirtual && existing.isVirtual) {
          // Existing is virtual, replace with non-virtual version
          entryMap.set(nsDoc.name, nsDoc)
        }
        else if (!nsDoc.isVirtual && !existing.isVirtual) {
          // Both are non-virtual (physical) folders - this happens when groupNamespacedFiles
          // returns a folder for dot-notation files that also has a physical folder on disk
          // Note: physical children get / prefix to distinguish from virtual children with same name
          const physicalChildren = existing.children.map(child => ({
            ...child,
            name: `/${child.name}`,
          }))

          // Merge and sort according to BR-12
          existing.children = mergeAndSortChildren(nsDoc.children, physicalChildren)
          existing.isVirtual = false
        }
        // If both are virtual, keep existing
      }
    }

    // Add ordered entries first
    for (const name of DEFAULT_SUBDOCUMENT_ORDER) {
      if (entryMap.has(name)) {
        result.push(entryMap.get(name)!)
        entryMap.delete(name)
      }
    }

    // Append remaining entries alphabetically
    for (const name of [...entryMap.keys()].sort()) {
      unordered.push(entryMap.get(name)!)
    }

    return [...result, ...unordered]
  }

  /**
   * Get individual sub-document content for a CR.
   * MDT-093: Enhanced with worktree support - resolves path for sub-document retrieval.
   * MDT-138: Enhanced with namespace support - handles dot-notation files.
   */
  async getSubDocument(
    projectId: string,
    crId: string,
    subDocName: string,
  ): Promise<{ code: string, content: string, dateCreated: Date | null, lastModified: Date | null }> {
    const project = await this.getProject(projectId)
    const ticketsPath = project.project.ticketsPath ?? 'docs/CRs'
    const projectCode = project.project.code

    // MDT-093: Resolve path using WorktreeService for worktree support
    // If project code is undefined, skip worktree resolution and use main project path
    const resolvedPath = projectCode
      ? await this.worktreeService.resolvePath(
          project.project.path,
          crId,
          ticketsPath,
          projectCode,
        )
      : project.project.path

    const subdocDir = join(resolvedPath, ticketsPath, crId)

    // First, try to find the file directly (handles folder-based paths like "bdd/scenario-1")
    let filePath = join(subdocDir, `${subDocName}.md`)

    // MDT-138: If not found, try to convert to dot-notation file
    if (!existsSync(filePath)) {
      // Check if the path contains a slash (folder-based path)
      const slashIndex = subDocName.indexOf('/')
      if (slashIndex !== -1) {
        // Convert "bdd/scenario-1" to "bdd.scenario-1.md"
        const dotNotationPath = subDocName.replace(/\//g, '.')
        filePath = join(subdocDir, `${dotNotationPath}.md`)
      }
    }

    // MDT-138: If still not found, try to find a dot-notation file by searching the directory
    if (!existsSync(filePath)) {
      try {
        const entries = readdirSync(subdocDir)
        // Look for a file matching the subDocName pattern
        // For "scenario-1", look for "*.scenario-1.md"
        const lastSegment = subDocName.split('/').pop()!
        const dotNotationFile = entries.find(entry => {
          const name = entry.replace(/\.md$/, '')
          const parsed = parseNamespace(name)
          return parsed && parsed.subKey === lastSegment
        })

        if (dotNotationFile) {
          filePath = join(subdocDir, dotNotationFile)
        }
      }
      catch {
        // Directory read failed, filePath remains not found
      }
    }

    if (!existsSync(filePath)) {
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
