import type { Project } from '../../models/Project.js'
import type {
  Ticket,
  TicketData,
} from '../../models/Ticket.js'
import type { ProjectService } from '../ProjectService.js'
import type { TemplateService } from '../TemplateService.js'

import type { TicketIdentityInventory } from './TicketIdentityService.js'
import type { TicketRepository } from './TicketRepository.js'
import type { ResolvedTicketLocation } from './types.js'
import { readFile, realpath } from 'node:fs/promises'
import * as path from 'node:path'
import {
  CoordinatorError,
} from '@mdt/domain-contracts'
import fs from 'fs-extra'
import {
  arrayToString,
} from '../../models/Ticket.js'
import { DEFAULTS } from '../../utils/constants.js'

import { scanTicketIdentities, TicketIdentityConflictError } from '../ticket/TicketIdentityService.js'

export class MarkdownTicketRepository implements TicketRepository {
  constructor(private config: Pick<ProjectService, 'getProjectConfig'>, private templateService: Pick<TemplateService, 'getTemplate'>) {}
  inventory(project: Project) {
    const config = this.config.getProjectConfig(project.project.path)
    return scanTicketIdentities(project.project.path, config?.project?.ticketsPath ?? project.project.ticketsPath ?? DEFAULTS.TICKETS_PATH, project.project.code)
  }

  async readIdentified(inventory: TicketIdentityInventory, key: string, location: ResolvedTicketLocation): Promise<Ticket | null> {
    const resolvedRoot = await realpath(location.projectRoot)
    const resolvedDirectory = await realpath(path.resolve(location.projectRoot, location.ticketsPath))
    const candidate = inventory.files.find(file => file.code.toUpperCase() === key.toUpperCase()
      && (path.dirname(file.absolutePath) === resolvedDirectory || path.dirname(path.dirname(file.absolutePath)) === resolvedDirectory))
    if (!candidate)
      return null
    const { MarkdownService } = await import('../MarkdownService.js')
    const logicalPath = path.join(location.projectRoot, path.relative(resolvedRoot, candidate.absolutePath))
    const targetCR = await MarkdownService.parseMarkdownFile(logicalPath, location.projectRoot)

    if (!targetCR) {
      return null
    }
    if (targetCR.code.toUpperCase() !== key.toUpperCase() || targetCR.creationId !== candidate.creationId)
      throw new TicketIdentityConflictError(key, [candidate.relativePath])

    return targetCR
  }

  readContent(filePath: string): Promise<string> { return readFile(filePath, 'utf-8') }
  async writeContent(filePath: string, content: string): Promise<void> { await fs.outputFile(filePath, content, 'utf-8') }
  async remove(filePath: string): Promise<void> { await fs.remove(filePath) }
  async scan(directory: string, root: string): Promise<Ticket[]> {
    const { MarkdownService } = await import('../MarkdownService.js')
    return MarkdownService.scanMarkdownFiles(directory, root)
  }

