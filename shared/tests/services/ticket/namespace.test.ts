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
  })
})
