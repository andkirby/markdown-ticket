import { TitleExtractionService } from '../TitleExtractionService'

describe('TitleExtractionService filename fallback', () => {
  const service = new TitleExtractionService()

  it.each(['TP0-042', 'TP0-10000', 'AB123-99999', 'mdt-042'])('removes the complete canonical key from %s', (key) => {
    expect(service.extractFromFilename(`/tickets/${key}-my-title.md`)).toBe('my title')
  })

  it.each(['TP0-12', 'TP0-100000', 'TOOLONG-042'])('does not strip an invalid prefix from %s', (key) => {
    expect(service.extractFromFilename(`${key}-my-title.md`)).toBe(`${key.replace(/-/g, ' ')} my title`)
  })
})
