import fs from 'node:fs'
import process from 'node:process'

describe.each(['ProjectValidator', 'ProjectValidator.node'])('%s platform-specific system root checks', (moduleName) => {
  let validator: typeof import('../../ProjectValidator.js').ProjectValidator
  let realpath: jest.SpyInstance
  const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!

  beforeEach(() => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    realpath = jest.spyOn(fs, 'realpathSync').mockImplementation((input) => {
      const path = String(input)
      if (path === '/etc' || path === '/alias-to-system-root')
        return '/private/etc'
      return path
    })
    jest.isolateModules(() => {
      // Load after installing the filesystem spy, including the browser-safe fallback.
      // eslint-disable-next-line ts/no-require-imports
      validator = require(`../../${moduleName}.js`).ProjectValidator
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    Object.defineProperty(process, 'platform', originalPlatform)
  })

  it('does not probe Linux mount roots while validating an unrelated macOS directory', () => {
    expect(validator.validateTicketsPath('/workspace/tickets')).toEqual({ valid: true, normalized: '/workspace/tickets' })
    for (const foreignRoot of ['/home', '/boot', '/mnt', '/media', '/proc', '/sys', '/run', '/srv', '/root', '/lib', '/lib64']) {
      expect(realpath).not.toHaveBeenCalledWith(foreignRoot)
    }
  })

  it.each(['/', '/etc', '/var', '/tmp', '/usr', '/usr/local', '/Applications', '/System', '/Users', '/Volumes'])('still rejects native system root %s', (root) => {
    expect(validator.validateTicketsPath(root).valid).toBe(false)
  })

  it('still rejects symlinks to protected roots', () => {
    expect(validator.validateTicketsPath('/alias-to-system-root').valid).toBe(false)
  })

  it('allows subdirectories of system roots', () => {
    expect(validator.validateTicketsPath('/usr/local/project/tickets').valid).toBe(true)
  })

  it('retains Linux system-root checks on Linux', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    expect(validator.validateTicketsPath('/home').valid).toBe(false)
    expect(validator.validateTicketsPath('/proc').valid).toBe(false)
  })
})
