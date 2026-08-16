/**
 * Environment variable parsing utilities.
 *
 * Centralizes the `parseInt(process.env.X || 'default', 10)` pattern that was
 * duplicated across services (MDT-117 §1.3). Adds a deprecation-aware port
 * parser so renamed env vars can warn — without silently aliasing — when the
 * old name is still set.
 *
 * The `*From` variants take an explicit env source so pure/testable callers
 * (e.g. `mcp-server/src/transports/httpSecurity.ts`) get identical parsing
 * and deprecation semantics without reaching for `process.env` directly.
 */

import process from 'node:process'

/**
 * Parse an environment variable as a base-10 integer.
 *
 * @param key Environment variable name
 * @param defaultValue Returned when the var is unset or not a valid integer
 * @returns Parsed integer, or `defaultValue` on parse failure
 */
export function parseEnvInt(key: string, defaultValue: number): number {
  return parseEnvIntFrom(process.env, key, defaultValue)
}

/**
 * `parseEnvInt` against an explicit environment source.
 *
 * Unset and empty-string values are both treated as unset (MDT-117 edge case),
 * and `NaN` results fall back to `defaultValue`.
 */
export function parseEnvIntFrom(
  env: NodeJS.ProcessEnv,
  key: string,
  defaultValue: number,
): number {
  const value = env[key]
  if (value === undefined || value === '')
    return defaultValue
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? defaultValue : parsed
}

/**
 * Read a port from the environment with a deprecation shim for an old name.
 *
 * Resolution order:
 *   1. `primary` env var (canonical name) — if set, use it.
 *   2. `deprecated` env var (legacy name) — if set, emit a one-time warning
 *      telling the user to migrate, then use the value. This is NOT a silent
 *      alias: it exists solely so stale `.env.local` files fail loudly instead
 *      of binding the wrong port.
 *   3. `defaultValue`.
 *
 * @returns Resolved port number
 */
export function parsePortEnv(
  primary: string,
  deprecated: string | undefined,
  defaultValue: number,
): number {
  return parsePortEnvFrom(process.env, primary, deprecated, defaultValue)
}

/**
 * `parsePortEnv` against an explicit environment source.
 */
export function parsePortEnvFrom(
  env: NodeJS.ProcessEnv,
  primary: string,
  deprecated: string | undefined,
  defaultValue: number,
): number {
  const primaryValue = env[primary]
  if (primaryValue !== undefined && primaryValue !== '') {
    const parsed = Number.parseInt(primaryValue, 10)
    if (!Number.isNaN(parsed))
      return parsed
  }

  if (deprecated !== undefined) {
    const deprecatedValue = env[deprecated]
    if (deprecatedValue !== undefined && deprecatedValue !== '') {
      const parsed = Number.parseInt(deprecatedValue, 10)
      if (!Number.isNaN(parsed)) {
        console.warn(
          `\n⚠️  Environment variable \`${deprecated}\` is deprecated; use \`${primary}\` instead.`
          + ` Reading ${parsed} from \`${deprecated}\` for now.\n`,
        )
        return parsed
      }
    }
  }

  return defaultValue
}
