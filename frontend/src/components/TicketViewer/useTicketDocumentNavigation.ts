/**
 * useTicketDocumentNavigation - MDT-093, MDT-094.
 *
 * Sole frontend authority for selected path and folder-stack transitions.
 * Manages URL path synchronization for deep linking (path-based routing).
 *
 * Covers: BR-4.1, BR-4.2, BR-4.3, BR-4.4, C4
 */

import type { SubDocument } from '@mdt/shared/models/SubDocument.js'
import type { Location } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { buildTicketSubDocPath, isTraceGraphHash, TRACE_GRAPH_HASH_FRAGMENT } from '../../routes'
import { apiPathToUrlPath, extractSubDocPath, urlPathToApiPath } from '../../utils/subdocPathValidation'
import { deriveFolderStack, ROOT_DOCUMENT_PATH } from './subdocumentPath'

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
 *
 * MDT-138: A subdocument is reachable by BOTH its dot-notation filename form
 * (e.g. `bdd.trace`) AND its slash-separated folder form (e.g. `bdd/trace`),
 * regardless of whether the parent folder is virtual or physical. The URL is
 * derived from the child's filePath, not the folder's storage type, so the
 * valid-path lookup must accept either form.
 *
 * MDT-138 UAT 2026-07-18: previous logic generated both forms only for
 * virtual folders, which made deep links to dot-notation children of physical
 * folders (e.g. `/prj/MDT/ticket/MDT-138/bdd.trace.md`) fall back to Main.
 */
function collectPaths(docs: SubDocument[], prefix = '', isVirtualPrefix = false): Set<string> {
  const paths = new Set<string>()
  for (const doc of docs) {
    // Canonical separator mirrors how the folder itself was reached: dot for
    // virtual ancestry, slash for physical ancestry.
    const separator = isVirtualPrefix ? '.' : '/'
    const fullPath = prefix ? `${prefix}${separator}${doc.name}` : doc.name
    paths.add(fullPath)

    // Always register the alternate form so deep links using the "wrong"
    // separator still round-trip. At the top level (no prefix) both forms
    // collapse to the same string, so we only add when there is a prefix.
    if (prefix) {
      const altSeparator = separator === '.' ? '/' : '.'
      paths.add(`${prefix}${altSeparator}${doc.name}`)
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
 * Initialize selected path from URL path, falling back to 'main' if invalid.
 * Handles backward compatibility with hash-based URLs.
 */
function initFromPath(
  subdocuments: SubDocument[],
  ticketCode: string,
  projectCode: string,
  location: Location,
): { selectedPath: string, folderStack: string[], needsRedirect: boolean, redirectUrl?: string } {
  // Check for hash-based URL (backward compatibility).
  // MDT-174 hot-fix: the reserved `trace` hash is Trace Graph view state, not
  // a legacy subdoc path. Skip the redirect path so it survives navigation.
  const hash = location.hash.replace(/^#/, '')
  if (hash && !isTraceGraphHash(hash)) {
    const validPaths = collectPaths(subdocuments)
    if (validPaths.has(hash)) {
      // Redirect to path-based URL (using full project path to avoid double redirect)
      const urlPath = apiPathToUrlPath(hash)
      return {
        selectedPath: hash,
        folderStack: deriveFolderStack(hash, subdocuments),
        needsRedirect: true,
        redirectUrl: buildTicketSubDocPath(projectCode, ticketCode, urlPath),
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
  return { selectedPath: ROOT_DOCUMENT_PATH, folderStack: [], needsRedirect: false }
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

  // Track previous ticketCode to detect ticket changes
  const prevTicketCodeRef = useRef(ticketCode)

  // Re-check path when subdocuments become available after async fetch
  // Note: We use a ref to track if we've already initialized from URL to avoid stale closure issues
  // MDT-138: Removed state.selectedPath from deps to prevent race condition.
  // Only sync FROM URL TO state, not the other way around.
  useEffect(() => {
    const ticketChanged = prevTicketCodeRef.current !== ticketCode
    prevTicketCodeRef.current = ticketCode

    const fromPath = initFromPath(subdocuments, ticketCode, projectCode, location)

    // If ticket changed, always sync from URL (or reset to main if path invalid)
    if (ticketChanged) {
      setState(prev => ({
        ...prev,
        selectedPath: fromPath.selectedPath,
        folderStack: fromPath.folderStack,
        needsRedirect: fromPath.needsRedirect,
        redirectUrl: fromPath.redirectUrl,
      }))
      return
    }

    // Only update if we found a valid path in the URL that differs from current state
    if (
      fromPath.selectedPath !== ROOT_DOCUMENT_PATH
      && !fromPath.needsRedirect
      && fromPath.selectedPath !== state.selectedPath
    ) {
      setState(prev => ({ ...prev, selectedPath: fromPath.selectedPath, folderStack: fromPath.folderStack }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdocuments, ticketCode, projectCode, location])

  const selectPath = useCallback((path: string) => {
    // Set pending path to indicate preload is in progress
    setPendingPath(path)

    const folderStack = deriveFolderStack(path, subdocuments)

    setState(prev => ({ ...prev, selectedPath: path, folderStack, needsRedirect: false }))

    // Update URL to include namespace path for deep linking support.
    // MDT-174: preserve the reserved `#trace` hash — switching the active
    // document is orthogonal to whether the Trace Graph is open, so the
    // subdoc URL rewrite must not clobber Trace Graph view state.
    const urlPath = apiPathToUrlPath(path)
    const base = buildTicketSubDocPath(projectCode, ticketCode, urlPath)
    const target = isTraceGraphHash(location.hash) ? base + TRACE_GRAPH_HASH_FRAGMENT : base
    navigate(target, { replace: true })
  }, [subdocuments, projectCode, ticketCode, navigate, location.hash])

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
