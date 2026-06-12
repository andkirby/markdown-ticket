/**
 * Domain contracts main entry point
 * Clean public API re-exporting all production modules
 */

// Export access and sharing boundary contracts
export * from './access'

// Export application config contracts
export * from './app-config'

// Export MCP server configuration schemas and validation
export * from './config'

// Export project-related schemas and validation
export * from './project'

// Export unified search contracts (MDT-179)
export * from './search'

// Export ticket/CR-related schemas and validation (includes CR_CODE_PATTERN)
export * from './ticket'

// Export core types and enums
export * from './types'
