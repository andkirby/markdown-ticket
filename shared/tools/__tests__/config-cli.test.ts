import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ConfigError, ConfigManager } from '../config-cli.js'

/**
 * Tests for the config CLI's ConfigManager, focused on the +/- array-mutation
 * contract added to `set`. Each test gets an isolated temp config file.
 */
describe('ConfigManager array mutation (+/-)', () => {
  let tmpDir: string
  let configPath: string
  let mgr: ConfigManager

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdt-cfg-'))
    configPath = path.join(tmpDir, 'config.toml')
    mgr = new ConfigManager(configPath)
    // Write an isolated default file so readConfig parses from disk each time
    // (getDefaultConfig returns a shared mutable singleton otherwise).
    await mgr.writeConfig(mgr.getDefaultConfig())
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  const searchPaths = () => mgr.get('discovery.searchPaths')

  it('appends a single item with + prefix', async () => {
    await mgr.set('discovery.searchPaths', '+/a')
    await expect(searchPaths()).resolves.toEqual(['/a'])
    await mgr.set('discovery.searchPaths', '+/b')
    await expect(searchPaths()).resolves.toEqual(['/a', '/b'])
  })

  it('adds multiple comma-separated items with one +', async () => {
    await mgr.set('discovery.searchPaths', '+/a')
    await mgr.set('discovery.searchPaths', '+/b, /c')
    await expect(searchPaths()).resolves.toEqual(['/a', '/b', '/c'])
  })

  it('skips duplicates on add (preserves first-seen order)', async () => {
    await mgr.set('discovery.searchPaths', '+/a, /b')
    await mgr.set('discovery.searchPaths', '+/a')
    await expect(searchPaths()).resolves.toEqual(['/a', '/b'])
  })

  it('removes a matching item with - prefix', async () => {
    await mgr.set('discovery.searchPaths', '+/a, /b, /c')
    await mgr.set('discovery.searchPaths', '-/b')
    await expect(searchPaths()).resolves.toEqual(['/a', '/c'])
  })

  it('removes multiple comma-separated items with one -', async () => {
    await mgr.set('discovery.searchPaths', '+/a, /b, /c')
    await mgr.set('discovery.searchPaths', '-/a, /c')
    await expect(searchPaths()).resolves.toEqual(['/b'])
  })

  it('remove is a safe no-op for items not present', async () => {
    await mgr.set('discovery.searchPaths', '+/a')
    await mgr.set('discovery.searchPaths', '-/nope')
    await expect(searchPaths()).resolves.toEqual(['/a'])
  })

  it('rejects + on a boolean scalar key', async () => {
    await expect(mgr.set('discovery.autoDiscover', '+true')).rejects.toBeInstanceOf(ConfigError)
  })

  it('rejects - on a number scalar key', async () => {
    await expect(mgr.set('discovery.maxDepth', '-3')).rejects.toBeInstanceOf(ConfigError)
  })

  it('rejects +/- with no items after the prefix', async () => {
    await expect(mgr.set('discovery.searchPaths', '+')).rejects.toThrow(/No items specified after '\+'/u)
    await expect(mgr.set('discovery.searchPaths', '-')).rejects.toThrow(/No items specified after '-'/u)
  })

  it('reports the kind in the error for an unknown/unset key', async () => {
    await expect(mgr.set('discovery.totallyUnknown', '+/a')).rejects.toThrow(/is unset/u)
  })

  it('full replace (no prefix) still works and overwrites the array', async () => {
    await mgr.set('discovery.searchPaths', '+/a, /b')
    await mgr.set('discovery.searchPaths', '/x, /y')
    await expect(searchPaths()).resolves.toEqual(['/x', '/y'])
  })

  it('clears the array via empty replace', async () => {
    await mgr.set('discovery.searchPaths', '+/a, /b')
    await mgr.set('discovery.searchPaths', '')
    await expect(searchPaths()).resolves.toEqual([])
  })

  it('works generically for cloudSync.allowedOrigins', async () => {
    await mgr.set('cloudSync.allowedOrigins', '+https://a.com')
    await mgr.set('cloudSync.allowedOrigins', '+https://b.com')
    await mgr.set('cloudSync.allowedOrigins', '-https://a.com')
    await expect(mgr.get('cloudSync.allowedOrigins')).resolves.toEqual(['https://b.com'])
  })

  it('persists to TOML and round-trips through a fresh reader', async () => {
    await mgr.set('discovery.searchPaths', '+/a, /b')
    const fresh = new ConfigManager(configPath)
    const config = await fresh.readConfig()
    expect(config.discovery.searchPaths).toEqual(['/a', '/b'])
  })
})

describe('ConfigManager scalar parsing (unchanged behavior)', () => {
  let tmpDir: string
  let mgr: ConfigManager

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdt-cfg-'))
    mgr = new ConfigManager(path.join(tmpDir, 'config.toml'))
    await mgr.writeConfig(mgr.getDefaultConfig())
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('parses booleans', async () => {
    await mgr.set('discovery.autoDiscover', 'false')
    await expect(mgr.get('discovery.autoDiscover')).resolves.toBe(false)
  })

  it('parses numbers', async () => {
    await mgr.set('discovery.maxDepth', '7')
    await expect(mgr.get('discovery.maxDepth')).resolves.toBe(7)
  })
})
