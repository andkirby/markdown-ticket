/**
 * Domain contracts main entry point
 * Clean public API re-exporting all production modules
 */

// Export access and sharing boundary contracts
export * from './access'

// Export application config contracts
export * from './app-config'

// Export cloud sync coordination contracts (MDT-200) — pure DTOs that cross the
// coordination HTTP boundary; shared by cloud/ and local application packages.
export * from './cloud-sync'

// Export MCP server configuration schemas and validation
export * from './config'

// Export configuration management contracts (MDT-168)
export * from './config-management'

// Export project-related schemas and validation
export * from './project'

// Export unified search contracts (MDT-179)
export * from './search'

// Export ticket/CR-related schemas and validation (includes CR_CODE_PATTERN)
export * from './ticket'

// Export core types and enums
export * from './types'
