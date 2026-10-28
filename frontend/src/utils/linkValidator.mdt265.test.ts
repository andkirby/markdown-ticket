import { afterAll, afterEach, describe, expect, it, spyOn } from 'bun:test'
import { validateAllReferences } from './linkValidator'

describe('MDT-265 ticket token validation', () => {
  const warn = spyOn(console, 'warn').mockImplementation(() => {})
  afterEach(() => warn.mockClear())
  afterAll(() => warn.mockRestore())

  it('scans alphanumeric and five-digit keys without accepting invalid suffixes', () => {
    const container = document.createElement('div')
    container.textContent = 'TP0-042 TP0-10000 TP0-12 TP0-100000 LONGTP0-042 1TP0-042 TP0-042x tp0-042'
    validateAllReferences(container)
    expect(warn.mock.calls.at(-1)?.[0]).toBe('📊 Summary: 0 success, 2 failures')
  })

  it('validates real anchors and skips code', () => {
    const container = document.createElement('div')
    container.innerHTML = '<a href="/prj/TP0/ticket/TP0-042">TP0-042</a><code>TP0-10000</code>'
    validateAllReferences(container)
    expect(warn.mock.calls.at(-1)?.[0]).toBe('📊 Summary: 1 success, 0 failures')
  })
})
