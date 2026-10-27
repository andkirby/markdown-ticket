import type { MarkdownService } from '@mdt/shared/services/MarkdownService.js'
import type { TemplateService } from '@mdt/shared/services/TemplateService.js'

import type { TicketService } from '@mdt/shared/services/TicketService.js'
import type { TitleExtractionService } from '@mdt/shared/services/TitleExtractionService.js'
import type { CRService } from '../../services/crService.js'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ALL_TOOLS } from '../config/allTools.js'
import { CRHandlers } from '../handlers/crHandlers.js'
import { AttributesArgsSchema, CreateArgsSchema } from '../mutationSchemas.js'
import { createMockProject, createMockTicket } from './test-fixtures.js'

jest.mock('@mdt/shared/services/MarkdownService.js', () => jest.requireActual('../../../../shared/services/MarkdownService.ts'))

describe('MDT-252 external reference MCP contracts', () => {
  const refs = ['work:PRJ-123', 'gh:acme/widgets#42', 'future:preserved']

  it('passes ref arrays through create and attribute parsing without guessing identities', () => {
    expect(CreateArgsSchema.parse({ type: 'Bug Fix', data: { title: 'Linked issue', refs } }).data).toMatchObject({ refs })
    expect(AttributesArgsSchema.parse({ key: 'MDT-001', attributes: { refs } }).attributes).toMatchObject({ refs })
  })

  it('advertises refs on both public write tools', () => {
    const create = ALL_TOOLS.find(tool => tool.name === 'create_cr')
    const attrs = ALL_TOOLS.find(tool => tool.name === 'update_cr_attrs')
    expect(create?.inputSchema).toHaveProperty('properties.data.properties.refs')
    expect(attrs?.inputSchema).toHaveProperty('properties.attributes.properties.refs')
  })
})

describe('MDT-252 actual MCP structured reads', () => {
  const refs = ['gh:acme/widgets#42', 'future:<b>raw</b> & "quoted", punctuation: λ']
  let directory: string
  let originalSanitization: string | undefined
  beforeEach(() => {
    originalSanitization = process.env.MCP_SECURITY_SANITIZATION
    directory = mkdtempSync(join(tmpdir(), 'mdt252-mcp-refs-'))
  })
  afterEach(() => {
    if (originalSanitization === undefined)
      delete process.env.MCP_SECURITY_SANITIZATION
    else
      process.env.MCP_SECURITY_SANITIZATION = originalSanitization
    rmSync(directory, { recursive: true, force: true })
  })
  it.each(['true', 'false'])('retains JSON and raw refs with sanitization=%s', async (flag) => {
    process.env.MCP_SECURITY_SANITIZATION = flag
    const filePath = join(directory, 'MDT-001-example.md')
    writeFileSync(filePath, `---\ncode: MDT-001\ntitle: Example\nstatus: Proposed\ntype: Bug Fix\npriority: Medium\nrefs: ${JSON.stringify(refs)}\n---\n\n# Example\n\nBody.`)
    const ticket = { ...createMockTicket({ filePath, title: 'Example <em>unsafe</em> & "quoted"' }), refs }
    const handler = new CRHandlers(
      { getCR: jest.fn().mockResolvedValue(ticket) } as unknown as CRService,
      {} as MarkdownService,
      {} as TitleExtractionService,
      {} as TemplateService,
      {} as TicketService,
    )
    for (const mode of ['metadata', 'attributes']) {
      const text = await handler.handleGetCR(createMockProject(), 'MDT-001', mode)
      const payload = JSON.parse(text)
      expect(payload).toMatchObject({ refs })
      if (mode === 'metadata' && flag === 'true') {
        expect(payload.title).not.toContain('<em>')
        expect(payload.title).toContain('&amp;')
      }
      else if (mode === 'metadata') {
        expect(payload.title).toBe(ticket.title)
      }
    }
  })
})
