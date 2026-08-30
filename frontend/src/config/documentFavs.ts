import type { DocumentFavItem, DocumentFavState } from '@mdt/domain-contracts'
import { validateDocumentFavState } from '@mdt/domain-contracts'
import { authFetch } from '../auth/authFetch'

export type { DocumentFavItem, DocumentFavState }

export interface SaveDocumentFavsRequest {
  projectId: string
  favItems: DocumentFavItem[]
}

export async function saveDocumentFavs({ projectId, favItems }: SaveDocumentFavsRequest): Promise<DocumentFavState> {
  const state = validateDocumentFavState({ favItems })
  const response = await authFetch('/api/documents/favs', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      favItems: state.favItems,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to save document favs: ${response.statusText}`)
  }

  const data = await response.json()

  return validateDocumentFavState(data)
}
