/**
 * Mock of @mdt/shared/utils/toml for testing
 * Re-exports the real implementation since TOML parsing is critical
 */

export { parse, parseToml, stringify } from '@mdt/shared/utils/toml.js'
