import { groupNamespacedFiles, parseNamespace } from '../../../services/ticket/subdocuments/namespace.js'

describe('ticket namespace helpers', () => {
  describe('parseNamespace', () => {
    it('returns null for non-namespaced files', () => {
      expect(parseNamespace('architecture')).toBeNull()
    })

    it('preserves multi-dot subkeys', () => {
      expect(parseNamespace('architecture.api.v2')).toEqual({
        namespace: 'architecture',
        subKey: 'api.v2',
      })
    })

    it('matches shared filename namespace first-dot parsing semantics', () => {
      expect(parseNamespace('some-name.alpha.beta')).toEqual({
        namespace: 'some-name',
        subKey: 'alpha.beta',
      })
    })
  })

  describe('groupNamespacedFiles', () => {
    it('groups root files and dot-notation files into one namespace folder', () => {
      const result = groupNamespacedFiles(
        ['architecture', 'architecture.approve-it', 'requirements'],
        new Set<string>(),
        'MDT-138',
      )
      const architecture = result[0]

      expect(result.map(entry => entry.name)).toEqual(['architecture', 'requirements'])
      expect(architecture).toBeDefined()
      expect(architecture).toMatchObject({
        name: 'architecture',
        kind: 'folder',
        children: [
          { name: 'main' },
          { name: 'approve-it' },
        ],
      })
    })

    it('sorts numeric-looking namespace children predictably', () => {
      const result = groupNamespacedFiles(
        ['architecture.10', 'architecture.2', 'architecture.1'],
        new Set<string>(),
        'MDT-169',
      )
      const architecture = result[0]

      expect(architecture.children?.map(child => child.name)).toEqual(['1', '2', '10'])
    })
  })
})
