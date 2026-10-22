import { MCPTools } from '../index.js'

export function createTools(ticketService: unknown = {}) {
  const params = [{}, { getTicketService: () => ticketService }, {}, {}, {}, {}, null] as unknown as ConstructorParameters<typeof MCPTools>
  return new MCPTools(...params)
}

// Phase 0 snapshots: no normalization or defaults before the positional delegate.
export const acceptedMutations = [
  { name: 'create_cr', args: { key: 'mdt-1', type: 'Research', data: { title: 'key-derived context' } }, handler: 'handleCreateCR', forwarded: ['Research', { title: 'key-derived context' }] },
  { name: 'create_cr', args: { project: ' mdt ', type: 'Bug Fix', data: { title: '  long title  '.repeat(25), assignee: 'plain-user', slug: 'chosen', component: 'api' } }, handler: 'handleCreateCR', forwarded: ['Bug Fix', { title: '  long title  '.repeat(25), assignee: 'plain-user', slug: 'chosen', component: 'api' }] },
  { name: 'update_cr_status', args: { key: 'mdt-1', status: 'In Progress' }, handler: 'handleUpdateCRStatus', forwarded: ['mdt-1', 'In Progress'] },
  { name: 'update_cr_attrs', args: { key: '1', attributes: { priority: 'p1', level: 'e', assignee: 'user', blocks: ['MDT-2'], component: null } }, handler: 'handleUpdateCRAttrs', forwarded: ['1', { priority: 'p1', level: 'e', assignee: 'user', blocks: ['MDT-2'], component: null }] },
  { name: 'delete_cr', args: { project: '01', key: '001' }, handler: 'handleDeleteCR', forwarded: ['001'] },
  { name: 'manage_cr_sections', args: { key: 'mdt-1', operation: 'update', section: 'Description', content: 'text' }, handler: 'handleManageCRSections', forwarded: ['mdt-1', 'update', 'Description', 'text'] },
] as const
