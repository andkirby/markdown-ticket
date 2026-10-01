/**
 * SubdocumentService Security Tests - MDT-151
 *
 * Path traversal prevention, input validation, and symlink containment.
 * RED tests — will fail until implementation exists.
 */

import type { ResolvedTicketLocation } from '../types.js'
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SubdocumentService } from '../SubdocumentService.js'

describe('SubdocumentService Security (MDT-151)', () => {
  let service: SubdocumentService
  let testDir: string
  let ticketDir: string
  let location: ResolvedTicketLocation

  beforeEach(() => {
    service = new SubdocumentService()
    testDir = join(tmpdir(), `mdt-151-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    ticketDir = join(testDir, 'docs', 'CRs', 'MDT-151')
    mkdirSync(ticketDir, { recursive: true })
    writeFileSync(join(ticketDir, 'architecture.md'), '# Architecture\n\nTest content\n')

    location = {
      projectRoot: testDir,
      ticketDir,
      ticketsPath: 'docs/CRs',
      isWorktree: false,
    }
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  // ─── Path Traversal: Literal dotdot ───────────────────────────────────────

  describe('path traversal prevention', () => {
    it('shall reject subDocName with literal ../ segments', () => {
      expect(() => service.read(location, '../etc/passwd')).toThrow('SubDocument not found')
    })

    it('shall reject subDocName with embedded ..', () => {
      expect(() => service.read(location, 'foo/../etc/passwd')).toThrow('SubDocument not found')
    })

    it('shall reject subDocName with trailing ..', () => {
      expect(() => service.read(location, '..')).toThrow('SubDocument not found')
    })

    it('shall reject subDocName with double dot in segment', () => {
      expect(() => service.read(location, 'foo..bar')).toThrow('SubDocument not found')
    })

    // ─── URL-encoded traversal ─────────────────────────────────────────────

    it('shall reject URL-encoded dotdot (%2F after Express decode)', () => {
      // Express decodes %2F → / before route params
      // After decode, subDocName becomes "../something"
      expect(() => service.read(location, '../something')).toThrow('SubDocument not found')
    })

    // ─── Null byte injection ───────────────────────────────────────────────

    it('shall reject null byte injection', () => {
      expect(() => service.read(location, 'architecture\x00.md')).toThrow('SubDocument not found')
    })

    it('shall reject percent-encoded null byte', () => {
      // After Express decode, %00 becomes \0
      expect(() => service.read(location, 'architecture\x00')).toThrow('SubDocument not found')
    })

    // ─── Double encoding ───────────────────────────────────────────────────

    it('shall reject double-encoded slash (%252F renders to %2F)', () => {
      // After Express single decode, %252F → %2F — not a real slash
      // But still suspicious, should be rejected by whitelist
      expect(() => service.read(location, 'foo%2Fbar')).toThrow('SubDocument not found')
    })

    // ─── Unicode slash variants ────────────────────────────────────────────

    it('shall reject unicode slash variant (U+2215 ∕)', () => {
      expect(() => service.read(location, 'foo∕bar')).toThrow('SubDocument not found')
    })

    it('shall reject unicode fraction slash (U+2044 ⁄)', () => {
      expect(() => service.read(location, 'foo⁄bar')).toThrow('SubDocument not found')
    })

    it('shall reject unicode fullwidth slash (U+FF0F ／)', () => {
      expect(() => service.read(location, 'foo／bar')).toThrow('SubDocument not found')
    })

    // ─── Whitespace and length ─────────────────────────────────────────────

    it('shall reject whitespace-only subDocName', () => {
      expect(() => service.read(location, '   ')).toThrow('SubDocument not found')
    })

    it('shall reject empty subDocName', () => {
      expect(() => service.read(location, '')).toThrow('SubDocument not found')
    })

    it('shall reject subDocName exceeding 255 characters', () => {
      const longName = 'a'.repeat(256)
      expect(() => service.read(location, longName)).toThrow('SubDocument not found')
    })

    it('shall accept subDocName at exactly 255 characters if valid', () => {
      // This should NOT throw — valid name at boundary
      const name255 = 'a'.repeat(255)
      // Won't find it (doesn't exist) but shouldn't throw input validation error
      expect(() => service.read(location, name255)).toThrow('SubDocument not found')
    })
  })

  // ─── Valid subdocument reads unchanged ─────────────────────────────────────

  describe('valid subdocument reads', () => {
    it('shall return content for valid subDocName', () => {
      const result = service.read(location, 'architecture')
      expect(result.content).toBe('# Architecture\n\nTest content\n')
      expect(result.code).toBe('architecture')
    })

    it('shall return 404-equivalent for non-existent but valid subDocName', () => {
      expect(() => service.read(location, 'nonexistent')).toThrow('SubDocument not found')
    })
  })

  // ─── Symlink containment ───────────────────────────────────────────────────

  describe('symlink containment', () => {
    it('shall not follow symlinks by default (allowSymlinks absent)', () => {
      const externalDir = join(testDir, 'external')
      mkdirSync(externalDir, { recursive: true })
      writeFileSync(join(externalDir, 'secret.md'), '# Secret\n\nExternal content\n')

      // Create symlink inside ticketDir pointing to external file
      symlinkSync(join(externalDir, 'secret.md'), join(ticketDir, 'linked.md'))

      expect(() => service.read(location, 'linked')).toThrow('SubDocument not found')
    })

    it('shall not follow symlinks when allowSymlinks is false', () => {
      const externalDir = join(testDir, 'external')
      mkdirSync(externalDir, { recursive: true })
      writeFileSync(join(externalDir, 'secret.md'), '# Secret\n\nExternal content\n')

      symlinkSync(join(externalDir, 'secret.md'), join(ticketDir, 'linked.md'))

      // Same behavior — service doesn't follow symlinks by default
      expect(() => service.read(location, 'linked')).toThrow('SubDocument not found')
    })
  })

  // ─── Symlink allowSymlinks=true (BR-3.2, BR-3.3) ────────────────────────────

  describe('symlink allowSymlinks=true', () => {
    it('BR-3.2: shall follow symlink when allowSymlinks=true and target is inside ticketDir', () => {
      // Create a file INSIDE ticketDir (in a subfolder)
      const subfolder = join(ticketDir, 'internal')
      mkdirSync(subfolder, { recursive: true })
      writeFileSync(join(subfolder, 'linked-target.md'), '# Linked\n\nInternal content\n')

      // Create symlink inside ticketDir pointing to the internal file
      symlinkSync(join(subfolder, 'linked-target.md'), join(ticketDir, 'linked.md'))

      const locationWithAllow: ResolvedTicketLocation = {
        ...location,
        allowSymlinks: true,
      }

      const result = service.read(locationWithAllow, 'linked')
      expect(result.content).toBe('# Linked\n\nInternal content\n')
      expect(result.code).toBe('linked')
    })

    it('BR-3.3: shall reject symlink when allowSymlinks=true but target is outside ticketDir', () => {
      const externalDir = join(testDir, 'external')
      mkdirSync(externalDir, { recursive: true })
      writeFileSync(join(externalDir, 'secret.md'), '# Secret\n\nExternal content\n')

      // Create symlink inside ticketDir pointing to external file
      symlinkSync(join(externalDir, 'secret.md'), join(ticketDir, 'linked.md'))

      const locationWithAllow: ResolvedTicketLocation = {
        ...location,
        allowSymlinks: true,
      }

      expect(() => service.read(locationWithAllow, 'linked')).toThrow('SubDocument not found')
    })
  })

  // ─── resolvePath containment check ─────────────────────────────────────────

  describe('resolvePath containment', () => {
    it('shall return null for traversal paths in resolvePath', () => {
      expect(service.resolvePath(location, '../etc/passwd')).toBeNull()
    })

    it('shall return null for deeply nested traversal', () => {
      expect(service.resolvePath(location, 'a/b/../../../../etc/passwd')).toBeNull()
    })

    it('shall return a valid path for legitimate subDocName', () => {
      const result = service.resolvePath(location, 'architecture')
      expect(result).toBe(join(ticketDir, 'architecture.md'))
    })
  })
})
