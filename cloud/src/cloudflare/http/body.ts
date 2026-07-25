import { CoordinationError } from '@mdt/domain-contracts'

/** Coordination requests only carry compact metadata, never ticket bodies. */
export const MAX_JSON_BODY_BYTES = 64 * 1024

export async function readJsonObject(
  request: Request,
  requestId: string,
): Promise<Record<string, unknown>> {
  const declaredLength = Number.parseInt(request.headers.get('content-length') ?? '0', 10)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    throw new CoordinationError('invalid_request', { requestId, message: 'request body too large' })
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BODY_BYTES) {
    throw new CoordinationError('invalid_request', { requestId, message: 'request body too large' })
  }

  let value: unknown
  try {
    value = JSON.parse(text)
  }
  catch {
    throw new CoordinationError('invalid_request', { requestId, message: 'invalid JSON body' })
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CoordinationError('invalid_request', { requestId, message: 'JSON object required' })
  }
  return value as Record<string, unknown>
}
