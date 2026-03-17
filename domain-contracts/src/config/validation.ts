/**
 * MDT-101: MCP Server Configuration Validation Functions
 * Validation wrapper functions using schemas from ./schema.ts
 */

import {
  DiscoveryConfigSchema,
  McpServerConfigSchema,
  ServerConfigSchema,
  TemplatesConfigSchema,
} from './schema'

/**
 * Validate server configuration using ServerConfigSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateServerConfig(data: unknown) {
  return ServerConfigSchema.parse(data)
}

/**
 * Safely validate server configuration using ServerConfigSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateServerConfig(data: unknown) {
  return ServerConfigSchema.safeParse(data)
}

/**
 * Validate discovery configuration using DiscoveryConfigSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateDiscoveryConfig(data: unknown) {
  return DiscoveryConfigSchema.parse(data)
}

/**
 * Safely validate discovery configuration using DiscoveryConfigSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateDiscoveryConfig(data: unknown) {
  return DiscoveryConfigSchema.safeParse(data)
}

/**
 * Validate templates configuration using TemplatesConfigSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateTemplatesConfig(data: unknown) {
  return TemplatesConfigSchema.parse(data)
}

/**
 * Safely validate templates configuration using TemplatesConfigSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateTemplatesConfig(data: unknown) {
  return TemplatesConfigSchema.safeParse(data)
}

/**
 * Validate complete MCP server configuration using McpServerConfigSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateMcpServerConfig(data: unknown) {
  return McpServerConfigSchema.parse(data)
}

/**
 * Safely validate complete MCP server configuration using McpServerConfigSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateMcpServerConfig(data: unknown) {
  return McpServerConfigSchema.safeParse(data)
}