  async create(ticket: Ticket, data: TicketData, exclusive: boolean, onBodySource?: (source: 'generated' | 'supplied') => void): Promise<Ticket> {
    const markdownContent = this.format(ticket, data, onBodySource)
    ticket.content = markdownContent
    if (exclusive) {
      try {
        await fs.outputFile(ticket.filePath, markdownContent, {
          encoding: 'utf8',
          flag: 'wx',
        })
      }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error
        }
        const existing = await readFile(ticket.filePath, 'utf8')
        if (existing !== markdownContent) {
          throw new CoordinatorError('reservation_state_conflict', {
            message: `reserved ticket path already exists with different content: ${path.basename(ticket.filePath)}`,
          })
        }
      }
    }
    else {
      await fs.outputFile(ticket.filePath, markdownContent, 'utf8')
    }
    // The projected header must use the durable file timestamp, not the
    // in-memory creation timestamp. Later edits read `lastModified` from the
    // same filesystem metadata; using different clocks would make the first
    // legitimate projection update look like a divergence.
    ticket.lastModified = (await fs.stat(ticket.filePath)).mtime

    return ticket
  }

  async rename(ticket: Ticket, key: string, title: string, newSlug?: string): Promise<void> {
    const content = await readFile(ticket.filePath, 'utf-8')

    // Replace first H1 with new title
    const updatedContent = content.replace(
      /^#\s+(?:\S.*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF])$/m,
      `# ${title}`,
    )

    // Determine new slug and filename
    const slug = newSlug ?? this.slug(title)
    const dir = path.dirname(ticket.filePath)
    const newFilename = `${key}-${slug}.md`
    const newFilePath = path.join(dir, newFilename)

    // Write content (to old or new path)
    if (newFilePath !== ticket.filePath) {
      // Write to new path then remove old
      await fs.outputFile(newFilePath, updatedContent, 'utf-8')
      await fs.remove(ticket.filePath)
    }
    else {
      await fs.outputFile(ticket.filePath, updatedContent, 'utf-8')
    }
  }

  format(
    ticket: Ticket,
    data: TicketData,
    onBodySource?: (source: 'generated' | 'supplied') => void,
  ): string {
    const sections: string[] = []

    // YAML frontmatter - only mandatory fields + optional fields with values
    sections.push('---')
    sections.push(`code: ${ticket.code}`)
    if (ticket.refs !== undefined)
      sections.push(`refs: ${JSON.stringify(ticket.refs)}`)
    if (ticket.creationId)
      sections.push(`creationId: ${ticket.creationId}`)
    sections.push(`status: ${ticket.status}`)
    sections.push(
      `dateCreated: ${ticket.dateCreated?.toISOString() || new Date().toISOString()}`,
    )
    sections.push(`type: ${ticket.type}`)
    sections.push(`priority: ${ticket.priority}`)
    if (ticket.level)
      sections.push(`level: ${ticket.level}`)

    // Optional fields - only include if they have values
    if (ticket.phaseEpic)
      sections.push(`phaseEpic: ${ticket.phaseEpic}`)
    if (ticket.relatedTickets && ticket.relatedTickets.length > 0)
      sections.push(`relatedTickets: ${arrayToString(ticket.relatedTickets)}`)
    if (ticket.dependsOn && ticket.dependsOn.length > 0)
      sections.push(`dependsOn: ${arrayToString(ticket.dependsOn)}`)
    if (ticket.blocks && ticket.blocks.length > 0)
      sections.push(`blocks: ${arrayToString(ticket.blocks)}`)
    if (ticket.assignee)
      sections.push(`assignee: ${ticket.assignee}`)
    if (ticket.component)
      sections.push(`component: ${ticket.component}`)
    if (ticket.implementationDate) {
      sections.push(
        `implementationDate: ${ticket.implementationDate.toISOString()}`,
      )
    }
    if (ticket.implementationNotes)
      sections.push(`implementationNotes: ${ticket.implementationNotes}`)

    sections.push('---')
    sections.push('')

    // Content
    if (data.content?.trim()) {
      onBodySource?.('supplied')
      // MDT-064: CLI title is always the authoritative H1.
      // Strip any leading H1 from content to prevent content from overriding the CLI title.
      const strippedContent = data.content.replace(/^#\s+.+\n*/m, '')
      sections.push(`# ${ticket.title}`)
      sections.push('')
      sections.push(strippedContent.trim())
    }
    else {
      onBodySource?.('generated')
      // Use type-specific template from TemplateService
      const template = this.templateService.getTemplate(ticket.type)

      // Replace placeholder title in template
      const templateContent = template.template
        .replace('[Research Title]', ticket.title)
        .replace('[Bug Title]', ticket.title)
        .replace('[Feature Title]', ticket.title)
        .replace('[Architecture Title]', ticket.title)
        .replace('[Technical Debt Title]', ticket.title)
        .replace('[Documentation Title]', ticket.title)

      // If template already has H1, use it as-is
      if (templateContent.trim().startsWith('# ')) {
        sections.push(templateContent)
      }
      else {
        // Add H1 if template doesn't have one
        sections.push(`# ${ticket.title}`)
        sections.push('')
        sections.push(templateContent)
      }
    }

    return sections.join('\n')
  }

  updateField(
    content: string,
    field: string,
    value: string,
  ): string {
    const lines = content.split('\n')

    // Find the YAML frontmatter section
    let inFrontmatter = false
    let frontmatterStart = -1
    let frontmatterEnd = -1

    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true
          frontmatterStart = i
        }
        else {
          frontmatterEnd = i
          break
        }
      }
      else if (inFrontmatter && lines[i]?.startsWith(`${field}:`)) {
        // Update existing field
        lines[i] = `${field}: ${value}`
        return lines.join('\n')
      }
    }

    // If field doesn't exist, add it before the closing ---
    if (frontmatterStart !== -1 && frontmatterEnd !== -1) {
      lines.splice(frontmatterEnd, 0, `${field}: ${value}`)
      return lines.join('\n')
    }

    return content
  }

  slug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  }
}
