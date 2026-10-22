/**
 * Project config storage adapter (MDT-168).
 *
 * Owns `{projectPath}/.mdt-config.toml`. Project config has a different shape
 * from global/user config: it tolerates legacy keys and uses the typed
 * ProjectDocumentPatch for the `[project.document]` section. Reads tolerantly;
 * writes atomically via write-temp-then-rename (SEC-002), preserving unrelated
 * fields.
 */
import type { ProjectConfigDisplayFile } from '@mdt/domain-contracts'
import type { ConfigStorageAdapter, ScopeWriteResult } from '../types.js'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { ProjectConfigDisplayFileSchema, ProjectConfigWriteFileSchema } from '@mdt/domain-contracts'
import { CONFIG_FILES } from '@mdt/shared/utils/constants.js'
import { parseToml, stringify } from '@mdt/shared/utils/toml.js'

export class ProjectConfigStorageAdapter implements ConfigStorageAdapter<ProjectConfigDisplayFile> {
  readonly scope = 'project' as const

  constructor(private readonly projectPath: string) {}

  get filePath(): string {
    return path.join(this.projectPath, CONFIG_FILES.PROJECT_CONFIG)
  }

  async read(forWrite = false): Promise<ProjectConfigDisplayFile> {
    try {
      const content = await fs.readFile(this.filePath, 'utf8')
      // Display extraction and mutation reloads have separate contracts.
      return forWrite
        ? ProjectConfigWriteFileSchema.parse(parseToml(content))
        : ProjectConfigDisplayFileSchema.parse(parseToml(content))
    }
    catch (error) {
      if (forWrite && (error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw error
      // Missing file -> minimal default shape; caller decides whether to create.
      return { project: { name: '', code: '', id: '' } }
    }
  }

  async write(
    mutator: (current: ProjectConfigDisplayFile) => ProjectConfigDisplayFile,
  ): Promise<ScopeWriteResult> {
    const current = await this.read(true)
    const next = mutator(current)
    await this.atomicWrite(next)
    return { effective: next, filePath: this.filePath }
  }

  /**
   * Atomic write (SEC-002): write-temp-then-rename. Preserves unrelated fields
   * because `next` is the full merged config object, not a partial patch.
   * SEC-001 round-trip verification is the responsibility of the caller that
   * builds the candidate (the document patch command validates its fields).
   */
  private async atomicWrite(config: ProjectConfigDisplayFile): Promise<void> {
    const parentDir = path.dirname(this.filePath)
    await fs.mkdir(parentDir, { recursive: true })
    const tmpPath = `${this.filePath}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`
    try {
      await fs.writeFile(
        tmpPath,
        stringify(config),
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
