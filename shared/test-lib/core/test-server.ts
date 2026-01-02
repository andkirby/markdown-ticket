/**
 * Test Server Manager for MDT-092
 *
 * Orchestrates server lifecycle using extracted components:
 * - ProcessLifecycleManager: Process spawning, health checks, graceful shutdown
 * - ServerConfigFactory: Server configuration generation
 *
 * TestServer acts as a thin adapter/orchestrator preserving the public API
 * while delegating implementation to focused components.
 */

import { ServerConfig, TestFrameworkError } from '../types.js';
import { PortConfig } from '../config/ports.js';
import { ProcessLifecycleManager } from './process-lifecycle-manager.js';
import { ServerConfigFactory } from './server-config-factory.js';

/**
 * Orchestrates server processes for isolated test environments
 */
export class TestServer {
  private lifecycle: ProcessLifecycleManager;
  private configFactory: ServerConfigFactory;
  private ports: PortConfig;

  constructor(ports: PortConfig) {
    this.ports = ports;
    this.lifecycle = new ProcessLifecycleManager();
    this.configFactory = new ServerConfigFactory();
  }

  /**
   * Start a server process with health checking
   * @param serverType - Server type to start
   * @param projectRoot - Root directory for server execution
   */
  async start(serverType: 'frontend' | 'backend' | 'mcp', projectRoot: string): Promise<void> {
    const config = this.configFactory.createConfig(serverType, projectRoot, this.ports);
    await this.lifecycle.start(serverType, projectRoot, config);
  }

  /**
   * Stop a server process with graceful shutdown
   * @param serverType - Server type to stop
   */
  async stop(serverType: 'frontend' | 'backend' | 'mcp'): Promise<void> {
    await this.lifecycle.stop(serverType);
  }

  /**
   * Stop all running servers
   */
  async stopAll(): Promise<void> {
    await this.lifecycle.stopAll();
  }

  /**
   * Check if a server is ready and responding
   * @param serverType - Server type to check
   * @returns true if server is ready and running
   */
  async isReady(serverType: 'frontend' | 'backend' | 'mcp'): Promise<boolean> {
    return this.lifecycle.isReady(serverType);
  }

  /**
   * Get server configuration
   * @param serverType - Server type to get config for
   * @returns Server configuration or undefined if not configured
   */
  getConfig(serverType: 'frontend' | 'backend' | 'mcp'): ServerConfig | undefined {
    return this.lifecycle.getConfig(serverType);
  }

  /**
   * Get server URL
   * @param serverType - Server type to get URL for
   * @returns Server URL
   * @throws {TestFrameworkError} If server not configured
   */
  getUrl(serverType: 'frontend' | 'backend' | 'mcp'): string {
    const config = this.getConfig(serverType);
    if (!config?.url) {
      throw new TestFrameworkError(`Server ${serverType} not configured`, 'SERVER_NOT_CONFIGURED');
    }
    return config.url;
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.lifecycle.dispose();
  }
}
