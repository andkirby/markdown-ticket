import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { CRTypes } from '@mdt/domain-contracts'
import { TemplateService } from '../../../services/TemplateService.js'
import { inspectTicketContent } from '../../../services/ticket/content-inspection.js'

describe('MDT-261 template catalog', () => {
  it.each(CRTypes)('built-in and fallback remain inspectable for %s', (type) => {
    const bundled = new TemplateService(undefined, true).getTemplate(type)
    const fallback = new TemplateService('/nonexistent-mdt-261-templates', true).getTemplate(type)
    expect(bundled.template).toBe(fallback.template)
    expect(bundled.template).toContain('<!-- mdt:placeholder:')
    expect(inspectTicketContent(bundled.template, { ticketKey: 'TEST-001', filePath: 'tickets/TEST-001.md', status: 'Proposed' }).length).toBeGreaterThan(0)
    expect(bundled.template).not.toContain('To be filled during/after implementation')
  })
  it('explicit custom file overrides retain their content and metadata', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mdt261-template-'))
    try {
      writeFileSync(join(directory, 'templates.json'), JSON.stringify({
        Research: { file: 'custom.md', requiredFields: ['title'], sections: [{ name: 'Question', required: true, placeholder: 'Custom prompt' }] },
      }))
      writeFileSync(join(directory, 'custom.md'), '# Custom content\n\nActual external template text.\n')
      expect(new TemplateService(directory, true).getTemplate('Research')).toEqual({
        type: 'Research',
        requiredFields: ['title'],
        sections: [{ name: 'Question', required: true, placeholder: 'Custom prompt' }],
        template: '# Custom content\n\nActual external template text.\n',
      })
    }
    finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
  it('generated file projections match the compiled catalog', () => {
    expect(() => execFileSync('bun', ['scripts/generate-ticket-templates.ts', '--check'], { cwd: resolve(__dirname, '../../../..'), stdio: 'pipe' })).not.toThrow()
  })
})
