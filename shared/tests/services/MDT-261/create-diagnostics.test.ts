import { readdir, readFile } from 'node:fs/promises'
import { ProjectService } from '../../../services/ProjectService.js'
import { TicketService } from '../../../services/TicketService.js'
import { ProjectFactory, TestEnvironment } from '../../../test-lib/index.js'

describe('MDT-261 shared creation operation', () => {
  let environment: TestEnvironment
  beforeEach(async () => {
    environment = new TestEnvironment()
    await environment.setup()
  })
  afterEach(async () => environment.cleanup())
  async function createProject() {
    const fixture = await new ProjectFactory(environment).createProject('empty', { code: 'TEST' })
    const project = await new ProjectService(true).getProjectByCodeOrId(fixture.key)
    if (!project)
      throw new Error('Fixture project was not registered')
    return project
  }
  it.each([undefined, '', ' \n\t'])('actual formatter reports template generation for %j', async (content) => {
    const project = await createProject()
    const service = new TicketService(true)
    const result = await service.createCRWithDiagnostics(project, 'Architecture', { title: 'Example architecture ticket', type: 'Architecture', content })
    expect(result.ticket.code).toBe('TEST-001')
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0]).toMatchObject({ code: 'TICKET_TEMPLATE_UNFILLED', severity: 'warning', ticketKey: result.ticket.code })
    const text = await readFile(result.ticket.filePath, 'utf8')
    expect(text).not.toContain('diagnostics:')
    expect(text).not.toContain('TICKET_TEMPLATE_UNFILLED')
    expect(result.ticket).not.toHaveProperty('diagnostics')
    expect((await readdir(`${project.project.path}/docs/CRs`)).filter(f => f.endsWith('.md'))).toHaveLength(1)
  })
  it('preserves old entity API and genuine supplied bodies', async () => {
    const project = await createProject()
    const service = new TicketService(true)
    const ticket = await service.createCR(project, 'Feature Enhancement', { title: 'Real ticket', type: 'Feature Enhancement', content: 'Agents miss templates. Warn before committing.' })
    expect(ticket.code).toBe('TEST-001')
    expect(ticket).not.toHaveProperty('diagnostics')
    const result = await service.createCRWithDiagnostics(project, 'Architecture', { title: 'Other ticket', type: 'Architecture', content: 'Agents miss templates. Warn before committing.' })
    expect(result.diagnostics).toEqual([])
  })
  it('inspects supplied unfinished instructions without claiming generation', async () => {
    const project = await createProject()
    const result = await new TicketService(true).createCRWithDiagnostics(project, 'Architecture', { title: 'Unfilled architecture', type: 'Architecture', content: '## Problem Statement\n[What architectural problem are we solving?]\n' })
    expect(result.diagnostics.some(d => d.code === 'TICKET_CONTENT_UNFILLED')).toBe(true)
    expect(result.diagnostics.some(d => d.code === 'TICKET_TEMPLATE_UNFILLED')).toBe(false)
  })
})
