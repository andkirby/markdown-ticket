import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
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
      const configPath = process.env.CONFIG_PATH || DEFAULT_PATHS.CONFIG_FILE;
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

  // Get global configuration
  router.get('/config/global', async (req: Request, res: Response) => {
    try {
      const configPath = process.env.CONFIG_PATH || DEFAULT_PATHS.CONFIG_FILE;

      console.log(`Reading global config from: ${configPath}`);

      try {
        const configContent = await fs.readFile(configPath, 'utf8');

        // Basic TOML parsing for all sections
        const config: any = {};

        // Parse dashboard section
        const dashboardMatch = configContent.match(/\[dashboard\]([\s\S]*?)(?=\[|$)/);
        if (dashboardMatch) {
          const section = dashboardMatch[1];
          config.dashboard = {
            port: parseInt(section.match(/port\s*=\s*(\d+)/)?.[1] || '3002'),
            autoRefresh: section.match(/autoRefresh\s*=\s*(true|false)/)?.[1] === 'true',
            refreshInterval: parseInt(section.match(/refreshInterval\s*=\s*(\d+)/)?.[1] || '5000')
          };
        }

        // Parse discovery section
        const discoveryMatch = configContent.match(/\[discovery\]([\s\S]*?)(?=\[|$)/);
        if (discoveryMatch) {
          const section = discoveryMatch[1];
          config.discovery = {
            autoDiscover: section.match(/autoDiscover\s*=\s*(true|false)/)?.[1] === 'true',
            searchPaths: []
          };

          // Parse search paths array
          const pathsMatch = section.match(/searchPaths\s*=\s*\[([\s\S]*?)\]/);
          if (pathsMatch) {
            const pathsStr = pathsMatch[1];
            const paths = pathsStr.match(/"([^"]+)"/g);
            if (paths) {
              config.discovery.searchPaths = paths.map(p => p.replace(/"/g, ''));
            }
          }
        }

        // Counter API section removed - moved to counter-api/ package
        // Parse counter_api section
        // const counterApiMatch = configContent.match(/\[counter_api\]([\s\S]*?)(?=\[|$)/);
        // if (counterApiMatch) {
        //   const section = counterApiMatch[1];
        //   config.counter_api = {
        //     enabled: section.match(/enabled\s*=\s*(true|false)/)?.[1] === 'true',
        //     endpoint: section.match(/endpoint\s*=\s*"([^"]+)"/)?.[1] || '',
        //     api_key: section.match(/api_key\s*=\s*"([^"]+)"/)?.[1] || ''
        //   };
        // }

        // Parse cache section
        const cacheMatch = configContent.match(/\[cache\]([\s\S]*?)(?=\[|$)/);
        if (cacheMatch) {
          const section = cacheMatch[1];
          config.cache = {
            ttl: parseInt(section.match(/ttl\s*=\s*(\d+)/)?.[1] || '3600')
          };
        }

        res.json(config);
      } catch (_error) {
        // Config file doesn't exist, return default config
        res.json({
          dashboard: {
            port: 3002,
            autoRefresh: true,
            refreshInterval: 5000
          },
          discovery: {
            autoDiscover: true,
            searchPaths: []
          },
          // counter_api config removed - moved to counter-api/ package
          // counter_api: {
          //   enabled: false,
          //   endpoint: '',
          //   api_key: ''
          // },
          cache: {
            ttl: 3600
          }
        });
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