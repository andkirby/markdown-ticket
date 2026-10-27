import { LocalProjectConfigSchema, ProjectConfigReadFileSchema } from '../../project'
import { TicketFrontmatterSchema } from '../frontmatter'
import { CreateTicketInputSchema, PatchTicketInputSchema, TicketAttributeInputSchema } from '../input'

describe('MDT-252 external reference boundaries', () => {
  const refs = ['work:PRJ-123', 'gh:acme/widgets#42', 'future:preserved']

  it('retains optional refs through create, update, MCP attributes and frontmatter contracts', () => {
    expect(CreateTicketInputSchema.parse({ title: 'External identity', type: 'Bug Fix', refs })).toMatchObject({ refs })
    expect(PatchTicketInputSchema.parse({ refs })).toMatchObject({ refs })
    expect(TicketAttributeInputSchema.parse({ refs })).toMatchObject({ refs })
    expect(TicketFrontmatterSchema.parse({ code: 'MDT-12345', title: 'External identity', status: 'Proposed', type: 'Bug Fix', priority: 'Medium', refs })).toMatchObject({ refs })
  })

  it('rejects non-string reference entries at explicit mutation boundaries', () => {
    expect(CreateTicketInputSchema.safeParse({ title: 'External identity', type: 'Bug Fix', refs: [42] }).success).toBe(false)
    expect(PatchTicketInputSchema.safeParse({ refs: { issue: 42 } }).success).toBe(false)
  })

  it('accepts optional raw tracker tables without letting an invalid entry hide a project', () => {
    const config = { project: { code: 'MDT', name: 'References' }, trackers: { work: { kind: 'jira', baseUrl: 'https://jira.example.test/jira' }, future: { kind: 'future', value: 'keep' } } }
    expect(LocalProjectConfigSchema.parse(config)).toMatchObject({ trackers: config.trackers })
    expect(ProjectConfigReadFileSchema.parse(config)).toMatchObject({ trackers: config.trackers })
  })
})
