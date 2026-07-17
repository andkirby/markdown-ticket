/**
 * User config storage adapter (MDT-168).
 *
 * Owns `{configDir}/user.toml`. Reads tolerantly via `validateUserConfig`;
 * writes atomically, preserving unrelated fields.
 */
import type { UserConfig } from '@mdt/domain-contracts'
import type { ConfigStorageAdapter, ScopeWriteResult } from '../types.js'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { validateUserConfig } from '@mdt/domain-contracts'
import { parseToml, stringify } from '@mdt/shared/utils/toml.js'

export class UserConfigStorageAdapter implements ConfigStorageAdapter<UserConfig> {
  readonly scope = 'user' as const

  constructor(private readonly configDir: string) {}

  get filePath(): string {
    return path.join(this.configDir, 'user.toml')
  }

  async read(): Promise<UserConfig> {
    try {
      const content = await fs.readFile(this.filePath, 'utf8')
      return validateUserConfig(parseToml(content))
    }
    catch {
      return validateUserConfig({})
    }
  }

  async write(
    mutator: (current: UserConfig) => UserConfig,
  ): Promise<ScopeWriteResult> {
    const current = await this.read()
    const next = mutator(current)
    await this.atomicWrite(next)
    return { effective: next, filePath: this.filePath }
  }

  private async atomicWrite(config: UserConfig): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true })
    const tmpPath = `${this.filePath}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`
    try {
      await fs.writeFile(
        tmpPath,
        stringify(config as unknown as Record<string, unknown>),
        'utf8',
      )
      await fs.rename(tmpPath, this.filePath)
    }
    catch (writeError) {
      try {
        await fs.unlink(tmpPath)
      }
      catch {
        // ignore cleanup failure
      }
      throw writeError
    }
  }
}
