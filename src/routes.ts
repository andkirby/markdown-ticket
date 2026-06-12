/**
 * MDT-184: Single source of truth for route definitions.
 *
 * This module owns the route pattern constants used by React Router's
 * `<Route path={...}>` and provides type-safe builder functions that
 * derive paths from those constants via `generatePath`.
 *
 * Pattern constants and builders are coupled by design — if a pattern
 * changes, the builder that uses it will reflect the change automatically.
 * No hardcoded `/prj/` string duplication.
 */

import { generatePath } from 'react-router-dom'

// ── Pattern constants (used by <Route path={...}> in App.tsx) ─────────────

export const ROUTE_PROJECT = '/prj/:projectCode' as const
export const ROUTE_PROJECT_LIST = '/prj/:projectCode/list' as const
export const ROUTE_PROJECT_DOCUMENTS = '/prj/:projectCode/documents' as const
export const ROUTE_PROJECT_DOCUMENTS_WILDCARD = '/prj/:projectCode/documents/*' as const
export const ROUTE_TICKET = '/prj/:projectCode/ticket/:ticketKey' as const
export const ROUTE_TICKET_SUBDOC = '/prj/:projectCode/ticket/:ticketKey/*' as const
export const ROUTE_DIRECT_TICKET = '/ticket/:ticketKey' as const
export const ROUTE_DIRECT_TICKET_SUBDOC = '/ticket/:ticketKey/*' as const

// ── Builders (derive from pattern constants via generatePath) ─────────────

export function buildProjectPath(projectCode: string, view: 'board' | 'list' | 'documents' = 'board'): string {
  switch (view) {
    case 'list':
      return generatePath(ROUTE_PROJECT_LIST, { projectCode })
    case 'documents':
      return generatePath(ROUTE_PROJECT_DOCUMENTS, { projectCode })
    default:
      return generatePath(ROUTE_PROJECT, { projectCode })
  }
}

export function buildTicketPath(projectCode: string, ticketKey: string, anchor?: string): string {
  if (!projectCode?.trim())
    throw new Error('Project code is required')
  if (!ticketKey?.trim())
    throw new Error('Ticket key is required')
  return generatePath(ROUTE_TICKET, { projectCode, ticketKey }) + (anchor || '')
}

export function buildTicketSubDocPath(projectCode: string, ticketKey: string, subDocPath: string, anchor?: string): string {
  if (!projectCode?.trim())
    throw new Error('Project code is required')
  if (!ticketKey?.trim())
    throw new Error('Ticket key is required')
  return `${generatePath(ROUTE_TICKET, { projectCode, ticketKey })}/${subDocPath}${anchor || ''}`
}

export function buildDocumentPath(projectCode: string, documentPath: string): string {
  if (!projectCode?.trim())
    throw new Error('Project code is required')
  if (!documentPath?.trim())
    throw new Error('Document path is required')
  return `${generatePath(ROUTE_PROJECT_DOCUMENTS, { projectCode })}?file=${encodeURIComponent(documentPath)}`
}

export function buildDocumentPathWithAnchor(projectCode: string, documentPath: string, anchor?: string): string {
  return buildDocumentPath(projectCode, documentPath) + (anchor || '')
}

export function buildDirectTicketPath(ticketKey: string): string {
  return generatePath(ROUTE_DIRECT_TICKET, { ticketKey })
}

export function buildDirectTicketSubDocPath(ticketKey: string, subDocPath: string): string {
  return `${generatePath(ROUTE_DIRECT_TICKET, { ticketKey })}/${subDocPath}`
}
