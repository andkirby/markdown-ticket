import { parse as parseTomlContent, stringify } from 'smol-toml'

/**
 * Parse TOML string to JavaScript object
 * @param content - TOML content as string
 * @returns Parsed JavaScript object
 */
export function parseToml(content: string): unknown {
  return parseTomlContent(content)
}

/**
 * Parse TOML string to JavaScript object (alias for parseToml)
 * @param content - TOML content as string
 * @returns Parsed JavaScript object
 */
export const parse = parseTomlContent

/**
 * Convert JavaScript object to TOML string using smol-toml
 * @param obj - Object to serialize to TOML
 * @returns TOML formatted string
 */
export { stringify }

/**
 * SEC-001: Verify that a config object round-trips through TOML serialization
 * without data loss or injection. Returns the verified TOML string on success,
 * or throws if the round-trip produces a different structure.
 * @param data - Config object to serialize
 * @param label - Optional label for error messages
 * @returns Verified TOML string safe for file persistence
 */
export function stringifyAndVerify(data: unknown, label = 'config'): string {
  const tomlString = stringify(data as Record<string, unknown>)
  const reparsed = parseTomlContent(tomlString)

  if (JSON.stringify(reparsed) !== JSON.stringify(data)) {
    throw new Error(`${label}: TOML round-trip verification failed — serialized output does not match input`)
  }

  return tomlString
}
