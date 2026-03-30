/**
 * Domain contracts main entry point
 * Clean public API re-exporting all production modules
 */

// Export application config contracts
export * from './app-config'

// Export MCP server configuration schemas and validation
export * from './config'

// Export project-related schemas and validation
export * from './project'

// Export ticket/CR-related schemas and validation (includes CR_CODE_PATTERN)
export * from './ticket'

// Export core types and enums
export * from './types'
