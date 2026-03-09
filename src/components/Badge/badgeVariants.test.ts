/**
 * MDT-135: Badge Variants Unit Tests
 *
 * Tests centralized color mappings for all badge types.
 * Coverage: BR-2, BR-6, BR-7, C3, C5
 */

import { statusVariants, priorityVariants, typeVariants, contextVariants, relationshipVariants } from './badgeVariants'

describe('badgeVariants', () => {
  describe('statusVariants', () => {
    const allStatuses = [
      'Proposed',
      'Approved',
      'In Progress',
      'Implemented',
      'Rejected',
      'On Hold',
      'Partially Implemented',
    ]

    it.each(allStatuses)('should define classes for status "%s"', (status) => {
      const classes = statusVariants({ status })
      expect(classes).toBeTruthy()
      expect(classes.length).toBeGreaterThan(0)
    })

    it('should include dark mode classes for all statuses', () => {
      allStatuses.forEach((status) => {
        const classes = statusVariants({ status })
        expect(classes).toContain('dark:')
      })
    })

    it('should use consistent 950 shade for dark mode backgrounds', () => {
      allStatuses.forEach((status) => {
        const classes = statusVariants({ status })
        // All dark mode backgrounds should use 950 shade
        const darkBgMatch = classes.match(/dark:bg-(\w+)-(\d+)/)
        if (darkBgMatch) {
          expect(darkBgMatch[2]).toBe('950')
        }
      })
    })

    it('should return fallback for unknown status', () => {
      const classes = statusVariants({ status: 'Unknown Status' })
      expect(classes).toBeTruthy()
      // Should fall back to gray (neutral)
      expect(classes).toContain('gray')
    })
  })

  describe('priorityVariants', () => {
    const allPriorities = ['Critical', 'High', 'Medium', 'Low']

    it.each(allPriorities)('should define classes for priority "%s"', (priority) => {
      const classes = priorityVariants({ priority })
      expect(classes).toBeTruthy()
      expect(classes.length).toBeGreaterThan(0)
    })

    it('should use gradient styling for all priorities', () => {
      allPriorities.forEach((priority) => {
        const classes = priorityVariants({ priority })
        expect(classes).toContain('bg-gradient-to-r')
      })
    })

    it('should include dark mode classes for all priorities', () => {
      allPriorities.forEach((priority) => {
        const classes = priorityVariants({ priority })
        expect(classes).toContain('dark:')
      })
    })

    it('should return fallback for unknown priority', () => {
      const classes = priorityVariants({ priority: 'Unknown' })
      expect(classes).toBeTruthy()
    })
  })

  describe('typeVariants', () => {
    const allTypes = [
      'Feature Enhancement',
      'Bug Fix',
      'Architecture',
      'Technical Debt',
      'Documentation',
      'Research',
    ]

    it.each(allTypes)('should define classes for type "%s"', (type) => {
      const classes = typeVariants({ type })
      expect(classes).toBeTruthy()
      expect(classes.length).toBeGreaterThan(0)
    })

    it('should use gradient styling for all types', () => {
      allTypes.forEach((type) => {
        const classes = typeVariants({ type })
        expect(classes).toContain('bg-gradient-to-r')
      })
    })

    it('should include dark mode classes for all types', () => {
      allTypes.forEach((type) => {
        const classes = typeVariants({ type })
        expect(classes).toContain('dark:')
      })
    })

    it('should return fallback for unknown type', () => {
      const classes = typeVariants({ type: 'Unknown' })
      expect(classes).toBeTruthy()
    })
  })

  describe('contextVariants', () => {
    const allContexts = ['phase', 'assignee', 'worktree']

    it.each(allContexts)('should define classes for context "%s"', (variant) => {
      const classes = contextVariants({ variant })
      expect(classes).toBeTruthy()
      expect(classes.length).toBeGreaterThan(0)
    })

    it('should include dark mode classes for all contexts', () => {
      allContexts.forEach((variant) => {
        const classes = contextVariants({ variant })
        expect(classes).toContain('dark:')
      })
    })
  })

  describe('relationshipVariants', () => {
    const allRelationships = ['related', 'depends', 'blocks']

    it.each(allRelationships)('should define classes for relationship "%s"', (variant) => {
      const classes = relationshipVariants({ variant })
      expect(classes).toBeTruthy()
      expect(classes.length).toBeGreaterThan(0)
    })

    it('should include dark mode classes for all relationships', () => {
      allRelationships.forEach((variant) => {
        const classes = relationshipVariants({ variant })
        expect(classes).toContain('dark:')
      })
    })
  })
})
