import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Router for system-related endpoints (status, directories, filesystem, config)
 * @param {FileWatcherService} fileWatcher - File watcher service instance
 * @param {ProjectController} projectController - Project controller instance
 * @param {Object} projectDiscovery - Project discovery service
 * @param {FileOperationInvoker} fileInvoker - File operation invoker for cache management
 * @returns {Router} Express router
 */
export function createSystemRouter(fileWatcher, projectController, projectDiscovery, fileInvoker) {
  const router = Router();

  // Get server status
  router.get('/status', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Ticket board server is running',
      tasksDir: process.env.TICKETS_DIR || './sample-tasks',
      timestamp: new Date().toISOString(),
      sseClients: fileWatcher.getClientCount()
    });
  });

  // Get system directories for project path selection
  router.get('/directories', (req, res) => projectController.getSystemDirectories(req, res));

  // Browse file system
  router.get('/filesystem', (req, res) => projectController.getFileSystemTree(req, res));

  // Clear file operation cache
  router.post('/cache/clear', async (req, res) => {
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
  router.get('/config/global', async (req, res) => {
    try {
      const configDir = path.join(process.env.HOME || os.homedir(), '.config', 'markdown-ticket');
      const configPath = path.join(configDir, 'config.toml');

      console.log(`Reading global config from: ${configPath}`);

      try {
        const configContent = await fs.readFile(configPath, 'utf8');

        // Basic TOML parsing for all sections
        const config = {};

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

        // Parse counter_api section
        const counterApiMatch = configContent.match(/\[counter_api\]([\s\S]*?)(?=\[|$)/);
        if (counterApiMatch) {
          const section = counterApiMatch[1];
          config.counter_api = {
            enabled: section.match(/enabled\s*=\s*(true|false)/)?.[1] === 'true',
            endpoint: section.match(/endpoint\s*=\s*"([^"]+)"/)?.[1] || '',
            api_key: section.match(/api_key\s*=\s*"([^"]+)"/)?.[1] || ''
          };
        }

        // Parse cache section
        const cacheMatch = configContent.match(/\[cache\]([\s\S]*?)(?=\[|$)/);
        if (cacheMatch) {
          const section = cacheMatch[1];
          config.cache = {
            ttl: parseInt(section.match(/ttl\s*=\s*(\d+)/)?.[1] || '3600')
          };
        }

        res.json(config);
      } catch (error) {
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
          counter_api: {
            enabled: false,
            endpoint: '',
            api_key: ''
          },
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
  router.post('/cache/clear', async (req, res) => {
    try {
      // Clear project discovery cache if it has one
      if (projectDiscovery.clearCache) {
        await projectDiscovery.clearCache();
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
