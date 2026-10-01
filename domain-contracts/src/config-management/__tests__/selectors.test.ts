import { describe, expect, it } from '@jest/globals'
import {
  allSelectorPaths,
  CONFIG_SELECTOR_ALLOWLIST,
  ConfigOwnerSurface,
  ConfigScope,
  editableSelectors,
  Exposure,
  findSelector,
  isAllowlisted,
  readableSelectors,
} from '../selectors'

describe('config-management selectors allowlist', () => {
  it('exposes the four exact exposure classification values', () => {
    expect(Exposure.EDITABLE).toBe('editable')
    expect(Exposure.GUARDED).toBe('guarded')
    expect(Exposure.READ_ONLY).toBe('readOnly')
    expect(Exposure.FILE_ONLY).toBe('fileOnly')
  })

  it('exposes the four exact scope values', () => {
    expect(ConfigScope.PROJECT).toBe('project')
    expect(ConfigScope.GLOBAL).toBe('global')
    expect(ConfigScope.USER).toBe('user')
    expect(ConfigScope.REGISTRY).toBe('registry')
  })

  it('every allowlisted selector carries scope, exposure, owner surface, and validation', () => {
    expect(CONFIG_SELECTOR_ALLOWLIST.length).toBeGreaterThan(0)
    for (const s of CONFIG_SELECTOR_ALLOWLIST) {
      expect(s.selector).toMatch(/^[a-z][a-zA-Z.]*$/)
      expect([ConfigScope.PROJECT, ConfigScope.GLOBAL, ConfigScope.USER, ConfigScope.REGISTRY]).toContain(s.scope)
      expect([Exposure.EDITABLE, Exposure.GUARDED, Exposure.READ_ONLY, Exposure.FILE_ONLY]).toContain(s.exposure)
      expect(typeof s.ownerSurface).toBe('string')
      expect(typeof s.validation).toBe('string')
      expect(s.validation.length).toBeGreaterThan(0)
    }
  })

  it('selector dotted paths are unique', () => {
    const paths = allSelectorPaths()
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('findSelector returns descriptor for allowlisted selector', () => {
    const s = findSelector('project.document.maxDepth')
    expect(s?.scope).toBe(ConfigScope.PROJECT)
    expect(s?.exposure).toBe(Exposure.EDITABLE)
    expect(s?.ownerSurface).toBe(ConfigOwnerSurface.DOCUMENTS_SETTINGS)
  })

  it('isAllowlisted is true for known selectors and false for unknown', () => {
    expect(isAllowlisted('project.name')).toBe(true)
    expect(isAllowlisted('totally.unknown.selector')).toBe(false)
  })

  it('readableSelectors excludes file-only selectors', () => {
    const readable = readableSelectors()
    expect(readable.every(s => s.exposure !== Exposure.FILE_ONLY)).toBe(true)
    // file-only selectors (project.id, startNumber, counterFile) are NOT present
    expect(readable.find(s => s.selector === 'project.id')).toBeUndefined()
    expect(readable.find(s => s.selector === 'project.startNumber')).toBeUndefined()
    expect(readable.find(s => s.selector === 'project.counterFile')).toBeUndefined()
  })

  it('editableSelectors returns only editable selectors', () => {
    const editable = editableSelectors()
    expect(editable.every(s => s.exposure === Exposure.EDITABLE)).toBe(true)
    expect(editable.find(s => s.selector === 'project.document.maxDepth')).toBeDefined()
    expect(editable.find(s => s.selector === 'project.code')).toBeUndefined() // guarded
    expect(editable.find(s => s.selector === 'project.path')).toBeUndefined() // readOnly
  })

  it('document selectors are owned by Documents settings', () => {
    for (const sel of ['project.document.paths', 'project.document.excludeFolders', 'project.document.maxDepth']) {
      expect(findSelector(sel)?.ownerSurface).toBe(ConfigOwnerSurface.DOCUMENTS_SETTINGS)
    }
  })

  it('guarded selectors include code, ticketsPath, and registry path', () => {
    expect(findSelector('project.code')?.exposure).toBe(Exposure.GUARDED)
    expect(findSelector('project.ticketsPath')?.exposure).toBe(Exposure.GUARDED)
    expect(findSelector('registry.project.path')?.exposure).toBe(Exposure.GUARDED)
  })

  it('read-only selectors are not editable', () => {
    const ro = findSelector('project.path')
    expect(ro?.exposure).toBe(Exposure.READ_ONLY)
  })
})
