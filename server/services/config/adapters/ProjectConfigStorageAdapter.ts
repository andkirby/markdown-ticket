/**
 * Project config storage adapter (MDT-168).
 *
 * Owns `{projectPath}/.mdt-config.toml`. Project config has a different shape
 * from global/user config: it tolerates legacy keys and uses the typed
 * ProjectDocumentPatch for the `[project.document]` section. Reads tolerantly;
 * writes atomically via write-temp-then-rename (SEC-002), preserving unrelated
 * fields.
 */
import type { LocalProjectConfig } from '@mdt/domain-contracts'
import type { ConfigStorageAdapter, ScopeWriteResult } from '../types.js'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { ProjectConfigWriteFileSchema } from '@mdt/domain-contracts'
import { CONFIG_FILES } from '@mdt/shared/utils/constants.js'
import { parseToml, stringify } from '@mdt/shared/utils/toml.js'

export class ProjectConfigStorageAdapter implements ConfigStorageAdapter<LocalProjectConfig> {
  readonly scope = 'project' as const

  constructor(private readonly projectPath: string) {}

  get filePath(): string {
    return path.join(this.projectPath, CONFIG_FILES.PROJECT_CONFIG)
  }

  async read(forWrite = false): Promise<LocalProjectConfig> {
    try {
      const content = await fs.readFile(this.filePath, 'utf8')
      // Display reads keep their legacy passthrough. write() validates its reload.
      return parseToml(content) as LocalProjectConfig
    }
    catch (error) {
      if (forWrite && (error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw error
      // Missing file -> minimal default shape; caller decides whether to create.
      return { project: { name: '', code: '', id: '' } } as LocalProjectConfig
    }
  }

  async write(
    mutator: (current: LocalProjectConfig) => LocalProjectConfig,
  ): Promise<ScopeWriteResult> {
    const current = ProjectConfigWriteFileSchema.parse(await this.read(true))
    // Already parsed data; the legacy adapter interface requires name/code even
    // though minimal persisted files have always been accepted here.
    const next = mutator(current as LocalProjectConfig)
    await this.atomicWrite(next)
    return { effective: next, filePath: this.filePath }
  }

  /**
   * Atomic write (SEC-002): write-temp-then-rename. Preserves unrelated fields
   * because `next` is the full merged config object, not a partial patch.
   * SEC-001 round-trip verification is the responsibility of the caller that
   * builds the candidate (the document patch command validates its fields).
   */
  private async atomicWrite(config: LocalProjectConfig): Promise<void> {
    const parentDir = path.dirname(this.filePath)
    await fs.mkdir(parentDir, { recursive: true })
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
