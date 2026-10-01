/**
 * ticketsPath Config Validation Tests - MDT-151
 *
 * Verifies that ticketsPath containing traversal segments is rejected
 * at config load/validation time, while valid paths are accepted.
 */

import { validateTicketsPath } from '../../ProjectValidator.js'

describe('ticketsPath validation (MDT-151)', () => {
  // ─── Rejected paths ──────────────────────────────────────────────────────

  describe('rejection', () => {
    it('shall reject ticketsPath with leading ../', () => {
      const result = validateTicketsPath('../../shared')
      expect(result.valid).toBe(false)
    })

    it('shall reject ticketsPath with embedded ../', () => {
      const result = validateTicketsPath('docs/../etc/CRs')
      expect(result.valid).toBe(false)
    })

    it('shall reject ticketsPath that is just ..', () => {
      const result = validateTicketsPath('..')
      expect(result.valid).toBe(false)
    })

    it('shall reject ticketsPath with trailing ../', () => {
      const result = validateTicketsPath('docs/CRs/../')
      expect(result.valid).toBe(false)
    })
  })

  // ─── Accepted paths ──────────────────────────────────────────────────────

  describe('acceptance', () => {
    it('shall accept simple relative path docs/CRs', () => {
      const result = validateTicketsPath('docs/CRs')
      expect(result.valid).toBe(true)
    })

    it('shall accept single-segment relative path CRs', () => {
      const result = validateTicketsPath('CRs')
      expect(result.valid).toBe(true)
    })

    it('shall accept absolute path /var/mdt/tickets', () => {
      const result = validateTicketsPath('/var/mdt/tickets')
      expect(result.valid).toBe(true)
    })

    it('shall accept path with leading ./', () => {
      const result = validateTicketsPath('./docs/CRs')
      expect(result.valid).toBe(true)
    })
  })

  // ─── System root blocklist (BR-2.4) ────────────────────────────────────

  describe('system root blocklist', () => {
    it('BR-2.4: shall reject /etc as ticketsPath', () => {
      const result = validateTicketsPath('/etc')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('system root directory')
    })

    it('BR-2.4: shall reject /usr as ticketsPath', () => {
      const result = validateTicketsPath('/usr')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('system root directory')
    })

    it('BR-2.4: shall reject / as ticketsPath', () => {
      const result = validateTicketsPath('/')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('system root directory')
    })

    it('Edge-7: shall accept /usr/local/my-project (subdirectory of protected root)', () => {
      const result = validateTicketsPath('/usr/local/my-project')
      expect(result.valid).toBe(true)
    })

    it('Edge-7: shall accept /var/mdt/tickets (not a protected root)', () => {
      const result = validateTicketsPath('/var/mdt/tickets')
      expect(result.valid).toBe(true)
    })
  })
})
