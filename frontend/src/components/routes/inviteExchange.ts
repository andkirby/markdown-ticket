import { authFetch, isBackendDownError, isBackendDownResponse } from '../../auth/authFetch'

export interface InviteExchangeResult {
  ok: boolean
  status: number
  backendDown: boolean
  projectRefs: string[]
}

const inviteExchangeCache = new Map<string, Promise<InviteExchangeResult>>()

export function exchangeInviteCode(code: string): Promise<InviteExchangeResult> {
  const existingExchange = inviteExchangeCache.get(code)
  if (existingExchange) {
    return existingExchange
  }

  const exchange = authFetch(
    `/api/read-tokens/invites/${encodeURIComponent(code)}/session`,
    { method: 'POST' },
  )
    .then(async (response): Promise<InviteExchangeResult> => {
      if (!response.ok) {
        inviteExchangeCache.delete(code)
        return {
          ok: false,
          status: response.status,
          backendDown: isBackendDownResponse(response),
          projectRefs: [],
        }
      }

      const data = (await response.json()) as { projectRefs?: string[] }
      return {
        ok: true,
        status: response.status,
        backendDown: false,
        projectRefs: data.projectRefs ?? [],
      }
    })
    .catch((error): InviteExchangeResult => {
      inviteExchangeCache.delete(code)
      return {
        ok: false,
        status: 0,
        backendDown: isBackendDownError(error),
        projectRefs: [],
      }
    })

  inviteExchangeCache.set(code, exchange)
  return exchange
}
