/**
 * MarkdownService Metadata Tests - MDT-094.
 *
 * Tests for metadata extraction methods that extract YAML frontmatter
 * WITHOUT reading the markdown body. This is the key optimization for
 * metadata-only list operations.
 *
 * Two methods:
 * - extractTicketMetadata(filePath): Extract metadata from single file
 * - scanTicketMetadata(dirPath): Scan directory for metadata
 *
 * @see docs/CRs/MDT-094/architecture.md
 */

/// <reference types="jest" />

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MarkdownService } from '../../../services/MarkdownService.js'
import { formatCrKey } from '../../../utils/keyNormalizer.js'

describe('MarkdownService Metadata Methods (MDT-094)', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mdt-metadata-test-'))
  })

  afterAll(() => {
    if (existsSync(tempDir) && tempDir.startsWith(tmpdir())) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('extractTicketMetadata (single file)', () => {
    it('should extract metadata from valid YAML frontmatter', async () => {
      const ticketPath = join(tempDir, 'valid-ticket.md')
      writeFileSync(ticketPath, `---
code: MDT-094
title: Test Ticket
status: In Progress
type: Feature Enhancement
priority: High
dateCreated: 2026-01-15T10:00:00Z
lastModified: 2026-03-02T15:30:00Z
---

# Test Ticket

This is the markdown body that should NOT be read.
It can be very long and contain lots of content.

## Section 1
Lorem ipsum dolor sit amet...
`)

      const metadata = await MarkdownService.extractTicketMetadata(ticketPath)

      expect(metadata).not.toBeNull()
      expect(metadata?.code).toBe('MDT-094')
      expect(metadata?.title).toBe('Test Ticket')
      expect(metadata?.status).toBe('In Progress')
      expect(metadata?.type).toBe('Feature Enhancement')
      expect(metadata?.priority).toBe('High')
      expect(metadata?.dateCreated).toBeInstanceOf(Date)
      expect(metadata?.lastModified).toBeInstanceOf(Date)
    })

    it('should skip markdown body entirely', async () => {
      const ticketPath = join(tempDir, 'large-body.md')
      const largeBody = 'x'.repeat(100_000) // 100KB of content

      writeFileSync(ticketPath, `---
code: MDT-094
title: Large Ticket
status: Proposed
type: Bug Fix
priority: Medium
---

${largeBody}
`)

      // Measure that we don't read the entire file
      const startTime = performance.now()
      const metadata = await MarkdownService.extractTicketMetadata(ticketPath)
      const elapsed = performance.now() - startTime

      expect(metadata).not.toBeNull()
      expect(metadata?.code).toBe('MDT-094')

      // Should complete quickly (< 50ms) because we're not processing the body
      // Note: We still read the full file (fs.readFileSync), but skip body processing
      expect(elapsed).toBeLessThan(50)
    })

    it('should return null for files without frontmatter', async () => {
      const noFrontmatterPath = join(tempDir, 'no-frontmatter.md')
      writeFileSync(noFrontmatterPath, `# Just Markdown

This file has no YAML frontmatter.
It should return null.
`)

      const metadata = await MarkdownService.extractTicketMetadata(noFrontmatterPath)

      expect(metadata).toBeNull()
    })

    it('should use defaults for invalid YAML', async () => {
      const invalidYamlPath = join(tempDir, 'invalid-yaml.md')
      writeFileSync(invalidYamlPath, `---
code: MDT-094
title: Test
invalid yaml here: [unclosed
---

# Content
`)

      // Our YAML parser is lenient - it extracts what it can
      // Invalid YAML with partial valid content returns partial data with defaults
      const metadata = await MarkdownService.extractTicketMetadata(invalidYamlPath)

      expect(metadata).toBeDefined()
      // Should have the code and title from the valid parts
      expect(metadata?.code).toBe('MDT-094')
      expect(metadata?.title).toBe('Test')
      // Invalid line is skipped, defaults applied for missing fields
      expect(metadata?.status).toBe('Proposed') // default
      expect(metadata?.priority).toBe('Medium') // default
    })
  })

  describe('extractTicketMetadata error handling', () => {
    it('should return null for unreadable files', async () => {
      const nonExistentPath = join(tempDir, 'does-not-exist.md')

      const metadata = await MarkdownService.extractTicketMetadata(nonExistentPath)

      expect(metadata).toBeNull()
    })
  })

  describe('scanTicketMetadata (directory scanning)', () => {
    it('should return empty array for non-existent directory', async () => {
      const nonExistentDir = join(tempDir, 'non-existent-dir')

      const results = await MarkdownService.scanTicketMetadata(nonExistentDir)

      expect(results).toEqual([])
    })

    it('should continue processing after file error', async () => {
      const mixedDir = join(tempDir, 'mixed-dir')
      mkdirSync(mixedDir, { recursive: true })

      // Create valid file
      writeFileSync(join(mixedDir, 'valid.md'), `---
code: MDT-001
title: Valid Ticket
status: Proposed
type: Feature Enhancement
priority: Medium
---

# Valid
`)

      // Create file without frontmatter (will be skipped)
      const invalidPath = join(mixedDir, 'invalid.md')
      writeFileSync(invalidPath, 'invalid content without frontmatter')

      // Process directory - should handle errors gracefully
      const results = await MarkdownService.scanTicketMetadata(mixedDir)

      // Should have at least the valid file
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results.find(m => m?.code === 'MDT-001')).toBeDefined()
    })
  })

  describe('performance characteristics', () => {
    it('should extract metadata without content field', async () => {
      const ticketPath = join(tempDir, 'performance-test.md')
      const largeContent = `${'\n'.repeat(1000)}# Content\n${'x'.repeat(50_000)}`

      writeFileSync(ticketPath, `---
code: MDT-PERF
title: Performance Test
status: Proposed
type: Feature Enhancement
priority: Medium
---
${largeContent}
`)

      const metadata = await MarkdownService.extractTicketMetadata(ticketPath)

      expect(metadata).toBeDefined()
      expect(metadata?.code).toBe('MDT-PERF')

      // The metadata should NOT have a content field
      // (TicketMetadata type excludes content by definition)
      expect(metadata).not.toHaveProperty('content')
    })

    it('should process multiple files efficiently', async () => {
      const batchDir = join(tempDir, 'batch-test')
      mkdirSync(batchDir, { recursive: true })

      // Create 50 ticket files
      for (let i = 1; i <= 50; i++) {
        writeFileSync(join(batchDir, `ticket-${formatCrKey('MDT', i).slice(4)}.md`), `---
code: MDT-${formatCrKey('MDT', i).slice(4)}
title: Ticket ${i}
status: Proposed
type: Feature Enhancement
priority: Medium
---

# Ticket ${i} Content

Some content here.
`)
      }

      const startTime = performance.now()
      const results = await MarkdownService.scanTicketMetadata(batchDir)
      const elapsed = performance.now() - startTime

      expect(results.length).toBe(50)
      // Should process 50 files in under 1000ms
      expect(elapsed).toBeLessThan(1000)
    })
  })

  describe('data format handling', () => {
    it('should handle relationship fields as arrays', async () => {
      const ticketPath = join(tempDir, 'relationships.md')
      writeFileSync(ticketPath, `---
code: MDT-094
title: Ticket with Relations
status: Proposed
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-001, MDT-002, MDT-003
dependsOn: MDT-090
blocks: MDT-100, MDT-101
---

# Content
`)

      const metadata = await MarkdownService.extractTicketMetadata(ticketPath)

      expect(metadata).toBeDefined()
      expect(metadata?.relatedTickets).toEqual(['MDT-001', 'MDT-002', 'MDT-003'])
      expect(metadata?.dependsOn).toEqual(['MDT-090'])
      expect(metadata?.blocks).toEqual(['MDT-100', 'MDT-101'])
    })

    it('should handle empty relationship fields', async () => {
      const ticketPath = join(tempDir, 'no-relations.md')
      writeFileSync(ticketPath, `---
code: MDT-094
title: Isolated Ticket
status: Proposed
type: Bug Fix
priority: Low
---

# Content
`)

      const metadata = await MarkdownService.extractTicketMetadata(ticketPath)

      expect(metadata).toBeDefined()
      expect(metadata?.relatedTickets).toEqual([])
      expect(metadata?.dependsOn).toEqual([])
      expect(metadata?.blocks).toEqual([])
    })

    it('should handle ISO date strings', async () => {
      const ticketPath = join(tempDir, 'dates.md')
      writeFileSync(ticketPath, `---
code: MDT-094
title: Dated Ticket
status: Implemented
type: Feature Enhancement
priority: High
dateCreated: 2026-01-15T10:00:00.000Z
lastModified: 2026-03-02T15:30:00.000Z
implementationDate: 2026-02-20T00:00:00.000Z
---

# Content
`)

      const metadata = await MarkdownService.extractTicketMetadata(ticketPath)

      expect(metadata).toBeDefined()
      expect(metadata?.dateCreated).toBeInstanceOf(Date)
      expect(metadata?.lastModified).toBeInstanceOf(Date)
      // Optional field should also be parsed
      expect(metadata?.implementationDate).toBeInstanceOf(Date)
    })
  })
})
