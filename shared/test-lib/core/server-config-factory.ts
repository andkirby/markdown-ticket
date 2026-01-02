/**
 * Server Config Factory
 *
 * Creates ServerConfig objects for different server types (frontend, backend, mcp).
 * Extracted from TestServer to provide a focused configuration generation utility.
 *
 * Key features:
 * - Generates configs for frontend, backend, and MCP servers
 * - Respects CONFIG_DIR environment variable for test isolation
 * - Returns properly typed ServerConfig objects
 */

import type { ServerConfig } from '../types.js';
import type { PortConfig } from '../config/ports.js';
import { TestFrameworkError } from '../types.js';

/**
 * Factory class for creating server configurations
 */
export class ServerConfigFactory {
  /**
   * Create a server configuration based on type
   *
   * @param serverType - Type of server to configure ('frontend' | 'backend' | 'mcp')
   * @param projectRoot - Root directory of the project (unused in current implementation but kept for interface consistency)
   * @param ports - Port configuration object containing ports for all server types
   * @returns ServerConfig object with command, args, env, url, and healthEndpoint
   * @throws {TestFrameworkError} If server type is unknown
   */
  createConfig(
    serverType: 'frontend' | 'backend' | 'mcp',
    projectRoot: string,
    ports: PortConfig
  ): ServerConfig {
    const port = ports[serverType];
    const base = { port, command: 'npm', state: 'stopped' as const };

    // Get CONFIG_DIR from current process.env (set by TestEnvironment.setup())
    // This ensures the child process uses the isolated test config directory
    const configDir = process.env.CONFIG_DIR;

    switch (serverType) {
      case 'frontend':
        return {
          ...base,
          type: 'frontend',
          args: ['run', 'dev'],
          env: { PORT: port.toString() },
          url: `http://localhost:${port}`,
          healthEndpoint: '/'
        };

      case 'backend':
        return {
          ...base,
          type: 'backend',
          args: ['run', 'dev:server'],
          env: {
            PORT: port.toString(),
            ...(configDir && { CONFIG_DIR: configDir }) // Pass CONFIG_DIR to child process
          },
          url: `http://localhost:${port}`,
          healthEndpoint: '/api/status'
        };

      case 'mcp':
        return {
          ...base,
          type: 'mcp',
          args: ['run', 'dev'],
          env: {
            MCP_HTTP_ENABLED: 'true',
            MCP_HTTP_PORT: port.toString(),
            MCP_BIND_ADDRESS: '127.0.0.1',
            ...(configDir && { CONFIG_DIR: configDir }) // Pass CONFIG_DIR to child process
          },
          url: `http://localhost:${port}/mcp`,
          healthEndpoint: '/health'
        };

      default:
        throw new TestFrameworkError(`Unknown server type: ${serverType}`, 'UNKNOWN_SERVER_TYPE');
    }
  }
}
