/**
 * MCP Client Logger
 *
 * Provides structured logging for debugging MCP client operations
 */

import process from 'node:process'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, unknown>
  error?: Error
}

export class MCPLogger {
  private static instance: MCPLogger
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private isVerbose: boolean

  private constructor() {
    // Check if verbose mode is enabled
    this.isVerbose = process.argv.includes('--verbose') || process.env.npm_config_verbose === 'true'
  }

  static getInstance(): MCPLogger {
    if (!MCPLogger.instance) {
      MCPLogger.instance = new MCPLogger()
    }
    return MCPLogger.instance
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    }

    // Add to logs
    this.logs.push(entry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Only output to console if verbose mode is enabled or level is ERROR/WARN
    if (this.isVerbose || entry.level >= LogLevel.WARN) {
      // Logging disabled for tests
      // const levelName = LogLevel[level];
      // const timestamp = entry.timestamp.toISOString();
      // const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      // const errorStr = error ? ` ${error.message}` : '';
      // console.log(`[${timestamp}] ${levelName}: ${message}${contextStr}${errorStr}`);
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level === undefined) {
      return [...this.logs]
    }
    return this.logs.filter(log => log.level >= level)
  }

  clearLogs(): void {
    this.logs = []
  }

  getErrorLogs(): LogEntry[] {
    return this.getLogs(LogLevel.ERROR)
  }

  getRecentLogs(count: number = 10): LogEntry[] {
    return this.logs.slice(-count)
  }
}
