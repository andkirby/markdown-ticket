import type { PinState } from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project.js'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  parsePinStateOrDefault,
  validatePinState,
} from '@mdt/domain-contracts'
import { getConfigDir } from '@mdt/shared/utils/constants.js'

/**
 * MDT-197: Pin rail persistence (project-scoped per UAT 2026-10-30).
 *
 * Each project owns its pin set at `projects/{projectId}/pins.json` — the
 * document-favs storage pattern (DocumentFavStateService). The rail renders
 * only the current project's pins; pin sets never span projects.
 *
 * Migration: projects that have no pins file yet absorb matching pins from
 * the legacy user-global `pins.json` on first read (write-time validation
 * requires every pin's projectCode to equal the owning project's code, so
 * absorb is exactly the pins of that project). The legacy file is retained
 * as a backup and never written again.
 *
 * The service does NOT validate that the ticket still exists — that is the
 * client's "stale-pin rule" (drop silently on 404/410). On read, pins whose
 * projectCode no longer matches the owning project (e.g. project code was
 * renamed) are dropped by reconciliation.
 */
interface ProjectDiscovery {
  getAllProjects: () => Promise<Project[]>
}

export class PinStateService {
  private projectDiscovery: ProjectDiscovery

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery
  }

  async readReconciledState(projectRef: string): Promise<PinState> {
    const project = await this.resolveProject(projectRef)
    const state = await this.readStateWithMigration(project)
    const projectCode = project.project.code
    const pins = state.pins.filter(pin => pin.projectCode === projectCode)
    return { pins }
  }

  async writeState(projectRef: string, input: unknown): Promise<PinState> {
    const project = await this.resolveProject(projectRef)
    const state = validatePinState(input)
    const projectCode = project.project.code

    for (const pin of state.pins) {
      if (pin.projectCode !== projectCode) {
        throw new Error('Pin projectCode does not match owning project')
      }
    }

    await fs.mkdir(path.dirname(this.getStatePath(project)), { recursive: true })
    const statePath = this.getStatePath(project)
    const tmpPath = `${statePath}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`
    try {
      await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8')
      await fs.rename(tmpPath, statePath)
    }
    catch (writeError) {
      try {
        await fs.unlink(tmpPath)
      }
      catch {
        // best-effort cleanup
      }
      throw writeError
    }

    return state
  }

  async resolveProject(projectRef: string): Promise<Project> {
    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(p => p.id === projectRef || p.project.code === projectRef)

    if (!project) {
      throw new Error('Project not found')
    }

    return project
  }

  getStatePathForProjectId(projectId: string): string {
    return path.join(getConfigDir(), 'projects', projectId, 'pins.json')
  }

  getStatePath(project: Project): string {
    return this.getStatePathForProjectId(project.id)
  }

  /** Legacy pre-UAT location of the user-global pin set (backup only). */
  getLegacyStatePath(): string {
    return path.join(getConfigDir(), 'pins.json')
  }

  /**
   * Reads the project's pins file; on first read after the UAT upgrade
   * (file absent), absorbs matching pins from the legacy user-global
   * pins.json and seeds the project file. Absorb is best-effort: a failed
   * seed write still returns the absorbed pins in the response.
   */
  private async readStateWithMigration(project: Project): Promise<PinState> {
    try {
      const content = await fs.readFile(this.getStatePath(project), 'utf8')
      return parsePinStateOrDefault(JSON.parse(content))
    }
    catch (error: unknown) {
      // Check errno code directly — fs rejections can arrive as non-Error
      // values in wrapped realms (e.g. graceful-fs under jest).
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
      if (code !== 'ENOENT') {
        // File exists but is unreadable/malformed: parsePinStateOrDefault
        // already handles bad JSON content; anything else is unexpected.
        return { pins: [] }
      }

      // ENOENT: first read after upgrade — absorb from legacy file.
      const projectCode = project.project.code
      let legacy: PinState = { pins: [] }
      try {
        const content = await fs.readFile(this.getLegacyStatePath(), 'utf8')
        legacy = parsePinStateOrDefault(JSON.parse(content))
      }
      catch {
        return { pins: [] }
      }

      const mine = legacy.pins.filter(pin => pin.projectCode === projectCode)
      if (mine.length > 0) {
        try {
          await fs.mkdir(path.dirname(this.getStatePath(project)), { recursive: true })
          await fs.writeFile(this.getStatePath(project), JSON.stringify({ pins: mine }, null, 2), 'utf8')
        }
        catch {
          // best-effort seed; the absorbed pins still surface in this response
        }
      }
      return { pins: mine }
    }
  }
}
