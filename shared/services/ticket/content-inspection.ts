/** Shared, side-effect-free policy for active template instructions in ticket bodies. */
import type { Ticket, TicketDiagnostic } from '@mdt/domain-contracts'
import type Token from 'markdown-it/lib/token.mjs'
import MarkdownIt from 'markdown-it'
import { builtinTemplateCatalog } from '../../templates/catalog.js'
import { legacyTemplateBoilerplate, legacyTemplateInstructions } from '../../templates/legacy-instructions.js'

export interface TicketContentContext {
  ticketKey: string
  filePath: string
  status?: string
}

const markdown = new MarkdownIt({ html: true })
const correction = 'Replace template instructions with ticket-specific content before committing.'
const deferral = 'To be filled during/after implementation'
const placeholderPattern = /<!--\s*mdt:placeholder:[a-z0-9][a-z0-9-]*\s*-->/gi

function inlineText(value: string): { text: string, literal: boolean, html: string[] } {
  const raw = value
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/, '')
    .replace(/^\s*\[[ x]\]\s+/i, '')
  const children = markdown.parseInline(raw, {})[0]?.children || []
  return {
    text: children.map((child) => {
      if (child.type === 'text')
        return child.content
      if (child.type === 'softbreak' || child.type === 'hardbreak')
        return ' '
      return ''
    }).join('').replace(/\s+/g, ' ').trim(),
    literal: children.some(child => child.type === 'code_inline' || child.type === 'link_open'),
    html: children.filter(child => child.type === 'html_inline').map(child => child.content),
  }
}

const instructions = new Set([
  ...legacyTemplateInstructions,
  ...builtinTemplateCatalog.flatMap(template => template.sections.flatMap(section => section.placeholder ? [section.placeholder, `[${section.placeholder}]`] : [])),
].map(value => inlineText(value).text))
const boilerplate = new Set(legacyTemplateBoilerplate.map(value => inlineText(value).text))

/** Blank frontmatter without shifting Markdown token line locations. */
function bodySource(document: string): string {
  const lines = document.replace(/\r\n?/g, '\n').split('\n')
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
    if (end > 0) {
      for (let index = 0; index <= end; index++)
        lines[index] = ''
    }
  }
  return lines.join('\n')
}

interface Section {
  level: number
  title: string
  example: boolean
  implementation: boolean
}

interface InspectionState {
  context: TicketContentContext
  findings: TicketDiagnostic[]
  sections: Section[]
  meaningful: boolean
}

function addFinding(state: InspectionState, instruction: string, line: number): void {
  const section = state.sections.map(item => item.title).join(' / ')
  if (state.findings.some(item => item.line === line && item.instruction === instruction))
    return
  state.findings.push({
    code: 'TICKET_CONTENT_UNFILLED',
    severity: 'error',
    message: `Ticket ${state.context.ticketKey} has an unfinished body. ${correction}`,
    ticketKey: state.context.ticketKey,
    filePath: state.context.filePath,
    line,
    ...(section ? { section } : {}),
    instruction,
    correction,
  })
}

function inspectInstruction(state: InspectionState, instruction: string, line: number): boolean {
  const { text, literal } = inlineText(instruction)
  if (literal)
    return false
  if (text === deferral && state.sections.some(section => section.implementation) && state.context.status !== 'Implemented')
    return true
  if (!instructions.has(text))
    return false
  addFinding(state, instruction.trim(), line)
  return true
}

function inspectInline(state: InspectionState, token: Token): void {
  const start = token.map?.[0] ?? 0
  if (inspectInstruction(state, token.content, start + 1))
    return
  const lines = token.content.split('\n')
  for (const [index, line] of lines.entries()) {
    if (inspectInstruction(state, line, start + index + 1))
      continue
    const normalized = inlineText(line)
    for (const html of normalized.html)
      inspectHtml(state, html, start + index)
    if (normalized.literal || (normalized.text && !boilerplate.has(normalized.text)))
      state.meaningful = true
  }
}

function inspectHtml(state: InspectionState, content: string, start: number): void {
  for (const match of content.matchAll(placeholderPattern)) {
    const line = start + content.slice(0, match.index).split('\n').length
    addFinding(state, match[0], line)
  }
  const visible = content.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '').trim()
  if (visible && !inspectInstruction(state, visible, start + 1))
    state.meaningful = true
}

function enterSection(state: InspectionState, heading: Token, title: string): void {
  const level = Number(heading.tag.slice(1))
  while (state.sections.length && state.sections[state.sections.length - 1].level >= level)
    state.sections.pop()
  const name = title.replace(/^\d+[.)]?\s*/, '').trim()
  state.sections.push({
    level,
    title: name,
    example: /^examples?\b/i.test(name),
    implementation: /^implementation notes\b/i.test(name),
  })
}

export function inspectTicketContent(document: string, context: TicketContentContext): TicketDiagnostic[] {
  const state: InspectionState = { context, findings: [], sections: [], meaningful: false }
  const tokens = markdown.parse(bodySource(document), {})
  let quoteDepth = 0
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.type === 'blockquote_open') {
      quoteDepth++
      continue
    }
    if (token.type === 'blockquote_close') {
      quoteDepth--
      continue
    }
    if (quoteDepth) {
      if ((token.type === 'inline' || token.type === 'fence' || token.type === 'code_block') && token.content.trim())
        state.meaningful = true
      continue
    }
    if (token.type === 'heading_open') {
      enterSection(state, token, tokens[index + 1]?.content || '')
      index += 2
      continue
    }
    if (state.sections.some(section => section.example)) {
      if (token.content.trim())
        state.meaningful = true
      continue
    }
    if (token.type === 'fence' || token.type === 'code_block') {
      if (token.content.trim())
        state.meaningful = true
      continue
    }
    if (token.type === 'inline')
      inspectInline(state, token)
    if (token.type === 'html_block')
      inspectHtml(state, token.content, token.map?.[0] ?? 0)
  }
  if (!state.meaningful && state.findings.length === 0) {
    state.findings.push({
      code: 'TICKET_BODY_EMPTY',
      severity: 'error',
      message: `Ticket ${context.ticketKey} has an unfinished body containing only structure or template boilerplate. ${correction}`,
      ticketKey: context.ticketKey,
      filePath: context.filePath,
      line: 1,
      instruction: 'Empty ticket body or template boilerplate',
      correction,
    })
  }
  return state.findings
}

export function buildCreationDiagnostics(ticket: Ticket, bodySource: 'generated' | 'supplied' | 'recovered'): TicketDiagnostic[] {
  const findings = inspectTicketContent(ticket.content, { ticketKey: ticket.code, filePath: ticket.filePath, status: ticket.status })
  if (bodySource === 'generated') {
    return [{
      code: 'TICKET_TEMPLATE_UNFILLED',
      severity: 'warning',
      message: `Ticket ${ticket.code} was created with template placeholders. The body is unfinished. ${correction}`,
      ticketKey: ticket.code,
      filePath: ticket.filePath,
      ...(findings[0]?.line ? { line: findings[0].line } : {}),
      ...(findings[0]?.section ? { section: findings[0].section } : {}),
      correction,
    }]
  }
  return findings.map(finding => ({ ...finding, severity: 'warning' }))
}
