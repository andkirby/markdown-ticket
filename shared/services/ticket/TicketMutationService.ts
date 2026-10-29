import type { Project } from '../../models/Project.js'
import type {
  Ticket,
  TicketData,
  TicketUpdateAttrs,
} from '../../models/Ticket.js'
import type { CRStatus } from '../../models/Types.js'
import type { RuleTicket } from '../epicRules.js'
import type { ProjectService } from '../ProjectService.js'
import type { TicketLocationResolver } from '../ticket/TicketLocationResolver.js'
import type {
  AttrOperation,
  TicketWriteResult,
  UpdateTicketAttributesRequest,
} from '../ticket/types.js'
import type { TicketQueryService } from './TicketQueryService.js'
import type { TicketRepository } from './TicketRepository.js'
import * as path from 'node:path'
import {
  CRStatus as CRStatusEnum,
  TICKET_KEY_INPUT_PATTERN,
} from '@mdt/domain-contracts'
import {
  TICKET_UPDATE_ALLOWED_ATTRS,
} from '../../models/Ticket.js'
import { CRLevel } from '../../models/Types.js'

import {
  assertEpicClosable,
  EpicRuleError,
  resolvePhaseEpicTarget,

} from '../epicRules.js'
import { ServiceError } from '../ServiceError.js'
import { assertNotDerivedField } from '../ticket/derivedFields.js'
import { writeReferenceFrontmatter } from '../ticket/referenceFrontmatter.js'

import { mutateReferences, referenceOperands } from '../ticket/referenceMutations.js'
import { TicketIdentityConflictError } from '../ticket/TicketIdentityService.js'

const RELATION_FIELDS = ['relatedTickets', 'dependsOn', 'blocks', 'refs'] as const

function normalizeValue(value: string | string[]): string | string[] {
  if (Array.isArray(value)) {
    return value.map(v => v.trim())
  }
  return value.trim()
}

export class TicketMutationService {
  constructor(private projectService: Pick<ProjectService, 'getProject' | 'getProjectConfig' | 'getProjectByCodeOrId'>, private query: Pick<TicketQueryService, 'getCR'>, private ticketLocationResolver: Pick<TicketLocationResolver, 'resolve'>, private repository: TicketRepository, private publish: (project: Project, previous: Ticket, next: Ticket, lifecycle: 'active' | 'deleted') => Promise<void>) {}
  async updateTicketAttributes(
    request: UpdateTicketAttributesRequest,
  ): Promise<TicketWriteResult<AttrOperation[]>> {
    const project = await this.requireProject(request.projectRef)
    const currentTicket = await this.query.getCR(project, request.ticketKey)

    if (!currentTicket) {
      throw ServiceError.ticketNotFound(request.ticketKey)
    }

    const normalizedOperations = request.operations.map(operation => ({
      ...operation,
      value: operation.field === 'refs' ? operation.value : normalizeValue(operation.value),
    }))

    this.validateAttrOperations(normalizedOperations)

    const changedFields: string[] = []
    const updates: Record<string, string | string[]> = {}

    for (const operation of normalizedOperations) {
      if (operation.field === 'refs') {
        const current = updates.refs ?? currentTicket.refs ?? []
        updates.refs = mutateReferences(referenceOperands(current), operation, this.referenceTrackers(project))
        if (JSON.stringify(current) !== JSON.stringify(updates.refs))
          changedFields.push('refs')
        continue
      }
      // Resolve the effective current value for this field: prefer the
      // accumulated in-batch state so multiple ops on the same field compose
      // (e.g. `related+=A related+=B` must yield [A,B], not just [B]).
      // Falls back to the disk snapshot on first touch.
      const resolveRelationValue = (field: string): string[] => {
        const pending = updates[field]
        if (Array.isArray(pending))
          return pending
        if (typeof pending === 'string' && pending) {
          return pending
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
        }
        return this.getRelationField(currentTicket, field)
      }

      if (operation.op === 'replace') {
        if (this.isRelationField(operation.field)) {
          const nextValue = Array.isArray(operation.value)
            ? operation.value
            : operation.value
              ? [operation.value]
              : []
          const currentRelationValue = resolveRelationValue(operation.field)

          if (
            JSON.stringify(currentRelationValue) !== JSON.stringify(nextValue)
          ) {
            updates[operation.field] = nextValue
            changedFields.push(operation.field)
          }
          continue
        }

        const currentValue = this.getTicketField(
          currentTicket,
          operation.field,
        )
        const nextValue = Array.isArray(operation.value)
          ? operation.value.join(',')
          : operation.value
        if (currentValue !== nextValue) {
          updates[operation.field] = nextValue
          changedFields.push(operation.field)
        }
        continue
      }

      const currentRelationValue = resolveRelationValue(operation.field)
      const normalizedValues = Array.isArray(operation.value)
        ? operation.value
        : [operation.value]

      if (operation.op === 'add') {
        const nextValue = [
          ...new Set([...currentRelationValue, ...normalizedValues]),
        ]
        if (
          JSON.stringify(currentRelationValue) !== JSON.stringify(nextValue)
        ) {
          updates[operation.field] = nextValue
          changedFields.push(operation.field)
        }
        continue
      }

      const valuesToRemove = new Set(normalizedValues)
      const nextValue = currentRelationValue.filter(
        value => !valuesToRemove.has(value),
      )
      if (JSON.stringify(currentRelationValue) !== JSON.stringify(nextValue)) {
        updates[operation.field] = nextValue
        changedFields.push(operation.field)
      }
    }

    if (Object.keys(updates).length > 0) {
      const persistUpdates = Object.fromEntries(
        Object.entries(updates).map(([field, value]) => [
          field,
          Array.isArray(value) && field !== 'refs' ? value.join(',') : value,
        ]),
      ) as Partial<TicketData>

      await this.persistCRAttrs(project, request.ticketKey, persistUpdates, true)
    }

    const updatedTicket = await this.query.getCR(project, request.ticketKey)
    if (!updatedTicket) {
      throw ServiceError.persistenceError(
        `Ticket ${request.ticketKey} disappeared after update`,
      )
    }

    return {
      ticket: updatedTicket,
      target: {
        projectId: project.id,
        projectCode: project.project.code,
        ticketKey: request.ticketKey,
      },
      normalizedInputs: normalizedOperations,
      changedFields,
      path: updatedTicket.filePath,
    }
  }

