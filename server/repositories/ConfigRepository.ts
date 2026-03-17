import type { DocumentConfig, TicketsPath } from '@mdt/domain-contracts'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { DEFAULTS } from '@mdt/shared/utils/constants.js'
import { parseToml } from '@mdt/shared/utils/toml.js'

export interface ProjectConfiguration {
  documentPaths: DocumentConfig['paths']
  excludeFolders: DocumentConfig['excludeFolders']
  maxDepth?: DocumentConfig['maxDepth']
  ticketsPath: TicketsPath | null
}

/**
 * Repository for project configuration access.
 */
export class ConfigRepository {
  /**
   * Get project configuration.
   */
  async getConfig(projectPath: string): Promise<ProjectConfiguration> {
    const configPath = path.join(projectPath, '.mdt-config.toml')

    try {
      const content = await fs.readFile(configPath, 'utf8')

      return this._parseConfig(content)
    }
    catch {
      return this._getDefaultConfig()
    }
  }

  private _parseConfig(content: string): ProjectConfiguration {
    const config = this._getDefaultConfig()

    try {
      // Parse TOML content properly using TOML library
      const parsed = parseToml(content) as any

      // Parse document paths
      const docPaths = parsed.project?.document?.paths

      if (docPaths && Array.isArray(docPaths)) {
        config.documentPaths = docPaths.filter(path => typeof path === 'string')
      }

      // Parse exclude folders
      const exclFolders = parsed.project?.document?.excludeFolders

      if (exclFolders && Array.isArray(exclFolders)) {
        config.excludeFolders = exclFolders.filter(folder => typeof folder === 'string')
      }

      const maxDepth = parsed.project?.document?.maxDepth

      if (typeof maxDepth === 'number' && Number.isInteger(maxDepth)) {
        config.maxDepth = maxDepth
      }

      // Parse tickets path from project section
      if (parsed.project) {
        // New format: project.ticketsPath
        if (parsed.project.ticketsPath && typeof parsed.project.ticketsPath === 'string') {
          config.ticketsPath = parsed.project.ticketsPath.trim()
        }
        // Legacy format: project.path
        else if (parsed.project.path && typeof parsed.project.path === 'string') {
          config.ticketsPath = parsed.project.path.trim()
        }
      }

      // Always ensure ticketsPath is in excludeFolders to prevent CR files from appearing in documents
      if (config.ticketsPath && !config.excludeFolders.includes(config.ticketsPath)) {
        config.excludeFolders.push(config.ticketsPath)
      }
    }
    catch (error) {
      console.error('Failed to parse TOML configuration:', error)
      // Return default config if parsing fails - TOML files should be valid
    }

    return config
  }

  private _getDefaultConfig(): ProjectConfiguration {
    return {
      documentPaths: [],
      excludeFolders: [DEFAULTS.TICKETS_PATH, 'node_modules', '.git'],
      maxDepth: undefined,
      ticketsPath: null,
    }
  }
}
