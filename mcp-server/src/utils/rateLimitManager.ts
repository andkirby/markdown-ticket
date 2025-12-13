/**
 * Rate Limit Manager
 *
 * Implements sliding window rate limiting for MCP tool invocations.
 * Tracks requests per tool with configurable limits.
 */

export interface RateLimitConfig {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: Date;
  retryAfter?: number; // seconds until retry
}

export interface ToolRateLimitInfo {
  count: number;
  windowStart: number;
  lastRequest: number;
}

/**
 * Rate Limit Manager with sliding window algorithm
 *
 * Features:
 * - Per-tool rate limiting
 * - Sliding window for accurate rate limiting
 * - Configurable via environment variables
 * - Proper MCP error response support
 * - Logging for monitoring
 */
export class RateLimitManager {
  private config: RateLimitConfig;
  private toolLimits = new Map<string, ToolRateLimitInfo>();
  private logger: (message: string) => void;

  constructor(config: RateLimitConfig, logger?: (message: string) => void) {
    this.config = config;
    this.logger = logger || console.error;

    if (this.config.enabled) {
      this.logger(`🛡️  Rate limiting enabled: ${this.config.maxRequests} requests per ${this.config.windowMs / 1000}s per tool`);
    } else {
      this.logger(`ℹ️  Rate limiting disabled`);
    }
  }

  /**
   * Check if a tool invocation is allowed
   *
   * @param toolName - Name of the tool being invoked
   * @returns RateLimitResult with allow/deny decision and metadata
   */
  checkRateLimit(toolName: string): RateLimitResult {
    // If rate limiting is disabled, always allow
    if (!this.config.enabled) {
      return {
        allowed: true,
        remainingRequests: this.config.maxRequests,
        resetTime: new Date(Date.now() + this.config.windowMs)
      };
    }

    const now = Date.now();
    const toolInfo = this.toolLimits.get(toolName);

    // Initialize tool info if not exists
    if (!toolInfo) {
      this.toolLimits.set(toolName, {
        count: 1,
        windowStart: now,
        lastRequest: now
      });

      return {
        allowed: true,
        remainingRequests: this.config.maxRequests - 1,
        resetTime: new Date(now + this.config.windowMs)
      };
    }

    // Check if we need to slide the window
    const windowElapsed = now - toolInfo.windowStart;
    if (windowElapsed >= this.config.windowMs) {
      // Window has passed, reset
      this.toolLimits.set(toolName, {
        count: 1,
        windowStart: now,
        lastRequest: now
      });

      return {
        allowed: true,
        remainingRequests: this.config.maxRequests - 1,
        resetTime: new Date(now + this.config.windowMs)
      };
    }

    // Check if within rate limit
    if (toolInfo.count < this.config.maxRequests) {
      // Increment counter
      this.toolLimits.set(toolName, {
        ...toolInfo,
        count: toolInfo.count + 1,
        lastRequest: now
      });

      return {
        allowed: true,
        remainingRequests: this.config.maxRequests - toolInfo.count - 1,
        resetTime: new Date(toolInfo.windowStart + this.config.windowMs)
      };
    }

    // Rate limit exceeded
    const resetTime = toolInfo.windowStart + this.config.windowMs;
    const retryAfter = Math.ceil((resetTime - now) / 1000);

    // Log rate limit event
    this.logger(`🚫 Rate limit exceeded for tool '${toolName}': ${toolInfo.count}/${this.config.maxRequests} used, retry after ${retryAfter}s`);

    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: new Date(resetTime),
      retryAfter
    };
  }

  /**
   * Get current rate limit status for a tool
   *
   * @param toolName - Name of the tool
   * @returns Current rate limit info or null if tool not tracked
   */
  getToolStatus(toolName: string): ToolRateLimitInfo | null {
    const info = this.toolLimits.get(toolName);
    if (!info) {
      return null;
    }

    // Check if window has expired
    const now = Date.now();
    if (now - info.windowStart >= this.config.windowMs) {
      this.toolLimits.delete(toolName);
      return null;
    }

    return { ...info };
  }

  /**
   * Reset rate limit for a specific tool
   *
   * @param toolName - Name of the tool to reset
   */
  resetToolLimit(toolName: string): void {
    this.toolLimits.delete(toolName);
    this.logger(`🔄 Rate limit reset for tool '${toolName}'`);
  }

  /**
   * Reset all rate limits
   */
  resetAllLimits(): void {
    const count = this.toolLimits.size;
    this.toolLimits.clear();
    this.logger(`🔄 Reset ${count} tool rate limits`);
  }

  /**
   * Cleanup expired entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [toolName, info] of this.toolLimits.entries()) {
      if (now - info.windowStart >= this.config.windowMs) {
        this.toolLimits.delete(toolName);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger(`🧹 Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): {
    enabled: boolean;
    totalTools: number;
    activeTools: number;
    config: RateLimitConfig;
  } {
    const now = Date.now();
    const activeTools = Array.from(this.toolLimits.values()).filter(
      info => now - info.windowStart < this.config.windowMs
    ).length;

    return {
      enabled: this.config.enabled,
      totalTools: this.toolLimits.size,
      activeTools,
      config: { ...this.config }
    };
  }

  /**
   * Create RateLimitManager from environment variables
   */
  static fromEnvironment(logger?: (message: string) => void): RateLimitManager {
    const enabled = process.env.MCP_SECURITY_RATE_LIMITING !== 'false';
    const maxRequests = parseInt(process.env.MCP_RATE_LIMIT_MAX || '100');
    const windowMs = parseInt(process.env.MCP_RATE_LIMIT_WINDOW_MS || '60000');

    return new RateLimitManager(
      {
        enabled,
        maxRequests,
        windowMs
      },
      logger
    );
  }
}