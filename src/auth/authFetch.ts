export const OWNER_INTENT_HEADER = 'X-MDT-Owner-Intent'

export class AuthFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response: Response,
  ) {
    super(message)
    this.name = 'AuthFetchError'
  }
}

export class AuthRequiredError extends AuthFetchError {
  constructor(response: Response) {
    super('Authentication required', response.status, response)
    this.name = 'AuthRequiredError'
  }
}

export class BackendDownError extends Error {
  constructor(message = 'Backend server is not responding. Please check that the server is running.') {
    super(message)
    this.name = 'BackendDownError'
  }
}

export interface AuthFetchOptions extends RequestInit {
  ownerIntent?: boolean
}

export async function authFetch(input: RequestInfo | URL, options: AuthFetchOptions = {}): Promise<Response> {
  const { ownerIntent, headers, ...requestOptions } = options
  const method = requestOptions.method?.toUpperCase() ?? 'GET'
  const nextHeaders = new Headers(headers)

  if (ownerIntent || !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    nextHeaders.set(OWNER_INTENT_HEADER, '1')
  }

  try {
    return await fetch(input, {
      ...requestOptions,
      headers: nextHeaders,
      credentials: requestOptions.credentials ?? 'include',
    })
  }
  catch (error) {
    if (isNetworkError(error)) {
      throw new BackendDownError()
    }
    throw error
  }
}

export function isAuthRequiredResponse(response: Response): boolean {
  return response.status === 401
}

export function isBackendDownResponse(response: Response): boolean {
  return response.status >= 500
}

export function isBackendDownError(error: unknown): boolean {
  return error instanceof BackendDownError
    || (error instanceof TypeError && (
      error.message.includes('fetch')
      || error.message.includes('Failed to fetch')
      || error.message.includes('NetworkError')
    ))
    || (error instanceof Error && error.message.includes('HTTP 500'))
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && (
    error.message.includes('fetch')
    || error.message.includes('Failed to fetch')
    || error.message.includes('NetworkError')
  )
}
