import { Router, Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as toml from 'toml';
import * as os from 'os';
import FileWatcherService from '../fileWatcherService.js';
import { ProjectController } from '../controllers/ProjectController.js';
import { DEFAULT_PATHS } from '@mdt/shared/utils/constants.js';

interface FileInvoker {
  clearCache(): void;
  invalidateFile(filePath: string): void;
}

interface ProjectDiscovery {
  clearCache?(): void | Promise<void>;
}

/**
 * Router for system-related endpoints (status, directories, filesystem, config)
 * @param fileWatcher - File watcher service instance
 * @param projectController - Project controller instance
 * @param projectDiscovery - Project discovery service
 * @param fileInvoker - File operation invoker for cache management
 * @returns Express router
 */
export function createSystemRouter(
  fileWatcher: FileWatcherService,
  projectController: ProjectController,
  projectDiscovery: ProjectDiscovery,
  fileInvoker: FileInvoker
): Router {
  const router = Router();

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
      sseClients: fileWatcher.getClientCount()
    });
  });

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
    projectController.getSystemDirectories(req, res);
  });

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
      const configPath = DEFAULT_PATHS.CONFIG_FILE;
      const configData = await fs.readFile(configPath, 'utf8');

      // Simple TOML parsing for [links] section
      const linkSection = configData.match(/\[links\]([\s\S]*?)(?=\[|$)/);
      if (linkSection) {
        const linkConfig: Record<string, boolean> = {};
        const lines = linkSection[1].split('\n');

        for (const line of lines) {
          const match = line.trim().match(/^(\w+)\s*=\s*(true|false)$/);
          if (match) {
            linkConfig[match[1]] = match[2] === 'true';
          }
        }

        res.json(linkConfig);
      } else {
        res.status(404).json({ error: 'Link configuration not found' });
      }
    } catch (_error) {
      res.status(404).json({ error: 'Configuration file not found' });
    }
  });

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
    projectController.getFileSystemTree(req, res);
  });

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
    const { path: inputPath } = req.body;

    if (!inputPath || typeof inputPath !== 'string') {
      return res.status(400).json({ error: 'Path is required and must be a string' });
    }

    try {
      // Server-side tilde expansion for security and consistency
      let expandedPath = inputPath;
      if (inputPath.startsWith('~')) {
        const homeDir = os.homedir();
        expandedPath = inputPath.replace(/^~($|\/)/, `${homeDir}$1`);
      }

      // Check if directory exists
      let exists = false;
      try {
        const stats = await fs.stat(expandedPath);
        exists = stats.isDirectory();
      } catch {
        exists = false;
      }

      // Check if path is within discovery search paths
      let isInDiscovery = 0;
      try {
        const configPath = DEFAULT_PATHS.CONFIG_FILE;
        const configContent = await fs.readFile(configPath, 'utf8');
        const parsedConfig = toml.parse(configContent);
        const discoveryPaths = parsedConfig.discovery?.searchPaths || [];

        // More precise matching: path must start with discovery path AND
        // either be exactly the discovery path OR have a separator after it
        for (const discoveryPath of discoveryPaths) {
          let expandedDiscoveryPath = discoveryPath;
          if (discoveryPath.startsWith('~')) {
            const homeDir = os.homedir();
            expandedDiscoveryPath = discoveryPath.replace(/^~($|\/)/, `${homeDir}$1`);
          }

          if (expandedPath === expandedDiscoveryPath) {
            isInDiscovery = 1; // Exact match
            break;
          } else if (expandedPath.startsWith(expandedDiscoveryPath + '/')) {
            isInDiscovery = 1; // Match with proper path separator
            break;
          }
        }
      } catch (error) {
        console.warn('Could not check discovery paths:', error);
      }

      const result = {
        exists: exists ? 1 : 0,
        isInDiscovery,
        expandedPath
      };

      console.log(`🔍 Enhanced path check for "${inputPath}": expanded="${expandedPath}", exists=${result.exists}, inDiscovery=${result.isInDiscovery}`);
      res.json(result);
    } catch (error) {
      console.error('Error checking directory existence:', error);
      res.status(500).json({ error: 'Failed to check directory existence' });
    }
  });

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
      console.log('🗑️  Clearing file operation cache');
      fileInvoker.clearCache();
      res.json({
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  });

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
      const configPath = DEFAULT_PATHS.CONFIG_FILE;
      console.log(`Reading config from: ${configPath}`);

      try {
        const configContent = await fs.readFile(configPath, 'utf8');
        const parsedConfig = toml.parse(configContent);

        // Extract configuration using proper TOML parsing
        const response = {
          configDir: DEFAULT_PATHS.CONFIG_DIR,
          discovery: {
            autoDiscover: parsedConfig.discovery?.autoDiscover ?? true,
            searchPaths: parsedConfig.discovery?.searchPaths ?? [],
            maxDepth: parsedConfig.discovery?.maxDepth ?? 3
          }
        };

        res.json(response);
      } catch (_error) {
        // Config file doesn't exist, return defaults
        const response = {
          configDir: DEFAULT_PATHS.CONFIG_DIR,
          discovery: {
            autoDiscover: true,
            searchPaths: [],
            maxDepth: 3
          }
        };
        res.json(response);
      }
    } catch (error) {
      console.error('Error reading config:', error);
      res.status(500).json({ error: 'Failed to read config' });
    }
  });

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
      const configPath = DEFAULT_PATHS.CONFIG_FILE;
      console.log(`Reading global config from: ${configPath}`);

      try {
        const configContent = await fs.readFile(configPath, 'utf8');
        const parsedConfig = toml.parse(configContent);
        res.json(parsedConfig);
      } catch (_error) {
        // Config file doesn't exist, return default config
        const defaultConfig = {
          discovery: {
            autoDiscover: true,
            searchPaths: [],
            maxDepth: 3
          },
          links: {
            enableAutoLinking: true,
            enableTicketLinks: true,
            enableDocumentLinks: true,
            enableHoverPreviews: false,
            linkValidation: false
          },
          ui: {
            theme: 'auto',
            autoRefresh: true,
            refreshInterval: 5000
          },
          system: {
            logLevel: 'info',
            cacheTimeout: 30000
          }
        };
        res.json(defaultConfig);
      }
    } catch (error) {
      console.error('Error reading global config:', error);
      res.status(500).json({ error: 'Failed to read global config' });
    }
  });

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
        projectDiscovery.clearCache();
      }

      console.log('🔄 Config cache cleared');
      res.json({
        success: true,
        message: 'Config cache cleared successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error clearing config cache:', error);
      res.status(500).json({ error: 'Failed to clear config cache' });
    }
  });

  return router;
}