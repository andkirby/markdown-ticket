/**
 * Health Check Manager for MDT-113
 *
 * Manages server health checks with configurable retry logic and timeouts.
 * Extracted from ProcessLifecycleManager to provide a focused, reusable
 * health checking component.
 */

import type { IncomingMessage } from 'node:http'
import type { ServerConfig } from '../types.js'
import http from 'node:http'
import { TestFrameworkError } from '../types.js'
import { RetryHelper } from '../utils/retry-helper.js'

/** Default health check configuration */
const HEALTH = {
  maxAttempts: 30,
  initialDelay: 100,
  maxDelay: 2000,
  backoffMultiplier: 1.5,
}

/**
 * Health check configuration options
 */
export interface HealthCheckOptions {
  /** Maximum number of health check attempts (default: 30) */
  maxAttempts?: number
  /** Initial delay before first check in ms (default: 100) */
  initialDelay?: number
  /** Multiplier for exponential backoff (default: 1.5) */
  backoffMultiplier?: number
  /** Maximum delay between attempts in ms (default: 2000) */
  maxDelay?: number
  /** Request timeout in ms (default: 1000) */
  requestTimeout?: number
}

/**
 * Manages health check operations for server processes
 *
 * Provides reusable health checking functionality with configurable
 * retry logic, exponential backoff, and request timeouts.
 */
export class HealthCheckManager {
  private retryHelper: RetryHelper
  private options: Required<HealthCheckOptions>

  /**
   * Create a new HealthCheckManager
   * @param options - Health check configuration options
   */
  constructor(options: HealthCheckOptions = {}) {
    this.options = {
      maxAttempts: options.maxAttempts ?? HEALTH.maxAttempts,
      initialDelay: options.initialDelay ?? HEALTH.initialDelay,
      backoffMultiplier: options.backoffMultiplier ?? HEALTH.backoffMultiplier,
      maxDelay: options.maxDelay ?? HEALTH.maxDelay,
      requestTimeout: options.requestTimeout ?? 1000,
    }
    this.retryHelper = new RetryHelper()
  }

  /**
   * Perform a single health check against the configured endpoint
   * @param config - Server configuration containing port and health endpoint
   * @returns Promise that resolves on successful health check
   * @throws Error if health check fails or times out
   */
  async check(config: ServerConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: config.port,
          path: config.healthEndpoint,
          method: 'GET',
          timeout: this.options.requestTimeout,
        },
        (res: IncomingMessage) => {
          // Consume and destroy the response to ensure the socket is closed
          res.on('data', () => {})
          res.on('end', () => {
            res.destroy()
            req.destroy()
            if (res.statusCode === 200) {
              resolve()
            }
            else {
              reject(new Error(`HTTP ${res.statusCode}`))
            }
          })
        },
      )

      req.on('error', (err: Error) => {
        req.destroy()
        reject(err)
      })

      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Health check timeout'))
      })

      req.end()
    })
  }

  /**
   * Wait for server to be ready with retry logic
   * @param serverType - Server identifier for logging (e.g., 'frontend', 'backend', 'mcp')
   * @param config - Server configuration
   * @returns Promise that resolves when server is ready
   * @throws {TestFrameworkError} If health endpoint is not configured or all attempts fail
   */
  async waitForReady(serverType: string, config: ServerConfig): Promise<void> {
    if (!config.healthEndpoint) {
      throw new TestFrameworkError(
        `No health endpoint configured for ${serverType}`,
        'NO_HEALTH_ENDPOINT',
      )
    }

    try {
      await this.retryHelper.execute(
        () => this.check(config),
        {
          maxAttempts: this.options.maxAttempts,
          initialDelay: this.options.initialDelay,
          backoffMultiplier: this.options.backoffMultiplier,
          maxDelay: this.options.maxDelay,
          retryableErrors: [], // Allow all errors to be retryable for health checks
          logContext: `HealthCheck-${serverType}`,
        },
      )
    }
    catch (error) {
      throw new TestFrameworkError(
        `Health check failed for ${serverType}: ${error instanceof Error ? error.message : String(error)}`,
        'HEALTH_CHECK_FAILED',
      )
    }
  }

  /**
   * Check if server is currently ready (single attempt, no retry)
   * @param config - Server configuration
   * @returns Promise that resolves to true if server is ready, false otherwise
   */
  async isReady(config: ServerConfig): Promise<boolean> {
    if (!config.healthEndpoint)
      return false

    try {
      await this.check(config)
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Get current health check configuration
   * @returns The health check options being used
   */
  getOptions(): Readonly<Required<HealthCheckOptions>> {
    return { ...this.options }
  }
}
