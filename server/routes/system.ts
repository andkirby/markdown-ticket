import type { Request, Response } from 'express'
import type { ProjectController } from '../controllers/ProjectController.js'
import type FileWatcherService from '../fileWatcherService.js'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import { getConfigDir } from '@mdt/shared/utils/constants.js'
import { logger } from '@mdt/shared/utils/server-logger.js'
import { Router } from 'express'
import * as toml from 'toml'

interface FileInvoker {
  clearCache: () => void
  invalidateFile: (filePath: string) => void
}

interface ProjectDiscovery {
  clearCache?: () => void | Promise<void>
}

/**
 * Router for system-related endpoints (status, directories, filesystem, config).
 *
 * @param fileWatcher - File watcher service instance.
 * @param projectController - Project controller instance.
 * @param projectDiscovery - Project discovery service.
 * @param fileInvoker - File operation invoker for cache management.
 * @returns Express router.
 */
export function createSystemRouter(
  fileWatcher: FileWatcherService,
  projectController: ProjectController,
  projectDiscovery: ProjectDiscovery,
  fileInvoker: FileInvoker,
): Router {
  const router = Router()

  /**
   * @openapi
   * /api/status:
   *   get:
   *     tags: [System]
   *     summary: Server health status
   *     description: Returns server health, uptime info, and SSE client count
   *     responses:
   *       200:
   *         description: Server status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, example: ok }
   *                 message: { type: string }
   *                 tasksDir: { type: string }
   *                 timestamp: { type: string, format: date-time }
   *                 sseClients: { type: integer }
   */
  router.get('/status', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: 'Ticket board server is running',
      tasksDir: process.env.TICKETS_DIR || './sample-tasks',
      timestamp: new Date().toISOString(),
      sseClients: fileWatcher.getClientCount(),
    })
  })

  /**
   * @openapi
   * /api/directories:
   *   get:
   *     tags: [System]
   *     summary: System directories for path selection
   *     description: Returns home and common directories for project path browsing
   *     responses:
   *       200:
   *         description: Directory list
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 home: { type: string }
   *                 directories: { type: array, items: { type: string } }
   */
  router.get('/directories', (req: Request, res: Response) => {
    projectController.getSystemDirectories(req, res)
  })

  /**
   * @openapi
   * /api/config/links:
   *   get:
   *     tags: [System]
   *     summary: Get link configuration
   *     description: Returns link auto-detection and preview settings
   *     responses:
   *       200:
   *         description: Link config
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties: { type: boolean }
   *       404:
   *         description: Config not found
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error404' }
   */
  router.get('/config/links', async (req: Request, res: Response) => {
    try {
      const configDir = getConfigDir()
      const configPath = path.join(configDir, 'config.toml')
      const configData = await fs.readFile(configPath, 'utf8')

      // Simple TOML parsing for [links] section
      const linkSection = configData.match(/\[links\]([\s\S]*?)(?=\[|$)/)

      if (linkSection) {
        const linkConfig: Record<string, boolean> = {}
        const lines = linkSection[1].split('\n')

        for (const line of lines) {
          const match = line.trim().match(/^(\w+)\s*=\s*(true|false)$/)

          if (match) {
            linkConfig[match[1]] = match[2] === 'true'
          }
        }

        res.json(linkConfig)
      }
      else {
        res.status(404).json({ error: 'Link configuration not found' })
      }
    }
    catch {
      res.status(404).json({ error: 'Configuration file not found' })
    }
  })

  /**
   * @openapi
   * /api/filesystem:
   *   get:
   *     tags: [System]
   *     summary: Browse file system tree
   *     description: Returns directory tree for path selection UI
   *     parameters:
   *       - name: path
   *         in: query
   *         schema: { type: string }
   *         description: Root path to browse (defaults to home)
   *     responses:
   *       200:
   *         description: File system tree
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 path: { type: string }
   *                 children: { type: array, items: { type: object } }
   */
  router.get('/filesystem', (req: Request, res: Response) => {
    projectController.getFileSystemTree(req, res)
  })

  /**
   * @openapi
   * /api/filesystem/exists:
   *   post:
   *     tags: [System]
   *     summary: Check if directory exists
   *     description: Validates path existence and checks if within discovery paths
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [path]
   *             properties:
   *               path: { type: string, description: 'Path to check (supports ~)' }
   *     responses:
   *       200:
   *         description: Path status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 exists: { type: integer, enum: [0, 1] }
   *                 isInDiscovery: { type: integer, enum: [0, 1] }
   *                 expandedPath: { type: string }
   *       400:
   *         description: Invalid path
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error400' }
   */
  router.post('/filesystem/exists', async (req: Request, res: Response) => {
    const { path: inputPath } = req.body

    if (!inputPath || typeof inputPath !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Path is required and must be a string' })
    }

    try {
      // Server-side tilde expansion for security and consistency
      let expandedPath = inputPath

      if (inputPath.startsWith('~')) {
        const homeDir = os.homedir()

        expandedPath = inputPath.replace(/^~($|\/)/, `${homeDir}$1`)
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
        const configDir = getConfigDir()
        const configPath = path.join(configDir, 'config.toml')
        const configContent = await fs.readFile(configPath, 'utf8')
        const parsedConfig = toml.parse(configContent)
        const discoveryPaths = parsedConfig.discovery?.searchPaths || []

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

      res.json(result)
    }
    catch (error) {
      console.error('Error checking directory existence:', error)
      res.status(500).json({ error: 'Failed to check directory existence' })
    }
  })

  /**
   * @openapi
   * /api/cache/clear:
   *   post:
   *     tags: [System]
   *     summary: Clear file operation cache
   *     description: Clears cached file operations to force fresh reads
   *     responses:
   *       200:
   *         description: Cache cleared
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 timestamp: { type: string, format: date-time }
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error500' }
   */
  router.post('/cache/clear', async (req: Request, res: Response) => {
    try {
      logger.info('🗑️  Clearing file operation cache')
      fileInvoker.clearCache()
      res.json({
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString(),
      })
    }
    catch (error) {
      console.error('Error clearing cache:', error)
      res.status(500).json({ error: 'Failed to clear cache' })
    }
  })

  /**
   * @openapi
   * /api/config:
   *   get:
   *     tags: [System]
   *     summary: Get frontend configuration
   *     description: Returns discovery settings for frontend display
   *     responses:
   *       200:
   *         description: Config settings
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 configDir: { type: string }
   *                 discovery:
   *                   type: object
   *                   properties:
   *                     autoDiscover: { type: boolean }
   *                     searchPaths: { type: array, items: { type: string } }
   *                     maxDepth: { type: integer }
   */
  router.get('/config', async (req: Request, res: Response) => {
    try {
      const configDir = getConfigDir()
      const configPath = path.join(configDir, 'config.toml')

      logger.debug(`Reading config from: ${configPath}`)

      try {
        const configContent = await fs.readFile(configPath, 'utf8')
        const parsedConfig = toml.parse(configContent)

        // Extract configuration using proper TOML parsing
        const response = {
          configDir,
          discovery: {
            autoDiscover: parsedConfig.discovery?.autoDiscover ?? true,
            searchPaths: parsedConfig.discovery?.searchPaths ?? [],
            maxDepth: parsedConfig.discovery?.maxDepth ?? 3,
          },
        }

        res.json(response)
      }
      catch {
        // Config file doesn't exist, return defaults
        const response = {
          configDir,
          discovery: {
            autoDiscover: true,
            searchPaths: [],
            maxDepth: 3,
          },
        }

        res.json(response)
      }
    }
    catch (error) {
      console.error('Error reading config:', error)
      res.status(500).json({ error: 'Failed to read config' })
    }
  })

  /**
   * @openapi
   * /api/config/global:
   *   get:
   *     tags: [System]
   *     summary: Get global configuration
   *     description: Returns full global config including discovery, links, ui, system settings
   *     responses:
   *       200:
   *         description: Full global config
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 discovery: { type: object }
   *                 links: { type: object }
   *                 ui: { type: object }
   *                 system: { type: object }
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error500' }
   */
  router.get('/config/global', async (req: Request, res: Response) => {
    try {
      const configDir = getConfigDir()
      const configPath = path.join(configDir, 'config.toml')

      logger.debug(`Reading global config from: ${configPath}`)

      try {
        const configContent = await fs.readFile(configPath, 'utf8')
        const parsedConfig = toml.parse(configContent)

        res.json(parsedConfig)
      }
      catch {
        // Config file doesn't exist, return default config
        const defaultConfig = {
          discovery: {
            autoDiscover: true,
            searchPaths: [],
            maxDepth: 3,
          },
          links: {
            enableAutoLinking: true,
            enableTicketLinks: true,
            enableDocumentLinks: true,
            enableHoverPreviews: false,
            linkValidation: false,
          },
          ui: {
            theme: 'auto',
            autoRefresh: true,
            refreshInterval: 5000,
          },
          system: {
            logLevel: 'info',
            cacheTimeout: 30000,
          },
        }

        res.json(defaultConfig)
      }
    }
    catch (error) {
      console.error('Error reading global config:', error)
      res.status(500).json({ error: 'Failed to read global config' })
    }
  })

  /**
   * @openapi
   * /api/config/clear:
   *   post:
   *     tags: [System]
   *     summary: Clear config cache
   *     description: Clears project discovery and configuration cache
   *     responses:
   *       200:
   *         description: Cache cleared
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 timestamp: { type: string, format: date-time }
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error500' }
   */
  router.post('/config/clear', async (req: Request, res: Response) => {
    try {
      // Clear project discovery cache if it has one
      if (projectDiscovery.clearCache) {
        projectDiscovery.clearCache()
      }

      logger.info('🔄 Config cache cleared')
      res.json({
        success: true,
        message: 'Config cache cleared successfully',
        timestamp: new Date().toISOString(),
      })
    }
    catch (error) {
      console.error('Error clearing config cache:', error)
      res.status(500).json({ error: 'Failed to clear config cache' })
    }
  })

  /**
   * @openapi
   * /api/config/selector:
   *   get:
   *     tags: [System]
   *     summary: Get project selector configuration and state
   *     description: Returns preferences from user.toml and state from project-selector.json
   *     responses:
   *       200:
   *         description: Selector configuration and state
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 preferences:
   *                   type: object
   *                   properties:
   *                     visibleCount:
   *                       type: integer
   *                       description: Number of visible projects in selector
   *                       example: 7
   *                     compactInactive:
   *                       type: boolean
   *                       description: Whether to compact inactive projects
   *                       example: true
   *                 selectorState:
   *                   type: object
   *                   additionalProperties:
   *                     type: object
   *                     properties:
   *                       favorite:
   *                         type: boolean
   *                       lastUsedAt:
   *                         type: string
   *                         format: date-time
   *                       count:
   *                         type: integer
   *   post:
   *     tags: [System]
   *     summary: Update project selector state
   *     description: Persists selector state to project-selector.json
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             additionalProperties:
   *               type: object
   *               properties:
   *                 favorite:
   *                   type: boolean
   *                 lastUsedAt:
   *                   type: string
   *                   format: date-time
   *                 count:
   *                   type: integer
   *     responses:
   *       200:
   *         description: State persisted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid request body
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error400' }
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error500' }
   */

  // Default preferences
  const DEFAULT_PREFERENCES = {
    visibleCount: 7,
    compactInactive: true,
  }

  // Validate and sanitize a single selector state entry
  function validateSelectorEntry(entry: unknown): { favorite: boolean, lastUsedAt?: string | null, count: number } {
    const defaultEntry: { favorite: boolean, lastUsedAt?: string | null, count: number } = { favorite: false, count: 0 }

    if (typeof entry !== 'object' || entry === null) {
      return defaultEntry
    }

    const validated: { favorite: boolean, lastUsedAt?: string | null, count: number } = { ...defaultEntry }

    // Validate favorite: must be boolean, default to false if invalid
    if ('favorite' in entry) {
      if (typeof (entry as Record<string, unknown>).favorite === 'boolean') {
        validated.favorite = (entry as Record<string, unknown>).favorite as boolean
      }
      // If not boolean, use default false
    }

    // Validate lastUsedAt: must be valid ISO-8601 date
    if ('lastUsedAt' in entry) {
      if (typeof (entry as Record<string, unknown>).lastUsedAt === 'string') {
        const date = Date.parse((entry as Record<string, unknown>).lastUsedAt as string)
        if (!isNaN(date)) {
          validated.lastUsedAt = (entry as Record<string, unknown>).lastUsedAt as string
        } else {
          // Invalid date, set to null
          validated.lastUsedAt = null
        }
      } else {
        // Not a string, set to null
        validated.lastUsedAt = null
      }
    }

    // Validate count: must be integer >= 0, default to 0 if invalid
    if ('count' in entry) {
      if (typeof (entry as Record<string, unknown>).count === 'number' && Number.isInteger((entry as Record<string, unknown>).count as number) && (entry as Record<string, unknown>).count as number >= 0) {
        validated.count = (entry as Record<string, unknown>).count as number
      }
      // If not valid, use default 0 (already set)
    }

    return validated
  }

  // GET /api/config/selector - Return preferences and state
  router.get('/config/selector', async (req: Request, res: Response) => {
    try {
      const configDir = getConfigDir()
      logger.debug('getConfigDir returned:', configDir)

      // Read preferences from user.toml
      let preferences = { ...DEFAULT_PREFERENCES }

      try {
        const userTomlPath = path.join(configDir, 'user.toml')
        const userTomlContent = await fs.readFile(userTomlPath, 'utf8')
        const parsedConfig = toml.parse(userTomlContent)

        // Check for [ui.projectSelector] section
        if (parsedConfig.ui?.projectSelector) {
          const selectorConfig = parsedConfig.ui.projectSelector

          // Validate visibleCount: integer >= 1
          if (typeof selectorConfig.visibleCount === 'number' && Number.isInteger(selectorConfig.visibleCount) && selectorConfig.visibleCount >= 1) {
            preferences.visibleCount = selectorConfig.visibleCount
          }

          // Validate compactInactive: boolean
          if (typeof selectorConfig.compactInactive === 'boolean') {
            preferences.compactInactive = selectorConfig.compactInactive
          }
        }
      }
      catch {
        // File doesn't exist or is invalid, use defaults (silent fallback)
      }

      // Read selector state from project-selector.json
      let selectorState: Record<string, unknown> = {}

      try {
        const statePath = path.join(configDir, 'project-selector.json')
        const stateContent = await fs.readFile(statePath, 'utf8')
        const parsedState = JSON.parse(stateContent)

        // Validate each entry
        if (typeof parsedState === 'object' && parsedState !== null) {
          for (const [key, value] of Object.entries(parsedState)) {
            const validated = validateSelectorEntry(value)
            selectorState[key] = validated
          }
        }
      }
      catch {
        // File doesn't exist or is invalid, use empty state (silent fallback)
      }

      res.json({ preferences, selectorState })
    }
    catch (error) {
      console.error('Error reading selector config:', error)
      res.status(500).json({ error: 'Failed to read selector config' })
    }
  })

  // POST /api/config/selector - Persist selector state
  router.post('/config/selector', async (req: Request, res: Response) => {
    try {
      const stateUpdate = req.body

      if (typeof stateUpdate !== 'object' || stateUpdate === null) {
        return res.status(400).json({ error: 'Bad Request', message: 'Request body must be an object' })
      }

      const configDir = getConfigDir()
      const statePath = path.join(configDir, 'project-selector.json')

      // Validate each entry in the update
      const validatedState: Record<string, unknown> = {}

      for (const [key, value] of Object.entries(stateUpdate)) {
        const validated = validateSelectorEntry(value)
        validatedState[key] = validated
      }

      // Ensure directory exists
      await fs.mkdir(configDir, { recursive: true })

      // Write to file
      await fs.writeFile(statePath, JSON.stringify(validatedState, null, 2), 'utf8')

      res.json({
        success: true,
        message: 'Selector state persisted successfully',
      })
    }
    catch (error) {
      console.error('Error writing selector state:', error)
      res.status(500).json({ error: 'Failed to write selector state' })
    }
  })

  return router
}
