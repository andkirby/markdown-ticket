/**
 * Shared Configuration Types
 * Status and attribute configuration interfaces
 */

import type { CRStatus } from './Types.js'

// Status Configuration Interface
export interface StatusConfig {
  label: string
  color: string
  description: string
  isTerminal: boolean
  canTransitionTo: CRStatus[]
  order: number
}

// Attribute Configuration Interface
export interface AttributeConfig {
  type: 'string' | 'number' | 'date' | 'enum' | 'array<string>'
  required: boolean
  values?: string[]
  pattern?: string
  min?: number
  max?: number
}

// Server Configuration Interface (from MCP)
export interface ServerConfig {
  server: {
    port: number
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
  discovery: {
    registryPath: string // Path to global registry
    excludePaths: string[]
    maxDepth: number // For directory scanning
    cacheTimeout: number
  }
  templates: {
    customPath: string
  }
}
