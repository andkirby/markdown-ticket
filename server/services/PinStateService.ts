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
 * MDT-197: Pin rail persistence.
 *
 * Cross-project pinned tickets stored as one user-global file. Mirrors the
 * DocumentFavStateService shape (validate → atomic write → reset-on-bad-schema),
 * but with two deliberate divergences:
 *
 * 1. Scope: document favs are per-project (`projects/{id}/document-favs.json`);
 *    pins are user-global (`pins.json`) because each PinItem carries its own
 *    projectCode and the rail renders pins from many projects side by side.
 * 2. Eligibility: document favs validate paths against a per-project document
 *    tree; pins validate that each pin's projectCode matches a *known* project
 *    (rejects stale/junk project codes without needing a ticket lookup).
 *
 * The service does NOT validate that the ticket still exists — that is the
 * client's "stale-pin rule" (drop silently on 404/410). Pinning a ticket that
 * does not exist yet is allowed; deletion/out-of-scope is handled at read time
 * by the client, and at write time by rejecting only unknown *projects*.
 */
interface ProjectDiscovery {
  getAllProjects: () => Promise<Project[]>
}

export class PinStateService {
  private projectDiscovery: ProjectDiscovery

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery
  }

  async readState(): Promise<PinState> {
    try {
      const content = await fs.readFile(this.getStatePath(), 'utf8')
      return parsePinStateOrDefault(JSON.parse(content))
    }
    catch {
      return { pins: [] }
    }
  }

  async writeState(input: unknown): Promise<PinState> {
    const state = validatePinState(input)
    const knownProjectCodes = await this.getKnownProjectCodes()

    for (const pin of state.pins) {
      if (!knownProjectCodes.has(pin.projectCode)) {
        throw new Error('Unknown project in pin set')
      }
    }

    await fs.mkdir(path.dirname(this.getStatePath()), { recursive: true })
    const statePath = this.getStatePath()
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

  /**
   * Reconciles a state against currently-known projects: drops pins whose
   * projectCode is no longer registered. Used on read so a stale pin set
   * (project removed/unregistered) never surfaces dead entries.
   */
  async readReconciledState(): Promise<PinState> {
    const [state, knownProjectCodes] = await Promise.all([
      this.readState(),
      this.getKnownProjectCodes(),
    ])
    const pins = state.pins.filter(pin => knownProjectCodes.has(pin.projectCode))
    return { pins }
  }

  getStatePath(): string {
    return path.join(getConfigDir(), 'pins.json')
  }

  private async getKnownProjectCodes(): Promise<Set<string>> {
    const projects = await this.projectDiscovery.getAllProjects()
    return new Set(projects.map(p => p.project.code))
  }
}
