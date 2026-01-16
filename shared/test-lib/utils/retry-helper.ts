/**
 * Retry Helper - Centralized retry logic with exponential backoff for MDT-092 test environment
 */

import { setTimeout } from 'node:timers'
import { promisify } from 'node:util'

/** Retry configuration options */
export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  backoffMultiplier?: number
  maxDelay?: number
  timeout?: number
  retryableErrors?: string[]
  logContext?: string
}

/** Default retry configuration */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 100,
  backoffMultiplier: 2.0,
  maxDelay: 1000,
  timeout: 5000,
  retryableErrors: ['EACCES', 'ENOENT', 'EEXIST', 'EBUSY', 'EMFILE', 'ENFILE'],
  logContext: 'RetryHelper',
}

/**
 * Error class for retry failures
 */
export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error,
    public readonly context?: string,
  ) {
    super(message)
    this.name = 'RetryError'
  }
}

/**
 * Retry helper class with exponential backoff
 */
export class RetryHelper {
  private options: Required<RetryOptions>

  constructor(options: RetryOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Execute an operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    customOptions?: RetryOptions,
  ): Promise<T> {
    const mergedOptions = { ...this.options, ...customOptions }
    const { maxAttempts, initialDelay, backoffMultiplier, maxDelay, timeout, retryableErrors, logContext } = mergedOptions

    let lastError: Error | null = null
    let delay = initialDelay

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = timeout > 0
          ? this.createTimeout(timeout, `${logContext} operation timed out after ${timeout}ms`)
          : Promise.resolve(null)

        // Race between operation and timeout
        const result = await Promise.race([
          operation(),
          timeoutPromise,
        ])

        // Success
        if (attempt > 1) {
          console.error(`[${logContext}] Operation succeeded on attempt ${attempt}/${maxAttempts}`)
        }
        return result as T
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Check if error is retryable
        const errorCode = this.extractErrorCode(lastError)
        const isRetryable = !retryableErrors.length || retryableErrors.includes(errorCode)

        // Don't retry if it's the last attempt or error is not retryable
        if (attempt === maxAttempts || !isRetryable) {
          break
        }

        // Log retry attempt
        console.warn(
          `[${logContext}] Attempt ${attempt}/${maxAttempts} failed (${errorCode}). `
          + `Retrying in ${delay}ms... Error: ${lastError.message}`,
        )

        // Wait before retry
        await promisify(setTimeout)(delay)

        // Calculate next delay with exponential backoff
        delay = Math.min(delay * backoffMultiplier, maxDelay)
      }
    }

    // All attempts failed
    throw new RetryError(
      `Operation failed after ${maxAttempts} attempts`,
      maxAttempts,
      lastError!,
      logContext,
    )
  }

  /**
   * Execute a synchronous operation with retry logic
   */
  executeSync<T>(
    operation: () => T,
    customOptions?: RetryOptions,
  ): T {
    // Convert sync operation to async
    const asyncOp = async () => operation()
    // Use async execute but block on result (this is acceptable in test context)
    let result: T | undefined
    let error: Error | undefined

    this.execute(asyncOp, customOptions)
      .then((r) => { result = r })
      .catch((e) => { error = e })

    if (error)
      throw error
    if (result === undefined)
      throw new Error('Sync operation did not complete')
    return result
  }

  /**
   * Create a timeout promise that rejects after specified duration
   */
  private createTimeout(timeoutMs: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs)
    })
  }

  /**
   * Extract error code from error object
   */
  private extractErrorCode(error: Error): string {
    if ('code' in error && typeof error.code === 'string') {
      return error.code
    }

    // Check for common error patterns
    if (error.message.includes('permission'))
      return 'EACCES'
    if (error.message.includes('not found'))
      return 'ENOENT'
    if (error.message.includes('exists'))
      return 'EEXIST'
    if (error.message.includes('timeout'))
      return 'TIMEOUT'
    if (error.message.includes('busy'))
      return 'EBUSY'

    return 'UNKNOWN'
  }

  /**
   * Check if an error is retryable based on configured error codes
   */
  isRetryableError(error: Error, customOptions?: RetryOptions): boolean {
    const options = { ...this.options, ...customOptions }
    const errorCode = this.extractErrorCode(error)
    return !options.retryableErrors.length || options.retryableErrors.includes(errorCode)
  }

  /**
   * Wait with exponential backoff
   */
  async wait(attempt: number, customOptions?: RetryOptions): Promise<void> {
    const options = { ...this.options, ...customOptions }
    const { initialDelay, backoffMultiplier, maxDelay } = options

    const delay = Math.min(initialDelay * backoffMultiplier ** (attempt - 1), maxDelay)
    await promisify(setTimeout)(delay)
  }
}

/**
 * Default retry helper instance
 */
export const retryHelper = new RetryHelper()

/**
 * Convenience function to execute with retry
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  return retryHelper.execute(operation, options)
}

/**
 * Convenience function to execute synchronous operation with retry
 */
export function withRetrySync<T>(
  operation: () => T,
  options?: RetryOptions,
): T {
  return retryHelper.executeSync(operation, options)
}
