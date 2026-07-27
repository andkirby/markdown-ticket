import type { ConfigSelector } from '@mdt/domain-contracts'
/**
 * Thin transport-only controller for configuration management endpoints (MDT-168).
 *
 * Routes/controllers are transport delegates: they parse/validate transport
 * input and delegate all logic to `ConfigApplicationService`. No filesystem or
 * TOML logic lives here (constraint C-7). All `/api/config/*` routes are
 * owner-only via `accessPolicy.ts` (constraint C-8).
 */
import type { Request, Response } from 'express'
import type { StorageAdapterResolver } from '../services/config/ConfigApplicationService.js'
import type { ConfigSideEffectRegistry } from '../services/config/ConfigSideEffectRegistry.js'
import { CONFIG_SELECTOR_ALLOWLIST, Exposure } from '@mdt/domain-contracts'
import { logger } from '@mdt/shared/utils/server-logger.js'
import {
  ConfigApplicationService,
  ConfigValidationError,
} from '../services/config/ConfigApplicationService.js'

/** Descriptor surfaced to the UI/API consumer for a readable selector. */
interface ConfigDescriptorDto {
  selector: string
  scope: string
  exposure: string
  ownerSurface: string
  validation: string
  value: unknown
}

interface ConfigControllerDeps {
  /** Resolves the storage adapter for a selector (knows project path). */
  adapterResolver: StorageAdapterResolver
  /** Injected post-write side effects (MDT-168: discovery/cache/tree/watcher). */
  sideEffects?: ConfigSideEffectRegistry
}

/**
 * Controller layer for configuration management HTTP endpoints.
 */
export class ConfigController {
  private readonly applicationService: ConfigApplicationService

  constructor(deps: ConfigControllerDeps) {
    this.applicationService = new ConfigApplicationService({
      adapterResolver: deps.adapterResolver,
      sideEffects: deps.sideEffects,
    })
  }

  /** Expose the service for route-level side-effect wiring. */
  getService(): ConfigApplicationService {
    return this.applicationService
  }

  /**
   * GET /api/config/selectors — return exposure metadata + effective values for
   * all allowlisted, readable selectors (file-only omitted). BR-1.1/BR-1.2.
   */
  async getSelectors(req: Request, res: Response): Promise<void> {
    try {
      const descriptors: ConfigDescriptorDto[] = []
      for (const selector of CONFIG_SELECTOR_ALLOWLIST) {
        if (selector.exposure === Exposure.FILE_ONLY) {
          continue
        }
        // Read may be unavailable for project-scope selectors when no project is
        // selected; metadata is still returned with an undefined value.
        let value: unknown
        try {
          const config = await this.applicationService.readScopeConfig(
            selector as ConfigSelector,
          )
          value = extractValue(selector.selector, config)
        }
        catch {
          value = undefined
        }
        descriptors.push({
          selector: selector.selector,
          scope: selector.scope,
          exposure: selector.exposure,
          ownerSurface: selector.ownerSurface,
          validation: selector.validation,
          value,
        })
      }
      res.json({ selectors: descriptors })
    }
    catch (error) {
      logger.error('Failed to read config selectors:', error)
      res.status(500).json({ error: 'Failed to read configuration selectors' })
    }
  }

  /**
   * PATCH /api/config — apply a scalar selector mutation. Validates strictly,
   * writes atomically via the resolved adapter, runs side effects. BR-2.x.
   *
   * Field-level errors on rejection (never converts invalid to default).
   */
  async patchConfig(req: Request, res: Response): Promise<void> {
    try {
      const { selector, value } = req.body ?? {}
      if (typeof selector !== 'string' || selector.length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Request body must include a non-empty "selector" string.',
          field: 'selector',
        })
        return
      }

      const result = await this.applicationService.applyConfig(selector, value)
      res.json({
        selector: result.selector,
        effective: extractValue(result.selector, result.effective),
        filePath: result.filePath,
        sideEffects: result.sideEffects,
      })
    }
    catch (error) {
      if (error instanceof ConfigValidationError) {
        // Field-level error naming the offending selector (stable contract C-9).
        res.status(400).json({
          error: 'Validation Error',
          selector: error.selector,
          message: error.message,
          field: error.selector,
        })
        return
      }
      logger.error('Failed to apply config patch:', error)
      res.status(500).json({ error: 'Failed to apply configuration change' })
    }
  }
}

/**
 * Extract the effective value for a dotted selector path from a config object.
 * Returns undefined if the path does not resolve.
 */
function extractValue(selector: string, config: unknown): unknown {
  if (config === null || typeof config !== 'object') {
    return undefined
  }
  const segments = selector.split('.')
  let node: unknown = config
  for (const seg of segments) {
    if (node === null || node === undefined || typeof node !== 'object') {
      return undefined
    }
    node = (node as Record<string, unknown>)[seg]
  }
  return node
}
