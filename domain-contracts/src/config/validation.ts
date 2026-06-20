/**
 * MCP Server Configuration Validation
 * Validation wrapper using schema from ./schema.ts
 */

import { McpServerConfigSchema } from './schema'

/**
 * Safely validate complete MCP server configuration using McpServerConfigSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateMcpServerConfig(data: unknown) {
  return McpServerConfigSchema.safeParse(data)
}
