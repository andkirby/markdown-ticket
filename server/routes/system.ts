import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import toml from 'toml';
import os from 'os';
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

  // Get server status
  router.get('/status', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: 'Ticket board server is running',
      tasksDir: process.env.TICKETS_DIR || './sample-tasks',
      timestamp: new Date().toISOString(),
      sseClients: fileWatcher.getClientCount()
    });
  });

  // Get system directories for project path selection
  router.get('/directories', (req: Request, res: Response) => {
    projectController.getSystemDirectories(req, res);
  });

  // Get link configuration
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

  // Browse file system
  router.get('/filesystem', (req: Request, res: Response) => {
    projectController.getFileSystemTree(req, res);
  });

  // Check if directory exists with enhanced functionality
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

  
  // Clear file operation cache
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

  // Get configuration for frontend "No Projects Found" display
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

  // Get global configuration
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

  // Clear config cache
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