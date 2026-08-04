import type { DocumentConfig, DocumentPreviewConfig, TicketsPath } from '@mdt/domain-contracts'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { DOCUMENT_PREVIEW_CONFIG_DEFAULTS, PROJECT_DOCUMENT_CONFIG_DEFAULTS } from '@mdt/domain-contracts'
import { DEFAULTS } from '@mdt/shared/utils/constants.js'
import { parseToml } from '@mdt/shared/utils/toml.js'

interface ProjectConfiguration {
  documentPaths: DocumentConfig['paths']
  excludeFolders: DocumentConfig['excludeFolders']
  maxDepth?: DocumentConfig['maxDepth']
  ticketsPath: TicketsPath | null
  /** MDT-221 — per-project HTML preview CSP relaxations (strict by default). */
  preview: DocumentPreviewConfig
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
        config.documentPaths = docPaths.filter(
          path => typeof path === 'string',
        )
      }

      // Parse exclude folders
      const exclFolders = parsed.project?.document?.excludeFolders

      if (exclFolders && Array.isArray(exclFolders)) {
        config.excludeFolders = exclFolders.filter(
          folder => typeof folder === 'string',
        )
      }

      const maxDepth = parsed.project?.document?.maxDepth

      if (typeof maxDepth === 'number' && Number.isInteger(maxDepth)) {
        config.maxDepth = maxDepth
      }

      // Parse tickets path from project section
      if (parsed.project) {
        // New format: project.ticketsPath
        if (
          parsed.project.ticketsPath
          && typeof parsed.project.ticketsPath === 'string'
        ) {
          config.ticketsPath = parsed.project.ticketsPath.trim()
        }
        // Legacy format: project.path
        else if (
          parsed.project.path
          && typeof parsed.project.path === 'string'
        ) {
          config.ticketsPath = parsed.project.path.trim()
        }
      }

      // Always ensure ticketsPath is in excludeFolders to prevent CR files from appearing in documents
      if (
        config.ticketsPath
        && !config.excludeFolders.includes(config.ticketsPath)
      ) {
        config.excludeFolders.push(config.ticketsPath)
      }

      // MDT-221: parse [project.document.preview] (strict by default).
      const preview = parsed.project?.document?.preview
      if (preview && typeof preview === 'object') {
        if (Array.isArray(preview.allowedExternalDomains)) {
          config.preview.allowedExternalDomains = preview.allowedExternalDomains.filter(
            (d: unknown) => typeof d === 'string' && d.trim().length > 0,
          )
        }
        if (typeof preview.allowUnsafeEval === 'boolean') {
          config.preview.allowUnsafeEval = preview.allowUnsafeEval
        }
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
      // MDT-168: canonical document default (resolves drift; was undefined).
      maxDepth: PROJECT_DOCUMENT_CONFIG_DEFAULTS.maxDepth,
      ticketsPath: null,
      // MDT-221: strict by default — no external domains, no unsafe-eval.
      preview: { ...DOCUMENT_PREVIEW_CONFIG_DEFAULTS },
    }
  }
}
