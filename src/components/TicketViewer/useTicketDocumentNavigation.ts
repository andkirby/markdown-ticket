/**
 * useTicketDocumentNavigation - MDT-093, MDT-094.
 *
 * Sole frontend authority for selected path and folder-stack transitions.
 * Manages URL path synchronization for deep linking (path-based routing).
 *
 * Covers: BR-4.1, BR-4.2, BR-4.3, BR-4.4, C4
 */

import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import type { SubDocument } from '@mdt/shared/models/SubDocument.js'
import { apiPathToUrlPath, extractSubDocPath, urlPathToApiPath } from '../../utils/subdocPathValidation'

interface UseTicketDocumentNavigationOptions {
  subdocuments: SubDocument[]
  ticketCode: string // Added for URL generation
  projectCode: string // Added for direct navigation (avoids redirect/remount)
}

interface UseTicketDocumentNavigationResult {
  selectedPath: string
  folderStack: string[]
  selectPath: (path: string) => void
  pendingPath: string | null
  confirmPathSwitch: () => void
}

/**
 * Find all valid file/folder paths in the subdocument tree.
 */
function collectPaths(docs: SubDocument[], prefix = ''): Set<string> {
  const paths = new Set<string>()
  for (const doc of docs) {
    const fullPath = prefix ? `${prefix}/${doc.name}` : doc.name
    paths.add(fullPath)
    if (doc.kind === 'folder' && doc.children.length > 0) {
      for (const child of collectPaths(doc.children, fullPath)) {
        paths.add(child)
      }
    }
  }
  return paths
}

/**
 * Derive folder stack from a selected path and subdocument tree.
 * Files: parent folder segments. e.g. 'poc/spike' → ['poc']
 * Folders: all segments including the folder itself. e.g. 'poc' → ['poc']
 */
function deriveFolderStack(path: string, subdocuments: SubDocument[]): string[] {
  const segments = path.split('/')

  const isFolder = (docs: SubDocument[], segs: string[]): boolean => {
    if (segs.length === 0) return false
    const [head, ...rest] = segs
    const match = docs.find(d => d.name === head)
    if (!match) return false
    if (rest.length === 0) return match.kind === 'folder'
    return isFolder(match.children, rest)
  }

  if (isFolder(subdocuments, segments)) {
    return segments
  }
  return segments.slice(0, -1)
}

/**
 * Initialize selected path from URL path, falling back to 'main' if invalid.
 * Handles backward compatibility with hash-based URLs.
 */
function initFromPath(
  subdocuments: SubDocument[],
  ticketCode: string,
  projectCode: string,
  location: Location,
): { selectedPath: string, folderStack: string[], needsRedirect: boolean, redirectUrl?: string } {
  // Check for hash-based URL (backward compatibility)
  const hash = location.hash.replace(/^#/, '')
  if (hash) {
    const validPaths = collectPaths(subdocuments)
    if (validPaths.has(hash)) {
      // Redirect to path-based URL (using full project path to avoid double redirect)
      const urlPath = apiPathToUrlPath(hash)
      return {
        selectedPath: hash,
        folderStack: deriveFolderStack(hash, subdocuments),
        needsRedirect: true,
        redirectUrl: `/prj/${projectCode}/ticket/${ticketCode}/${urlPath}`,
      }
    }
  }

  // Check for path-based URL
  const subDocPath = extractSubDocPath(location.pathname, ticketCode)
  if (subDocPath) {
    const apiPath = urlPathToApiPath(subDocPath)
    const validPaths = collectPaths(subdocuments)
    if (validPaths.has(apiPath)) {
      return {
        selectedPath: apiPath,
        folderStack: deriveFolderStack(apiPath, subdocuments),
        needsRedirect: false,
      }
    }
  }

  // Default to main document
  return { selectedPath: 'main', folderStack: [], needsRedirect: false }
}

export function useTicketDocumentNavigation(
  options: UseTicketDocumentNavigationOptions,
): UseTicketDocumentNavigationResult {
  const { subdocuments, ticketCode, projectCode } = options
  const location = useLocation()
  const navigate = useNavigate()

  const [state, setState] = useState(() => initFromPath(subdocuments, ticketCode, projectCode, location))
  const [pendingPath, setPendingPath] = useState<string | null>(null)

  // Handle redirect from hash-based URL
  useEffect(() => {
    if (state.needsRedirect && state.redirectUrl) {
      navigate(state.redirectUrl, { replace: true })
    }
  }, [state.needsRedirect, state.redirectUrl, navigate])

  // Re-check path when subdocuments become available after async fetch
  useEffect(() => {
    if (state.selectedPath === 'main') {
      const fromPath = initFromPath(subdocuments, ticketCode, projectCode, location)
      if (fromPath.selectedPath !== 'main' && !fromPath.needsRedirect) {
        setState(prev => ({ ...prev, selectedPath: fromPath.selectedPath, folderStack: fromPath.folderStack }))
      }
    }
  }, [subdocuments, ticketCode, projectCode, location])

  const selectPath = useCallback((path: string) => {
    // Set pending path to indicate preload is in progress
    setPendingPath(path)

    const folderStack = deriveFolderStack(path, subdocuments)

    setState(prev => ({ ...prev, selectedPath: path, folderStack, needsRedirect: false }))

    // URL is kept at the ticket level (/prj/CODE/ticket/KEY) to avoid
    // React Router route switching between exact and wildcard routes,
    // which remounts ProjectRouteHandler and breaks modal state.
    // Deep linking to subdocs is still supported via initial URL parsing.
  }, [subdocuments])

  const confirmPathSwitch = useCallback(() => {
    setPendingPath(null)
  }, [])

  return {
    selectedPath: state.selectedPath,
    folderStack: state.folderStack,
    selectPath,
    pendingPath,
    confirmPathSwitch,
  }
}
