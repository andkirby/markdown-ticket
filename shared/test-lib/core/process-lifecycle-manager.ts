/**
 * Process Lifecycle Manager for MDT-092
 *
 * Manages server process lifecycle including spawning, health checks,
 * graceful shutdown, and cleanup. Extracted from TestServer to focus
 * solely on process management concerns.
 */

import { ChildProcess } from 'child_process';
import { ServerConfig, ServerStartupError, TestFrameworkError } from '../types.js';
import { EventListenerRegistry } from './event-listener-registry.js';
import { HealthCheckManager } from './health-check-manager.js';
import { ProcessRegistry } from './process-registry.js';
import { ProcessSpawner } from './process-spawner.js';
import { ProcessTerminator } from './process-terminator.js';

/**
 * Manages server process lifecycle
 */
export class ProcessLifecycleManager {
  private registry: ProcessRegistry = new ProcessRegistry();
  private listeners: EventListenerRegistry = new EventListenerRegistry();
  private healthCheck: HealthCheckManager = new HealthCheckManager();
  private spawner: ProcessSpawner = new ProcessSpawner();
  private terminator: ProcessTerminator = new ProcessTerminator();

  /**
   * Start a server process with health checking
   * @param serverType - Server identifier (e.g., 'frontend', 'backend', 'mcp')
   * @param projectRoot - Root directory for the process
   * @param config - Server configuration
   */
  async start(serverType: string, projectRoot: string, config: ServerConfig): Promise<void> {
    if (this.registry.has(serverType)) {
      throw new TestFrameworkError(`Server ${serverType} is already running`, 'SERVER_ALREADY_RUNNING');
    }

    try {
      const child = this.spawner.spawn(config, projectRoot);
      this.registry.register(serverType, child, config);
      this.registry.updatePid(serverType, child.pid);
      this.registry.updateState(serverType, 'starting');

      // Attach event handlers
      this.spawner.attachHandlers(serverType, child, {
        stdout: (d: Buffer) => {
          // Optionally log: console.debug(`[${serverType}] ${d.toString().trim()}`);
        },
        stderr: (d: Buffer) => {
          // Optionally log: console.error(`[${serverType}] ${d.toString().trim()}`);
        },
        exit: (code: number | null, signal: NodeJS.Signals | null) => {
          // Optionally log: console.warn(`Server ${serverType} exited with code ${code}, signal ${signal}`);
          const serverConfig = this.registry.getConfig(serverType);
          this.registry.unregister(serverType);
          if (serverConfig) {
            serverConfig.state = 'stopped';
            serverConfig.pid = undefined;
          }
          this.spawner.cleanupHandlers(serverType, child);
        }
      });

      await this.healthCheck.waitForReady(serverType, config);
      this.registry.updateState(serverType, 'running');

    } catch (error) {
      this.registry.unregister(serverType);
      config.state = 'error';
      throw new ServerStartupError(
        `Failed to start ${serverType} server: ${error instanceof Error ? error.message : String(error)}`,
        serverType
      );
    }
  }

  /**
   * Stop a server process with graceful shutdown
   * @param serverType - Server identifier
   */
  async stop(serverType: string): Promise<void> {
    const process = this.registry.getProcess(serverType);
    const config = this.registry.getConfig(serverType);

    if (!process && !config) return;

    try {
      if (config) {
        config.state = 'stopping';
      }

      // Clear any pending SIGKILL timeout
      this.terminator.clearSigkillTimeout(serverType);

      if (process) {
        // Clean up event handlers
        this.spawner.cleanupHandlers(serverType, process);

        // Terminate the process
        await this.terminator.terminate(serverType, process);
      }
    } catch (error) {
      console.error(`Error stopping ${serverType} server:`, error);
    } finally {
      this.registry.unregister(serverType);
      this.terminator.clearSigkillTimeout(serverType);
      if (config) {
        config.state = 'stopped';
        config.pid = undefined;
      }
    }
  }

  /**
   * Stop all running servers
   */
  async stopAll(): Promise<void> {
    const servers = this.registry.ids();
    await Promise.allSettled(servers.map(type => this.stop(type)));
  }

  /**
   * Check if a server is ready and responding
   * @param serverType - Server identifier
   */
  async isReady(serverType: string): Promise<boolean> {
    const config = this.registry.getConfig(serverType);
    if (!config || config.state !== 'running') return false;

    return this.healthCheck.isReady(config);
  }

  /**
   * Get server configuration
   * @param serverType - Server identifier
   */
  getConfig(serverType: string): ServerConfig | undefined {
    return this.registry.getConfig(serverType);
  }

  /**
   * Get server process
   * @param serverType - Server identifier
   */
  getProcess(serverType: string): ChildProcess | undefined {
    return this.registry.getProcess(serverType);
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.spawner.dispose();
    this.terminator.dispose();
    this.listeners.clear();
    this.registry.clear();
  }
}
