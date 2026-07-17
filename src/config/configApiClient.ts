/**
 * Typed client for the configuration management API (MDT-168).
 *
 * Reads selector descriptors with exposure metadata and applies scalar
 * mutations via PATCH /api/config. Field-level errors are mapped to a stable
 * shape so callers can bind them to the offending selector. Browser-only
 * preferences NEVER use this client — they stay in localStorage (BR-6.1).
 */
import { authFetch } from '../auth/authFetch'

/** A readable selector descriptor with its effective value. */
export interface ConfigSelectorDescriptor {
  selector: string
  scope: string
  exposure: string
  ownerSurface: string
  validation: string
  value: unknown
}

/** A field-level error returned when a mutation is rejected. */
export interface ConfigFieldError {
  selector: string
  message: string
}

/** Result of an apply attempt — either success or a structured field error. */
export type ApplyConfigOutcome
  = | { ok: true, selector: string, effective: unknown, filePath: string }
    | { ok: false, error: ConfigFieldError }

/**
 * Read all allowlisted selectors with exposure metadata + effective values.
 * File-only selectors are omitted by the backend (BR-1.2).
 */
export async function fetchConfigSelectors(): Promise<
  ConfigSelectorDescriptor[]
> {
  const response = await authFetch('/api/config/selectors')
  if (!response.ok) {
    throw new Error(
      `Failed to read config selectors (status ${response.status})`,
    )
  }
  const data = (await response.json()) as {
    selectors: ConfigSelectorDescriptor[]
  }
  return data.selectors
}

/**
 * Apply a scalar selector mutation. Returns the effective saved value on
 * success, or a field-level error on rejection (never throws for validation;
 * only throws for network/transport failures).
 */
export async function applyConfig(
  selector: string,
  value: unknown,
): Promise<ApplyConfigOutcome> {
  const response = await authFetch('/api/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selector, value }),
    ownerIntent: true,
  })

  if (response.ok) {
    const data = (await response.json()) as {
      selector: string
      effective: unknown
      filePath: string
    }
    return {
      ok: true,
      selector: data.selector,
      effective: data.effective,
      filePath: data.filePath,
    }
  }

  if (response.status === 400) {
    const data = (await response.json()) as {
      selector?: string
      message?: string
      field?: string
    }
    return {
      ok: false,
      error: {
        selector: data.selector ?? data.field ?? selector,
        message: data.message ?? 'Invalid value.',
      },
    }
  }

  // 403 / 500 / other transport-level rejection
  return {
    ok: false,
    error: { selector, message: `Request failed (status ${response.status}).` },
  }
}
