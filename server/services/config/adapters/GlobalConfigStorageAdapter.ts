/**
 * Global config storage adapter (MDT-168).
 *
 * Owns `{configDir}/config.toml`. Reads tolerantly via `validateGlobalConfig`
 * (catch-to-default for display); writes atomically via the shared async
 * atomic-write helper, preserving all unrelated fields.
 */
import type { GlobalConfig } from '@mdt/domain-contracts'
import type { ConfigStorageAdapter, ScopeWriteResult } from '../types.js'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { validateGlobalConfig } from '@mdt/domain-contracts'
import { parseToml, stringify } from '@mdt/shared/utils/toml.js'

export class GlobalConfigStorageAdapter implements ConfigStorageAdapter<GlobalConfig> {
  readonly scope = 'global' as const

  constructor(private readonly configDir: string) {}

  get filePath(): string {
    return path.join(this.configDir, 'config.toml')
  }

  async read(): Promise<GlobalConfig> {
    try {
      const content = await fs.readFile(this.filePath, 'utf8')
      return validateGlobalConfig(parseToml(content))
    }
    catch {
      return validateGlobalConfig({})
    }
  }

  async write(
    mutator: (current: GlobalConfig) => GlobalConfig,
  ): Promise<ScopeWriteResult> {
    const current = await this.read()
    const next = mutator(current)
    await this.atomicWrite(next)
    return { effective: next, filePath: this.filePath }
  }

  /**
   * Atomic write (SEC-002 pattern): write-temp-then-rename. Preserves unrelated
   * fields because `next` is the full merged config object, not a partial patch.
   */
  private async atomicWrite(config: GlobalConfig): Promise<void> {
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
