/**
 * Mock of @mdt/shared/utils/toml for testing
 * Re-exports the real implementation since TOML parsing is critical
 */

export { parseToml, stringify, parse } from '../../../../../shared/utils/toml.js'
