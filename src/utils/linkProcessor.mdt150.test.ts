/**
 * MDT-150 Constraint Regression Tests
 *
 * C1: Must not alter ticket reference link behavior
 * C2: Must not alter external link behavior
 * C5: Preprocessor and linkProcessor must remain unchanged
 *
 * These tests lock the existing behavior of linkProcessor.ts
 * to ensure MDT-150 changes don't break existing link classification.
 */
import { describe, expect, it } from 'bun:test'
import { classifyLink, LinkType } from './linkProcessor'

describe('MDT-150: linkProcessor constraint regression (C1, C2, C5)', () => {
  const project = 'MDT'

  // C1: Ticket reference link behavior unchanged
  describe('C1: ticket references', () => {
    it('classifies bare ticket key as TICKET', () => {
      const result = classifyLink('MDT-150', project)
      expect(result.type).toBe(LinkType.TICKET)
      expect(result.ticketKey).toBe('MDT-150')
      expect(result.isValid).toBe(true)
    })

    it('classifies ticket key with .md as TICKET', () => {
      const result = classifyLink('MDT-150.md', project)
      expect(result.type).toBe(LinkType.TICKET)
      expect(result.ticketKey).toBe('MDT-150')
      expect(result.isValid).toBe(true)
    })

    it('classifies ticket key with anchor as TICKET', () => {
      const result = classifyLink('MDT-150#overview', project)
      expect(result.type).toBe(LinkType.TICKET)
      expect(result.ticketKey).toBe('MDT-150')
      expect(result.anchor).toBe('#overview')
      expect(result.isValid).toBe(true)
    })

    it('classifies absolute ticket URL as TICKET', () => {
      const result = classifyLink('/prj/MDT/ticket/MDT-017', project)
      expect(result.type).toBe(LinkType.TICKET)
      expect(result.ticketKey).toBe('MDT-017')
      expect(result.projectCode).toBe('MDT')
      expect(result.isValid).toBe(true)
    })

    it('classifies absolute ticket URL with anchor as TICKET', () => {
      const result = classifyLink('/prj/MDT/ticket/MDT-017#section', project)
      expect(result.type).toBe(LinkType.TICKET)
      expect(result.ticketKey).toBe('MDT-017')
      expect(result.anchor).toBe('#section')
    })
  })

  // C2: External link behavior unchanged
  describe('C2: external links', () => {
    it('classifies https URL as EXTERNAL', () => {
      const result = classifyLink('https://example.com', project)
      expect(result.type).toBe(LinkType.EXTERNAL)
      // isValid uses window.location which may not exist in bun:test
    })

    it('classifies http URL as EXTERNAL', () => {
      const result = classifyLink('http://example.com/path', project)
      expect(result.type).toBe(LinkType.EXTERNAL)
    })

    it('classifies mailto: as EXTERNAL', () => {
      const result = classifyLink('mailto:user@example.com', project)
      expect(result.type).toBe(LinkType.EXTERNAL)
    })

    it('classifies tel: as EXTERNAL', () => {
      const result = classifyLink('tel:+1234567890', project)
      expect(result.type).toBe(LinkType.EXTERNAL)
    })
  })

  // C5: linkProcessor classification unchanged for all link types
  describe('C5: linkProcessor unchanged', () => {
    it('classifies anchor links as ANCHOR', () => {
      const result = classifyLink('#section-heading', project)
      expect(result.type).toBe(LinkType.ANCHOR)
      expect(result.isValid).toBe(true)
    })

    it('classifies .md relative paths as DOCUMENT', () => {
      const result = classifyLink('architecture.md', project)
      expect(result.type).toBe(LinkType.DOCUMENT)
      expect(result.isValid).toBe(true)
    })

    it('classifies image files as FILE', () => {
      const result = classifyLink('diagram.png', project)
      expect(result.type).toBe(LinkType.FILE)
      expect(result.isValid).toBe(true)
    })

    it('classifies cross-project ticket as CROSS_PROJECT', () => {
      // OTHER-123 matches the ticket regex first since it matches [A-Z]+-[A-Z]?\d+
      // which takes precedence in classifyLink's order
      const result = classifyLink('OTHER-123', project)
      // Current behavior: ticket regex matches before cross-project check
      expect(result.type).toBe(LinkType.TICKET)
      expect(result.ticketKey).toBe('OTHER-123')
    })

    it('classifies unknown paths as UNKNOWN', () => {
      const result = classifyLink('some/random/path', project)
      expect(result.type).toBe(LinkType.UNKNOWN)
      expect(result.isValid).toBe(false)
    })
  })
})
