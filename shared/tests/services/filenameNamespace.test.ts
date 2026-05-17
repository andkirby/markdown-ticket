import { parseFilenameNamespace, sortFilenameNamespaceKeys } from '../../services/filenameNamespace.js'

describe('filename namespace helpers', () => {
  describe('parseFilenameNamespace', () => {
    it('returns null for names without a variant suffix', () => {
      expect(parseFilenameNamespace('architecture')).toBeNull()
    })

    it('splits on the first dot and preserves later dot segments in the variant key', () => {
      expect(parseFilenameNamespace('some-name.alpha.beta')).toEqual({
        baseName: 'some-name',
        variantKey: 'alpha.beta',
      })
    })

    it('does not merge similar prefixes with different computed bases', () => {
      expect(parseFilenameNamespace('some-name-extra.one')).toEqual({
        baseName: 'some-name-extra',
        variantKey: 'one',
      })
    })
  })

  describe('sortFilenameNamespaceKeys', () => {
    it('sorts variant labels alphanumerically with numeric awareness', () => {
      expect(sortFilenameNamespaceKeys(['two', '10', '2', 'one', '1'])).toEqual([
        '1',
        '2',
        '10',
        'one',
        'two',
      ])
    })
  })
})
