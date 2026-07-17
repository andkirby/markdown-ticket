import type { ConfigSideEffect } from '../../../services/config/ConfigSideEffectRegistry.js'
import { describe, expect, it } from '@jest/globals'
import { ConfigSideEffectRegistry } from '../../../services/config/ConfigSideEffectRegistry.js'

describe('ConfigSideEffectRegistry', () => {
  it('runs only effects matching the scope', async () => {
    const ran: string[] = []
    const effects: ConfigSideEffect[] = [
      {
        name: 'doc-tree',
        triggers: ['project'],
        run: async () => {
          ran.push('doc-tree')
          return { name: 'doc-tree', ok: true }
        },
      },
      {
        name: 'discovery',
        triggers: ['global'],
        run: async () => {
          ran.push('discovery')
          return { name: 'discovery', ok: true }
        },
      },
    ]
    const registry = new ConfigSideEffectRegistry(effects)
    const results = await registry.runForScope('project')
    expect(ran).toEqual(['doc-tree'])
    expect(results).toHaveLength(1)
    expect(results[0].ok).toBe(true)
  })

  it('reports an effect failure distinctly (does not throw)', async () => {
    const effects: ConfigSideEffect[] = [
      { name: 'failing', triggers: ['project'], run: async () => { throw new Error('watcher down') } },
    ]
    const registry = new ConfigSideEffectRegistry(effects)
    const results = await registry.runForScope('project')
    expect(results[0].ok).toBe(false)
    expect(results[0].message).toContain('watcher down')
  })

  it('hasEffectsForScope reflects registration', () => {
    const registry = new ConfigSideEffectRegistry([
      { name: 'x', triggers: ['global'], run: async () => ({ name: 'x', ok: true }) },
    ])
    expect(registry.hasEffectsForScope('global')).toBe(true)
    expect(registry.hasEffectsForScope('project')).toBe(false)
  })
})
