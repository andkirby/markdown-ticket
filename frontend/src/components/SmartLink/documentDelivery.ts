import * as React from 'react'

/**
 * MDT-248 — contextual delivery for repo-document links.
 *
 * The ticket viewer provides a handler while its modal hosts the markdown;
 * every other surface renders without a provider and `useDocumentDelivery()`
 * returns null, keeping today's router navigation byte-identical (C6).
 */
export interface DocumentDelivery {
  openDocument: (filePath: string) => void
}

export const DocumentDeliveryContext = React.createContext<DocumentDelivery | null>(null)

export function useDocumentDelivery(): DocumentDelivery | null {
  return React.useContext(DocumentDeliveryContext)
}

/**
 * Extract the project-relative document path from a documents-route href
 * (`/prj/:code/documents?file=<path>`). Returns null when the href is not a
 * documents route.
 */
export function documentTargetFromHref(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin)
    if (!url.pathname.endsWith('/documents'))
      return null
    return url.searchParams.get('file')
  }
  catch {
    return null
  }
}
