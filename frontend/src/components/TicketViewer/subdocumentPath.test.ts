import { describe, expect, it } from 'bun:test'
import { resolveTicketDocumentSelectionPath, ROOT_DOCUMENT_PATH } from './subdocumentPath'

describe('resolveTicketDocumentSelectionPath', () => {
  it('returns root main only for the synthetic top-level main tab', () => {
    expect(resolveTicketDocumentSelectionPath({
      name: ROOT_DOCUMENT_PATH,
      kind: 'file',
      children: [],
    }, 'MDT-143')).toBe(ROOT_DOCUMENT_PATH)
  })

  it('maps nested namespace main tabs to the namespace root document', () => {
    expect(resolveTicketDocumentSelectionPath({
      name: ROOT_DOCUMENT_PATH,
      kind: 'file',
      children: [],
      filePath: 'MDT-143/bdd.md',
    }, 'MDT-143')).toBe('bdd')
  })
})
