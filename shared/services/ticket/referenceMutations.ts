import type { AttrOperation } from './types.js'
import { TrackerConfigSchema, TrackerKind } from '@mdt/domain-contracts'
import { parseExternalIdentity, trackerEntries, validRepository } from '../externalReferences.js'

export function referenceOperands(value: string | string[]): string[] {
  if (Array.isArray(value))
    return value
  if (!value)
    return []
  if (value.trim().startsWith('[')) {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed) || !parsed.every(item => typeof item === 'string'))
      throw new Error('refs must be a string array')
    return parsed
  }
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function normalizeOperand(ref: string, trackers: unknown): string {
  const identity = parseExternalIdentity(ref)
  if (!/^#\d+$/.test(identity.key))
    return ref
  const config = TrackerConfigSchema.safeParse(trackerEntries(trackers)[identity.instance])
  if (!config.success || config.data.kind === TrackerKind.JIRA || !config.data.defaultRepo || !validRepository(config.data.defaultRepo))
    return ref
  return `${identity.instance}:${config.data.defaultRepo}${identity.key}`
}

export function mutateReferences(current: readonly string[], operation: AttrOperation, trackers: unknown): string[] {
  const supplied = referenceOperands(operation.value)
  if (operation.op === 'remove') {
    const removed = new Set(supplied)
    return current.filter(ref => !removed.has(ref))
  }
  const operands = [...new Set(supplied.map(ref => normalizeOperand(ref, trackers)))]
  if (operation.op === 'replace')
    return operands
  const existing = new Set(current)
  return [...current, ...operands.filter(ref => !existing.has(ref))]
}
