import { describe, expect, it } from '@jest/globals'
import { normalizeTicket } from '../../models/Ticket.js'
// Policy tests target the shared public owners used by every transport/surface.
import { resolveExternalReferences } from '../../services/externalReferences.js'
import { MarkdownService } from '../../services/MarkdownService.js'

import { writeReferenceFrontmatter } from '../../services/ticket/referenceFrontmatter.js'
import { mutateReferences } from '../../services/ticket/referenceMutations.js'
import { referenceMatchScore, ticketSearchProvenance } from '../../services/ticket/referenceSearch.js'

describe('MDT-252 reference frontmatter preservation', () => {
  const refs = ['work:PRJ-123', 'gh:acme/widgets#42', 'future:raw, punctuation: λ']
  const header = 'code: MDT-12345\nstatus: Proposed\ntype: Bug Fix\npriority: Medium\n'

  it.each([
    `refs: ${JSON.stringify(refs)}`,
    `refs:\n${refs.map(ref => `  - ${JSON.stringify(ref)}`).join('\n')}`,
    `refs:\n${refs.map(ref => `- ${JSON.stringify(ref)}`).join('\n')}`,
    `refs:\n${refs.map(ref => `- ${JSON.stringify(ref)}`).join('\n# between entries\n')}`,
  ])('reads inline/block YAML refs and retains unknown strings through serialization', async (field) => {
    const source = `---\n${header}${field}\n---\n\n# External identity\n\nBody stays intact.`
    const ticket = await MarkdownService.parseMarkdownContent(source)
    expect(ticket).toMatchObject({ code: 'MDT-12345', refs })
    if (!ticket)
      throw new Error('Ticket parsing failed')
    const serialized = MarkdownService.generateMarkdownContent({ ...ticket, priority: 'High' })
    const reread = await MarkdownService.parseMarkdownContent(serialized)
    // The display parser removes H1 and trims outer whitespace on each read.
    expect(reread).toMatchObject({ refs, priority: 'High' })
    expect(reread?.content.trim()).toBe(ticket.content.trim())
    expect(writeReferenceFrontmatter(source, refs).split('---\n\n')[1]).toBe(source.split('---\n\n')[1])
    expect(await MarkdownService.parseMarkdownContent(writeReferenceFrontmatter(source, refs))).toMatchObject({ refs, status: 'Proposed', priority: 'Medium' })
  })

  it('does not normalize raw refs during DTO normalization', () => {
    const raw = ['gh:#42', 'gh:acme/widgets#42', 'legacy:exact raw string', 'legacy:exact raw string']
    expect(normalizeTicket({ code: 'MDT-001', refs: raw })).toMatchObject({ refs: raw })
  })
})

describe('MDT-252 configured identity policy', () => {
  const config = {
    work: { kind: 'jira', baseUrl: 'https://jira.example.test/context', projectKeys: ['PRJ'] },
    gh: { kind: 'github', baseUrl: 'https://git.example.test', defaultRepo: 'acme/widgets' },
    gl: { kind: 'gitlab', baseUrl: 'https://lab.example.test/context' },
  }
  it('shortens only from configured context and retains complete stored destinations', () => {
    expect(resolveExternalReferences(['work:PRJ-123'], config)[0]).toMatchObject({ displayKey: '123', url: 'https://jira.example.test/context/browse/PRJ-123' })
    for (const projectKeys of [undefined, [], ['OTHER'], ['PRJ', 'OTHER'], ['PRJ', 'PRJ']])
      expect(resolveExternalReferences(['work:PRJ-123'], { work: { ...config.work, projectKeys } })[0]?.displayKey).toBe('PRJ-123')
    expect(resolveExternalReferences(['work:PRJ-123'], { work: { ...config.work, display: { projectCode: 'always' } } })[0]?.displayKey).toBe('PRJ-123')
    const gh = { ...config.gh, display: { repository: 'none' } }
    expect(resolveExternalReferences(['gh:acme/widgets#123', 'gh:other/widgets#123'], { gh }).map(ref => ref.displayKey)).toEqual(['#123', 'widgets#123'])
    const instances = resolveExternalReferences(['work:PRJ-123'], { ...config, client: { kind: 'jira', baseUrl: 42 } })
    expect(instances[0]?.instanceLabel).toBe('work')
    expect(resolveExternalReferences(['gl:org/group/repo#18'], config)[0]?.url).toBe('https://lab.example.test/context/org/group/repo/-/issues/18')
  })
  it.each([
    { baseUrl: 'javascript:alert(1)' },
    { baseUrl: 'https://user:password@jira.example.test' },
    { urlTemplate: 'https://other.example.test/{key}' },
    { urlTemplate: '{baseUrl}/{unknown}/{key}' },
    { urlTemplate: '{baseUrl}/{__proto__}/{key}' },
    { urlTemplate: '{baseUrl}/{constructor}/{key}' },
    { urlTemplate: '{baseUrl}/fixed-issue' },
    { urlTemplate: '{baseUrl}/browse/{key}/{unclosed' },
  ])('leaves unsafe or incomplete URL configuration unavailable: %j', (override) => {
    const [ref] = resolveExternalReferences(['work:PRJ-123'], { work: { ...config.work, ...override } })
    expect(ref?.url).toBeUndefined()
    expect(ref?.unavailableReason).toBeTruthy()
  })
  it('preserves raw shorthand and duplicate entries across adds and exact idempotent removes', () => {
    const raw = ['gh:#42', 'gh:acme/widgets#42', 'future:raw', 'future:raw']
    const added = mutateReferences(raw, { field: 'refs', op: 'add', value: ['gh:#43', 'gh:#43'] }, config)
    expect(added).toEqual([...raw, 'gh:acme/widgets#43'])
    const remove = { field: 'refs', op: 'remove' as const, value: 'gh:#42' }
    const removed = mutateReferences(added, remove, config)
    expect(mutateReferences(removed, remove, config)).toEqual(removed)
    expect(removed).toContain('gh:acme/widgets#42')
    expect(resolveExternalReferences(raw, config)[0]?.url).toBeUndefined()
    expect(mutateReferences(raw, { field: 'refs', op: 'replace', value: ['gh:#42', 'gh:acme/widgets#42'] }, config)).toEqual(['gh:acme/widgets#42'])
  })
  it('matches git-only complete numbers from stored repository identities without config', () => {
    expect(referenceMatchScore(['unknown:org/repo#123'], '#123')).toBe(100)
    expect(referenceMatchScore(['gh:org/repo#1234', 'work:PRJ-123'], '#123')).toBe(0)
    expect(ticketSearchProvenance({ code: 'MDT-123', title: '#123', refs: ['work:PRJ-123'] }, '#123')).toEqual([])
    expect(ticketSearchProvenance({ code: 'MDT-123', title: 'Title', refs: ['work:PRJ-123'] }, '123')).toEqual(['local-key', 'external-ref'])
  })
  it('preserves body bytes, newlines and neighbouring comments during explicit refs replacement', () => {
    const source = '---\r\ncode: MDT-001\r\nrefs:\r\n  - "gh:#42"\r\n\r\n# keep this comment\r\npriority: High\r\n---\r\n\r\n# Title\r\n\r\nBody  \r\n'
    expect(writeReferenceFrontmatter(source, ['gh:acme/widgets#42'])).toBe(source.replace('refs:\r\n  - "gh:#42"', 'refs: ["gh:acme/widgets#42"]'))
  })
})
