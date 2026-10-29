import type { RuntimeConfig } from '../../config/runtimeConfig.js'
import { randomBytes } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import {
  sanitizeSelectorState,
  validateGlobalConfig,
  validateUserConfig,
} from '@mdt/domain-contracts'
import { parseToml } from '@mdt/shared/utils/toml.js'

import { authorizeFilesystemPath, getProjectRoots } from '../../security/filesystemAccess.js'

interface ProjectDiscovery { getAllProjects?: () => Promise<Array<{ project?: { path?: string }, path?: string }>> }
/** Local system file/config operations; routers own admission and HTTP responses. */
export class SystemService {
  constructor(private catalog: ProjectDiscovery) {}
  async getAllowedFilesystemRoots(configDir: string, projectDiscovery: ProjectDiscovery, runtimeConfig: RuntimeConfig): Promise<string[]> {
    const config = await this.loadGlobalConfig(configDir)
    const projectRoots = await getProjectRoots(projectDiscovery)
    const roots = [
      ...config.discovery.searchPaths,
      ...projectRoots,
    ]

    if (runtimeConfig.system.isTest) {
      roots.push(os.tmpdir())
    }

    if (!runtimeConfig.system.isProduction) {
      roots.push(os.homedir())
    }

    return roots
  }

  async loadGlobalConfig(configDir: string) {
    try {
      const configPath = path.join(configDir, 'config.toml')
      const configContent = await fs.readFile(configPath, 'utf8')
      return validateGlobalConfig(parseToml(configContent))
    }
    catch {
      return validateGlobalConfig({})
    }
  }

  async loadUserConfig(configDir: string) {
    try {
      const userConfigPath = path.join(configDir, 'user.toml')
      const userConfigContent = await fs.readFile(userConfigPath, 'utf8')
      return validateUserConfig(parseToml(userConfigContent))
    }
    catch {
      return validateUserConfig({})
    }
  }

  async loadSelectorState(configDir: string) {
    try {
      const statePath = path.join(configDir, 'project-selector.json')
      const stateContent = await fs.readFile(statePath, 'utf8')
      return sanitizeSelectorState(JSON.parse(stateContent))
    }
    catch {
      return sanitizeSelectorState({})
    }
  }

  async checkDirectory(inputPath: string, runtimeConfig: RuntimeConfig) {
    const configDir = runtimeConfig.configDir
    const allowedRoots = await this.getAllowedFilesystemRoots(configDir, this.catalog, runtimeConfig)
    let expandedPath: string

    try {
      expandedPath = await authorizeFilesystemPath(inputPath, allowedRoots)
    }
    catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')) {
        throw error
      }

      const candidatePath = path.resolve(inputPath.startsWith('~') ? inputPath.replace(/^~($|\/)/, `${os.homedir()}$1`) : inputPath)

      if (!runtimeConfig.system.isTest) {
        await authorizeFilesystemPath(path.dirname(candidatePath), allowedRoots)
      }
      expandedPath = candidatePath
    }

    // Check if directory exists
    let exists = false

    try {
      const stats = await fs.stat(expandedPath)

      exists = stats.isDirectory()
    }
    catch {
      exists = false
    }

    // Check if path is within discovery search paths
    let isInDiscovery = 0

    try {
      const config = await this.loadGlobalConfig(configDir)
      const discoveryPaths = config.discovery.searchPaths

      // More precise matching: path must start with discovery path AND
      // either be exactly the discovery path OR have a separator after it
      for (const discoveryPath of discoveryPaths) {
        let expandedDiscoveryPath = discoveryPath

        if (discoveryPath.startsWith('~')) {
          const homeDir = os.homedir()

          expandedDiscoveryPath = discoveryPath.replace(/^~($|\/)/, `${homeDir}$1`)
        }

        if (expandedPath === expandedDiscoveryPath) {
          isInDiscovery = 1 // Exact match
          break
        }
        else if (expandedPath.startsWith(`${expandedDiscoveryPath}/`)) {
          isInDiscovery = 1 // Match with proper path separator
          break
        }
      }
    }
    catch (error) {
      console.warn('Could not check discovery paths:', error)
    }

    const result = {
      exists: exists ? 1 : 0,
      isInDiscovery,
      expandedPath,
    }

    return result
  }

  async writeSelectorState(configDir: string, state: unknown): Promise<void> {
    const statePath = path.join(configDir, 'project-selector.json')

    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true })

    // SEC-002: Atomic write for selector state JSON
    const tmpPath = `${statePath}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`
    try {
      await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8')
      await fs.rename(tmpPath, statePath)
    }
    catch (writeError) {
      // Clean up temp file on failure
      try {
        await fs.unlink(tmpPath)
      }
      catch {
        // best-effort cleanup
      }
      throw writeError
    }
  }
}
