import { inspectTicketContent } from '../../../services/ticket/content-inspection.js'

const context = { ticketKey: 'TEST-001', filePath: 'tickets/TEST-001-topic.md', status: 'Proposed' }
const real = '# Real ticket\n\n## Problem\nAgents miss generated instructions.\n\n## Outcome\nReject unfinished ticket content.\n'

describe('MDT-261 content inspection', () => {
  it.each([
    '[What architectural problem are we solving?]',
    '[How the system is currently structured]',
    '[New architectural approach]',
    '[Why this architectural change is needed]',
    '[What architectural challenge needs to be addressed?]',
  ])('rejects a legacy instruction: %s', (instruction) => {
    const findings = inspectTicketContent(`${real}\n## Architecture\n${instruction}\n`, context)
    expect(findings).toEqual(expect.arrayContaining([expect.objectContaining({ ticketKey: context.ticketKey, filePath: context.filePath, severity: 'error' })]))
    expect(findings.some(f => f.instruction?.includes(instruction))).toBe(true)
    expect(findings.every(f => !!f.correction)).toBe(true)
  })
  it.each(['# Title\n', '# Title\n## Problem\n<!-- comment -->\n## Outcome\n'])('rejects structural-only content', (body) => {
    expect(inspectTicketContent(body, context).some(f => f.code === 'TICKET_BODY_EMPTY')).toBe(true)
  })
  it('rejects active markers, including when real content exists', () => {
    expect(inspectTicketContent(`${real}\n<!-- mdt:placeholder:problem -->\n`, context).length).toBeGreaterThan(0)
  })
  it('ignores quoted, fenced, inline-code and labelled examples', () => {
    const examples = '\n> [What architectural problem are we solving?]\n\n```md\n<!-- mdt:placeholder:problem -->\n```\n\n`[New architectural approach]`\n\n## Examples\n[How the system is currently structured]\n'
    expect(inspectTicketContent(real + examples, context)).toEqual([])
  })
  it('permits planning words, technical brackets, links and unchecked intake criteria', () => {
    expect(inspectTicketContent(`${real}\nTODO: document compatibility. TBD remains a valid input string. FIXME appears in the example.\nUse array[index] and [guide](docs.md).\n- [ ] Add coverage\n`, context)).toEqual([])
  })
  it('limits legacy deferral to Implementation Notes before Implemented', () => {
    const notes = `${real}\n## 5. Implementation Notes\n*To be filled during/after implementation*\n`
    expect(inspectTicketContent(notes, context)).toEqual([])
    expect(inspectTicketContent(notes, { ...context, status: 'Implemented' }).length).toBeGreaterThan(0)
    expect(inspectTicketContent(`${real}\n## Problem\n*To be filled during/after implementation*`, context).length).toBeGreaterThan(0)
  })
  it('retains line locations under CRLF and conservative whitespace changes', () => {
    const body = '# Test\r\n\r\n## Problem Statement\r\n[What   architectural problem are we solving?]\r\n'
    const findings = inspectTicketContent(body, context)
    expect(findings.some(f => f.line === 4 && f.section?.includes('Problem'))).toBe(true)
  })
  it('reports the exact line of an inline marker after a soft break', () => {
    const body = '# Test\n\n## Problem\nReal content\nmore content <!-- mdt:placeholder:problem -->\n'
    expect(inspectTicketContent(body, context).some(f => f.line === 5 && f.instruction?.includes('mdt:placeholder:problem'))).toBe(true)
  })
  it('does not accept generic generated criteria as the entire ticket body', () => {
    expect(inspectTicketContent('# Ticket\n\n## Acceptance Criteria\n- [ ] Architecture addresses the stated problem\n- [ ] Solution is scalable and maintainable\n', context).some(f => f.code === 'TICKET_BODY_EMPTY')).toBe(true)
  })
  it('an empty blockquote does not make a scaffold substantive', () => {
    expect(inspectTicketContent('# Ticket\n\n>\n', context).some(f => f.code === 'TICKET_BODY_EMPTY')).toBe(true)
  })
  it('rejects a legacy Research table even when it is the only body content', () => {
    const body = '# Research\n\n| ID | Research Question | Success Criteria | Priority |\n|----|-------------------|------------------|----------|\n| RQ1 | Specific question to answer | Measurable outcome | High/Medium/Low |\n'
    const findings = inspectTicketContent(body, context)
    expect(findings.some(f => f.instruction === 'Specific question to answer')).toBe(true)
    expect(findings.some(f => f.instruction === 'Measurable outcome')).toBe(true)
  })
  it('a Research table with only generic headers and row identifiers stays empty', () => {
    const body = '# Research\n\n| ID | Research Question | Success Criteria | Priority |\n|----|-------------------|------------------|----------|\n| RQ1 | | | High/Medium/Low |\n'
    expect(inspectTicketContent(body, context).some(f => f.code === 'TICKET_BODY_EMPTY')).toBe(true)
  })
  it.each([
    'Write 2-3 bullets providing context:',
    'Clear statement of what hypothesis or question this research validates:',
    '- What uncertainty this research resolves',
    '- [ ] RQ1 answered with evidence: [summary of findings]',
    '| RQ1 | Specific question to answer | Measurable outcome | High/Medium/Low |',
  ])('rejects non-bracketed or table instructions from old research templates: %s', (instruction) => {
    expect(inspectTicketContent(`${real}\n${instruction}\n`, context).length).toBeGreaterThan(0)
  })
  it('a new non-example section after Examples is inspected again', () => {
    const body = `${real}\n## Examples\n[New architectural approach]\n\n## Proposed Architecture\n[New architectural approach]\n`
    expect(inspectTicketContent(body, context)).toEqual([expect.objectContaining({ section: 'Real ticket / Proposed Architecture' })])
  })
})
