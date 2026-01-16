import { parse as parseTomlContent, stringify } from 'smol-toml'

/**
 * Parse TOML string to JavaScript object
 * @param content - TOML content as string
 * @returns Parsed JavaScript object
 */
export function parseToml(content: string): any {
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