  async updateCRStatus(
    project: Project,
    key: string,
    status: CRStatus,
  ): Promise<boolean> {
    try {
      const cr = await this.query.getCR(project, key)
      if (!cr) {
        throw new Error(`CR '${key}' not found in project '${project.id}'`)
      }

      // MDT-205: epic close guard — epics to Implemented need all children terminal.
      await this.assertEpicCloseAllowed(project, cr, status)

      // Note: Status transition validation removed to allow free movement
      // This accommodates legacy/unknown status values in existing tickets

      // Read current file content
      const content = await this.repository.readContent(cr.filePath)

      // Update status in YAML frontmatter
      const updatedContent = this.repository.updateField(content, 'status', status)
      // lastModified will be automatically set from file modification time

      // Write back to file
      await this.repository.writeContent(cr.filePath, updatedContent)
      const updated = await this.query.getCR(project, key)
      if (updated) {
        await this.publish(
          project,
          cr,
          updated,
          'active',
        )
      }

      return true
    }
    catch (error) {
      // MDT-205: preserve typed domain errors (epic close guard) so callers can
      // map epicErrorCode to actionable user-facing text across surfaces.
      if (error instanceof ServiceError || error instanceof TicketIdentityConflictError) {
        throw error
      }
      // Enhanced error handling with specific failure types
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(
            `Failed to update CR '${key}': File not found or deleted`,
          )
        }
        if (
          error.message.includes('EACCES')
          || error.message.includes('EPERM')
        ) {
          throw new Error(
            `Failed to update CR '${key}': Permission denied. Check file permissions`,
          )
        }
        if (
          error.message.includes('EBUSY')
          || error.message.includes('EMFILE')
        ) {
          throw new Error(
            `Failed to update CR '${key}': File locked or in use by another process`,
          )
        }
        if (error.message.includes('Invalid status transition')) {
          throw error // Re-throw validation errors as-is
        }
        if (error.message.includes('not found')) {
          throw error // Re-throw CR not found errors as-is
        }
        // Generic file system or parsing errors
        throw new Error(`Failed to update CR '${key}': ${error.message}`)
      }
      throw new Error(`Failed to update CR '${key}': Unknown error occurred`)
    }
  }

  async updateCRAttrs(
    project: Project,
    key: string,
    attributes: Partial<TicketData>,
  ): Promise<boolean> {
    return this.persistCRAttrs(project, key, attributes, false)
  }

  async updateCRPartial(
    project: Project,
    key: string,
    updates: Partial<TicketData> & { status?: CRStatus },
  ): Promise<boolean> {
    const { status, ...attributes } = updates
    if (status === undefined && Object.keys(attributes).length === 0)
      return true
    if (status !== undefined && Object.keys(attributes).length === 0)
      return this.updateCRStatus(project, key, status)
    return this.persistCRAttrs(project, key, attributes, false, status)
  }

  private async persistCRAttrs(project: Project, key: string, attributes: Partial<TicketData>, preserveRefs: boolean, status?: CRStatus): Promise<boolean> {
    try {
      const cr = await this.query.getCR(project, key)
      if (!cr) {
        throw new Error(`CR '${key}' not found in project '${project.id}'`)
      }

      // Validate that only allowed attributes are being updated
      const invalidAttributes = Object.keys(attributes).filter(
        field =>
          !TICKET_UPDATE_ALLOWED_ATTRS.has(field as keyof TicketUpdateAttrs),
      )

      if (invalidAttributes.length > 0) {
        const allowed = Array.from(TICKET_UPDATE_ALLOWED_ATTRS).join(', ')
        throw new Error(
          `Invalid attributes: ${invalidAttributes.join(', ')}. `
          + `Allowed attributes for update_cr_attrs are: ${allowed}`,
        )
      }

      // MDT-205: validate a key-shaped phaseEpic target before persisting.
      if ('phaseEpic' in attributes) {
        await this.assertPhaseEpicTarget(project, attributes.phaseEpic)
      }
      if (status !== undefined) {
        await this.assertEpicCloseAllowed(project, cr, status)
        const candidate = attributes.level === undefined ? cr : { ...cr, level: attributes.level }
        if (candidate !== cr)
          await this.assertEpicCloseAllowed(project, candidate, status)
      }

      // Read current file content
      const content = await this.repository.readContent(cr.filePath)
      let updatedContent = content
      if (status !== undefined)
        updatedContent = this.repository.updateField(updatedContent, 'status', status)

      // Update each attribute in YAML frontmatter
      for (const [field, value] of Object.entries(attributes)) {
        if (value !== undefined && value !== null) {
          if (field === 'refs') {
            const operands = referenceOperands(value)
            const refs = preserveRefs ? operands : mutateReferences(cr.refs ?? [], { field, op: 'replace', value: operands }, this.referenceTrackers(project))
            updatedContent = writeReferenceFrontmatter(updatedContent, refs)
            continue
          }
          // Convert arrays to comma-separated strings for YAML
          const stringValue = Array.isArray(value)
            ? value.join(',')
            : String(value)
          updatedContent = this.repository.updateField(
            updatedContent,
            field,
            stringValue,
          )
        }
      }

      // Write back to file
      await this.repository.writeContent(cr.filePath, updatedContent)
      const updated = await this.query.getCR(project, key)
      if (updated) {
        await this.publish(
          project,
          cr,
          updated,
          'active',
        )
      }

      return true
    }
    catch (error) {
      // MDT-205: preserve typed domain errors (phaseEpic target validation) so
      // callers can map epicErrorCode to actionable user-facing text.
      if (error instanceof ServiceError || error instanceof TicketIdentityConflictError) {
        throw error
      }
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(
            `Failed to update CR '${key}': File not found or deleted`,
          )
        }
        if (
          error.message.includes('EACCES')
          || error.message.includes('EPERM')
        ) {
          throw new Error(
            `Failed to update CR '${key}': Permission denied. Check file permissions`,
          )
        }
        if (status !== undefined && (error.message.includes('EBUSY') || error.message.includes('EMFILE'))) {
          throw new Error(`Failed to update CR '${key}': File locked or in use by another process`)
        }
        if (error.message.includes('not found')) {
          throw error // Re-throw CR not found errors as-is
        }
        throw new Error(`Failed to update CR '${key}': ${error.message}`)
      }
      throw new Error(`Failed to update CR '${key}': Unknown error occurred`)
    }
  }

  private async resolvePhaseEpicTargetTicket(
    project: Project,
    value: string,
  ): Promise<Ticket | null> {
    const match = value.trim().match(TICKET_KEY_INPUT_PATTERN)
    if (!match) {
      return null
    }
    const targetCode = match[0].toUpperCase()
    const targetProjectCode = match[1].toUpperCase()
    const activeProjectCode = project.project.code?.toUpperCase()

    // Same project: resolve within the active project.
    if (!activeProjectCode || targetProjectCode === activeProjectCode) {
      return this.query.getCR(project, targetCode)
    }

    // Cross-project key (Edge-1): locate the target project by code and look there.
    const targetProject
      = await this.projectService.getProjectByCodeOrId(targetProjectCode)
    if (!targetProject) {
      return null
    }
    return this.query.getCR(targetProject, targetCode)
  }

  async assertPhaseEpicTarget(
    project: Project,
    value: string | undefined | null,
  ): Promise<void> {
    const resolution = resolvePhaseEpicTarget(value, undefined)
    // ok (clear) and skipped (free text) need no lookup.
    if (resolution.outcome === 'ok' || resolution.outcome === 'skipped') {
      return
    }

    const target = await this.resolvePhaseEpicTargetTicket(
      project,
      (value ?? '').trim(),
    )
    const finalResolution = resolvePhaseEpicTarget(value, target ?? null)
    if (finalResolution.outcome === 'reject') {
      throw ServiceError.invalidOperation(finalResolution.message, {
        epicErrorCode: finalResolution.code,
        target: (value ?? '').trim(),
      })
    }
  }

  private async assertEpicCloseAllowed(
    project: Project,
    epic: Ticket,
    newStatus: string,
  ): Promise<void> {
    if (epic.level !== CRLevel.EPIC || newStatus !== CRStatusEnum.IMPLEMENTED) {
      return
    }
    const location = await this.ticketLocationResolver.resolve(
      project,
      epic.code,
    )
    const fullCRPath = path.resolve(location.projectRoot, location.ticketsPath)
    const allTickets = await this.repository.scan(
      fullCRPath,
      location.projectRoot,
    )
    const children: RuleTicket[] = allTickets.filter(
      t =>
        t.phaseEpic && t.phaseEpic.toUpperCase() === epic.code.toUpperCase(),
    )
    try {
      assertEpicClosable(
        { code: epic.code, level: epic.level, status: epic.status },
        children,
      )
    }
    catch (e) {
      if (e instanceof EpicRuleError) {
        throw ServiceError.invalidOperation(e.message, {
          epicErrorCode: e.code,
          ...(e.details as Record<string, unknown>),
        })
      }
      throw e
    }
  }

  private isRelationField(field: string): boolean {
    return RELATION_FIELDS.includes(field as (typeof RELATION_FIELDS)[number])
  }

  private validateAttrOperations(operations: AttrOperation[]): void {
    for (const operation of operations) {
      // MDT-189: `blocks` is a derived field (inverse of dependsOn) and may
      // not be written directly. The rejection surfaces as INVALID_OPERATION,
      // which the CLI attr command passes through transparently. Edit
      // dependsOn instead; the migration + derivation hook keeps blocks in
      // sync. See architecture.md D3 and bdd.md S14.
      assertNotDerivedField(operation.field, operation.op)
      if (
        (operation.op === 'add' || operation.op === 'remove')
        && !this.isRelationField(operation.field)
      ) {
        throw ServiceError.invalidOperation(
          `Cannot use '${operation.op}' operation on non-relation field '${operation.field}'. Only relation fields (${RELATION_FIELDS.join(', ')}) support add/remove operations.`,
          { field: operation.field, op: operation.op },
        )
      }
    }
  }

  private getRelationField(ticket: Ticket, field: string): string[] {
    const value = (ticket as unknown as Record<string, unknown>)[field]
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string')
    }
    if (typeof value === 'string' && value) {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    }
    return []
  }

  private getTicketField(ticket: Ticket, field: string): string {
    const value = (ticket as unknown as Record<string, unknown>)[field]
    if (typeof value === 'string') {
      return value
    }
    if (Array.isArray(value)) {
      return value.join(',')
    }
    return ''
  }

  private async requireProject(projectRef: string): Promise<Project> {
    const result = await this.projectService.getProject(projectRef)
    return result.data
  }

  private referenceTrackers(project: Project): unknown {
    return this.projectService.getProjectConfig(project.project.path)?.trackers
  }
}
