/**
 * MDT-101: MCP Server Configuration Schema
 * Field-level validation for server configuration file (config.toml)
 */

import { z } from 'zod'

/**
 * Server configuration schema
 * Defines server port and logging settings
 */
export const ServerConfigSchema = z.object({
  /** Server port number (1-65535) */
  port: z.number()
    .int('Port must be an integer')
    .min(1, 'Port must be between 1 and 65535')
    .max(65535, 'Port must be between 1 and 65535')
    .optional(),
  /** Log level for server operations */
  logLevel: z.enum(['debug', 'info', 'warn', 'error'], {
    errorMap: () => ({ message: 'Log level must be one of: debug, info, warn, error' }),
  }).optional(),
})

/**
 * Discovery configuration schema
 * Defines how projects are discovered and scanned
 */
export const DiscoveryConfigSchema = z.object({
  /** Array of directory patterns to exclude from scanning */
  excludePaths: z.array(z.string()).optional(),
  /** Maximum depth for directory scanning (1-50) */
  maxDepth: z.number()
    .int('Max depth must be an integer')
    .min(1, 'Max depth must be at least 1')
    .max(50, 'Max depth cannot exceed 50')
    .optional(),
  /** Cache timeout in seconds (0-3600) */
  cacheTimeout: z.number()
    .int('Cache timeout must be an integer')
    .min(0, 'Cache timeout cannot be negative')
    .max(3600, 'Cache timeout cannot exceed 1 hour (3600 seconds)')
    .optional(),
})

/**
 * Templates configuration schema
 * Defines custom template path
 */
export const TemplatesConfigSchema = z.object({
  /** Custom path to templates directory */
  customPath: z.string().optional(),
})

/**
 * Complete MCP server configuration schema
 * Combines all configuration sections
 */
export const McpServerConfigSchema = z.object({
  /** Server settings */
  server: ServerConfigSchema.optional(),
  /** Project discovery settings */
  discovery: DiscoveryConfigSchema.optional(),
  /** Template settings */
  templates: TemplatesConfigSchema.optional(),
})

// TypeScript types inferred from schemas
export type ServerConfig = z.infer<typeof ServerConfigSchema>
export type DiscoveryConfig = z.infer<typeof DiscoveryConfigSchema>
export type TemplatesConfig = z.infer<typeof TemplatesConfigSchema>
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>

/**
 * Export all schemas for use in other modules
 */
export const ConfigSchemas = {
  server: ServerConfigSchema,
  discovery: DiscoveryConfigSchema,
  templates: TemplatesConfigSchema,
  mcpServer: McpServerConfigSchema,
} as const
