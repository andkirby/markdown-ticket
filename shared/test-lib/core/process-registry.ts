import { ChildProcess } from 'child_process';
import { ServerConfig } from '../types.js';

export type ProcessState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface ProcessEntry {
  id: string;
  process: ChildProcess;
  config: ServerConfig;
  registeredAt: Date;
}

export class ProcessRegistry {
  private entries: Map<string, ProcessEntry> = new Map();

  /**
   * Register a new process
   */
  register(id: string, process: ChildProcess, config: ServerConfig): void {
    this.entries.set(id, {
      id,
      process,
      config,
      registeredAt: new Date()
    });
  }

  /**
   * Unregister a process
   */
  unregister(id: string): void {
    this.entries.delete(id);
  }

  /**
   * Get process by ID
   */
  getProcess(id: string): ChildProcess | undefined {
    return this.entries.get(id)?.process;
  }

  /**
   * Get config by ID
   */
  getConfig(id: string): ServerConfig | undefined {
    return this.entries.get(id)?.config;
  }

  /**
   * Get state by ID
   */
  getState(id: string): ProcessState | undefined {
    return this.entries.get(id)?.config.state;
  }

  /**
   * Update state for a process
   */
  updateState(id: string, newState: ProcessState): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.config.state = newState;
    }
  }

  /**
   * Update PID for a process
   */
  updatePid(id: string, pid: number | undefined): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.config.pid = pid;
    }
  }

  /**
   * Check if process exists
   */
  has(id: string): boolean {
    return this.entries.has(id);
  }

  /**
   * List all registered processes
   */
  list(): ProcessEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get all process IDs
   */
  ids(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get count of registered processes
   */
  get count(): number {
    return this.entries.size;
  }
}
