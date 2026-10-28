import { describe, expect, it } from 'bun:test'
import { createLinkContext, LinkNormalizer } from './linkNormalization'

describe('MDT-265 link normalization', () => {
  for (const key of ['TP0-042', 'TP0-10000', 'AB123-99999', 'CR-A001']) {
    const project = key.split('-')[0]
    it(`normalizes ${key} without losing the anchor`, () => {
      const context = createLinkContext({ currentProject: project, sourcePath: 'docs/guide.md' })
      expect(LinkNormalizer.normalizeLink(`${key}.md#intro`, context)).toMatchObject({
        type: 'ticket',
        isValid: true,
        webHref: `/prj/${project}/ticket/${key}#intro`,
      })
    })
  }
  it('keeps malformed keys as ordinary documents', () => {
    const context = createLinkContext({ currentProject: 'TP0', sourcePath: 'docs/guide.md' })
    for (const key of ['TP0-12', 'TP0-100000', 'TOOLONG-042', 'tp0-042']) {
      expect(LinkNormalizer.normalizeLink(`${key}.md`, context).type).toBe('document')
    }
  })
})
