/**
 * MDT-187: elision helper unit tests
 *
 * Covers: S1, S2, S3, S4, S13 (see docs/CRs/MDT-187/bdd.md)
 */

import { describe, expect, it } from 'bun:test'
import { elideLinkKey, elideLinks } from './relationshipLink'

describe('elideLinkKey', () => {
  describe('same-project links', () => {
    it('elides to bare zero-padded number', () => {
      expect(elideLinkKey('MDT-030', 'MDT').display).toBe('030')
    })

    it('preserves zero padding', () => {
      expect(elideLinkKey('MDT-005', 'MDT').display).toBe('005')
    })

    it('preserves multi-digit width beyond 3 digits', () => {
      expect(elideLinkKey('MDT-1005', 'MDT').display).toBe('1005')
    })

    it('flags isSameProject true', () => {
      expect(elideLinkKey('MDT-030', 'MDT').isSameProject).toBe(true)
    })

    it('keeps fullKey intact', () => {
      expect(elideLinkKey('MDT-030', 'MDT').fullKey).toBe('MDT-030')
    })
  })

  describe('cross-project links', () => {
    it('keeps full CR key', () => {
      expect(elideLinkKey('VOC-005', 'MDT').display).toBe('VOC-005')
    })

    it('flags isSameProject false', () => {
      expect(elideLinkKey('VOC-005', 'MDT').isSameProject).toBe(false)
    })

    it('supports alphanumeric project codes (TP0)', () => {
      expect(elideLinkKey('TP0-012', 'MDT').display).toBe('TP0-012')
    })
  })

  describe('mixed within one list (elideLinks)', () => {
    it('elides same-project and keeps cross-project together', () => {
      const result = elideLinks(['MDT-030', 'VOC-005', 'MDT-035'], 'MDT')
      expect(result.map(r => r.display)).toEqual(['030', 'VOC-005', '035'])
    })

    it('preserves order and length', () => {
      const links = ['MDT-030', 'VOC-005', 'MDT-035', 'MDT-040', 'MDT-041']
      const result = elideLinks(links, 'MDT')
      expect(result).toHaveLength(links.length)
      expect(result.map(r => r.fullKey)).toEqual(links)
    })
  })

  describe('edge cases', () => {
    it('falls back to full string for malformed input', () => {
      expect(elideLinkKey('not-a-ticket', 'MDT').display).toBe('not-a-ticket')
      expect(elideLinkKey('not-a-ticket', 'MDT').isSameProject).toBe(false)
    })

    it('falls back for bare numbers', () => {
      expect(elideLinkKey('030', 'MDT').display).toBe('030')
    })

    it('falls back for external URLs', () => {
      expect(elideLinkKey('https://example.com', 'MDT').display).toBe(
        'https://example.com',
      )
    })

    it('does not elide when prefix is lowercase (defensive)', () => {
      // pattern requires uppercase prefix; lowercase slips through as full-key fallback
      expect(elideLinkKey('mdt-030', 'MDT').display).toBe('mdt-030')
    })

    it('does not match single-char prefix', () => {
      expect(elideLinkKey('A-030', 'A').display).toBe('A-030')
    })
  })
})
