/**
 * Domain contracts main entry point
 * Clean public API re-exporting all production modules
 */

// Export project-related schemas and validation
export * from './project/index.js'

// Export ticket/CR-related schemas and validation
export * from './ticket/index.js'

// Export CR code pattern for OpenAPI schemas
export { CR_CODE_PATTERN } from './ticket/schema.js'

// Export core types and enums
export * from './types/index.js'
