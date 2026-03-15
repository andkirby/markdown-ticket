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
 * MDT-138: Uses dot notation for virtual folders, slash notation for physical folders.
 * Also generates slash-separated paths for virtual folders for backward compatibility.
 */
function collectPaths(docs: SubDocument[], prefix = '', isVirtualPrefix = false): Set<string> {
  const paths = new Set<string>()
  for (const doc of docs) {
    // Use dot separator if parent is virtual, otherwise use slash
    const separator = isVirtualPrefix || doc.isVirtual ? '.' : '/'
    const fullPath = prefix ? `${prefix}${separator}${doc.name}` : doc.name
    paths.add(fullPath)

    // MDT-138: For backward compatibility, also add slash-separated path for virtual folders
    if (isVirtualPrefix || doc.isVirtual) {
      const slashPath = prefix ? `${prefix}/${doc.name}` : doc.name
      paths.add(slashPath)
    }

    if (doc.kind === 'folder' && doc.children.length > 0) {
      // Pass along virtual flag to children
      const isVirtual = doc.isVirtual === true
      for (const child of collectPaths(doc.children, fullPath, isVirtual)) {
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
 * MDT-138: Handles both slash-separated (physical folders) and dot-notation (virtual folders) paths.
 */
function deriveFolderStack(path: string, subdocuments: SubDocument[]): string[] {
  // MDT-138: Split by both slash and dot to handle both physical and virtual folders
  const segments = path.split(/[./]/)

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
  // Note: We use a ref to track if we've already initialized from URL to avoid stale closure issues
  // MDT-138: Removed state.selectedPath from deps to prevent race condition.
  // Only sync FROM URL TO state, not the other way around.
  useEffect(() => {
    const fromPath = initFromPath(subdocuments, ticketCode, projectCode, location)
    // Only update if we found a valid path in the URL that differs from current state
    if (fromPath.selectedPath !== 'main' && !fromPath.needsRedirect && fromPath.selectedPath !== state.selectedPath) {
      setState(prev => ({ ...prev, selectedPath: fromPath.selectedPath, folderStack: fromPath.folderStack }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdocuments, ticketCode, projectCode, location])

  const selectPath = useCallback((path: string) => {
    // Set pending path to indicate preload is in progress
    setPendingPath(path)

    const folderStack = deriveFolderStack(path, subdocuments)

    setState(prev => ({ ...prev, selectedPath: path, folderStack, needsRedirect: false }))

    // Update URL to include namespace path for deep linking support
    const urlPath = apiPathToUrlPath(path)
    navigate(`/prj/${projectCode}/ticket/${ticketCode}/${urlPath}`, { replace: true })
  }, [subdocuments, projectCode, ticketCode, navigate])

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
