import type { ProjectedHeader } from '@mdt/domain-contracts'
import { CoordinationError } from '@mdt/domain-contracts'

const SHA256_PATTERN = /^[a-f0-9]{64}$/iu

export function requireText(
  value: unknown,
  field: string,
  requestId: string,
  maxLength = 500,
): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > maxLength) {
    throw new CoordinationError('invalid_request', { requestId, message: `invalid ${field}` })
  }
  return value
}

export function requireSha256(value: unknown, field: string, requestId: string): string {
  const text = requireText(value, field, requestId, 64)
  if (!SHA256_PATTERN.test(text)) {
    throw new CoordinationError('invalid_request', { requestId, message: `invalid ${field}` })
  }
  return text.toLowerCase()
}

export function requirePositiveSafeInteger(value: unknown, field: string, requestId: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new CoordinationError('invalid_request', { requestId, message: `invalid ${field}` })
  }
  return value as number
}

export function parseProjectedHeader(value: unknown, requestId: string): ProjectedHeader {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CoordinationError('invalid_request', { requestId, message: 'invalid header' })
  }
  const header = value as Record<string, unknown>
  return {
    code: requireText(header.code, 'header.code', requestId, 64),
    title: requireText(header.title, 'header.title', requestId, 500),
    status: requireText(header.status, 'header.status', requestId, 100),
    type: nullableText(header.type, 'header.type', requestId, 100),
    priority: nullableText(header.priority, 'header.priority', requestId, 100),
    assignee: nullableText(header.assignee, 'header.assignee', requestId, 320),
    date_created: nullableDate(header.date_created, 'header.date_created', requestId),
    last_modified: requireDate(header.last_modified, 'header.last_modified', requestId),
  }
}

function nullableText(
  value: unknown,
  field: string,
  requestId: string,
  maxLength: number,
): string | null {
  if (value === null)
    return null
  return requireText(value, field, requestId, maxLength)
}

function requireDate(value: unknown, field: string, requestId: string): string {
  const text = requireText(value, field, requestId, 64)
  if (Number.isNaN(Date.parse(text))) {
    throw new CoordinationError('invalid_request', { requestId, message: `invalid ${field}` })
  }
  return text
}

function nullableDate(value: unknown, field: string, requestId: string): string | null {
  if (value === null)
    return null
  return requireDate(value, field, requestId)
}
