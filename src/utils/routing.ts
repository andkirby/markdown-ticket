import type { Project } from '@mdt/shared/models/Project'
import type { Ticket } from '../types'
import { formatCrKey } from '@mdt/shared/utils/keyNormalizer'
import { authFetch } from '../auth/authFetch'

export function normalizeTicketKey(key: string): string {
  // Validate input
  if (!key || typeof key !== 'string')
    return ''

  // Sanitize: only allow alphanumeric, dash, underscore
  const sanitized = key.replace(/[^\w-]/g, '')

  const match = sanitized.match(/^([A-Z]+)-(\d+)$/)
  if (!match)
    return sanitized
  return formatCrKey(match[1], Number.parseInt(match[2], 10))
}

export function validateProjectCode(code: string): boolean {
  if (!code || typeof code !== 'string')
    return false
  // Only allow alphanumeric and dash, 2-10 chars
  return /^[A-Z0-9-]{2,10}$/.test(code)
}

export async function findProjectByTicketKey(ticketKey: string): Promise<string | null> {
  try {
    const response = await authFetch('/api/projects')
    if (!response.ok)
      return null

    const projects: Project[] = await response.json()
    if (!Array.isArray(projects))
      return null

    const normalizedKey = normalizeTicketKey(ticketKey)
    const projectCode = normalizedKey.match(/^([A-Z0-9-]+)-\d+$/)?.[1]
    const orderedProjects = projectCode
      ? [
          ...projects.filter(project => project.project.code === projectCode || project.id === projectCode),
          ...projects.filter(project => project.project.code !== projectCode && project.id !== projectCode),
        ]
      : projects

    // Fetch project tickets in order. Ticket keys are normally prefixed with
    // their project code, so direct routes should resolve without scanning every
    // accumulated E2E project first.
    for (const project of orderedProjects) {
      try {
        const ticketsResponse = await authFetch(`/api/projects/${project.id}/crs`)
        if (!ticketsResponse.ok)
          continue

        const tickets: Ticket[] = await ticketsResponse.json()
        if (Array.isArray(tickets) && tickets.some((ticket: Ticket) => ticket.code === normalizedKey))
          return project.project.code || project.id
      }
      catch (error) {
        console.warn(`Skipping project '${project.id}' during ticket lookup:`, error)
      }
    }

    return null
  }
  catch (error) {
    console.error('Error finding project by ticket key:', error)
    return null
  }
}

export function getCurrentProject(): string | null {
  return localStorage.getItem('selectedProject')
}

export function setCurrentProject(projectCode: string): void {
  localStorage.setItem('selectedProject', projectCode)
}
