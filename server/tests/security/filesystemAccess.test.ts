/// <reference types="jest" />

import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { authorizeFilesystemPath, FilesystemAccessDeniedError, isPathInsideAllowedRoots } from '../../security/filesystemAccess'

describe('filesystemAccess', () => {
  let root: string
  let outside: string

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'mdt-root-'))
    outside = await fs.mkdtemp(path.join(os.tmpdir(), 'mdt-outside-'))
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
    await fs.rm(outside, { recursive: true, force: true })
  })

  it('allows paths inside configured roots', async () => {
    const child = path.join(root, 'child')
    await fs.mkdir(child)

    await expect(authorizeFilesystemPath(child, [root])).resolves.toBe(await fs.realpath(child))
  })

  it('denies paths outside configured roots', async () => {
    await expect(authorizeFilesystemPath(outside, [root])).rejects.toBeInstanceOf(FilesystemAccessDeniedError)
  })

  it('denies when no allowed roots are configured', async () => {
    await expect(authorizeFilesystemPath(root, [])).rejects.toBeInstanceOf(FilesystemAccessDeniedError)
  })

  it('denies malformed percent-encoded paths without leaking server errors', async () => {
    await expect(authorizeFilesystemPath('%E0%A4%A', [root])).rejects.toBeInstanceOf(FilesystemAccessDeniedError)
  })

  it('denies symlink escapes', async () => {
    const link = path.join(root, 'link')
    await fs.symlink(outside, link)

    await expect(authorizeFilesystemPath(link, [root])).rejects.toBeInstanceOf(FilesystemAccessDeniedError)
  })

  it('does path containment with separators, not simple prefixes', () => {
    expect(isPathInsideAllowedRoots('/tmp/root-evil', ['/tmp/root'])).toBe(false)
    expect(isPathInsideAllowedRoots('/tmp/root/child', ['/tmp/root'])).toBe(true)
  })
})
