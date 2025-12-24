/**
 * Domain contracts main entry point
 * Clean public API re-exporting all production modules
 */

// Export core types and enums
export * from './types/index.js';

// Export project-related schemas and validation
export * from './project/index.js';

// Export ticket/CR-related schemas and validation
export * from './ticket/index.js';