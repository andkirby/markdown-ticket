import type { PanelImperativeHandle, PanelSize } from 'react-resizable-panels'
import type { DocumentFile, FileTreeHandle } from './FileTree'
import { ChevronDown, ChevronUp, Crosshair, ListCollapse, PanelLeftClose, PanelLeftOpen, Search, Settings } from 'lucide-react'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { authFetch } from '@/auth/authFetch'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { saveDocumentFavs } from '../../config/documentFavs'
import {
  addRecentDocument,
  getDocumentNavigationPreferences,
  sanitizeDocumentNavigationPreferences,
  setDocumentNavigationPreferences,
} from '../../config/documentNavigation'
import { getDocumentSortPreferences, setDocumentSortPreferences } from '../../config/documentSorting'
import { formatDocumentPageTitle, PageTitlePriority, usePageTitle } from '../../hooks/usePageTitle'
import { useEventBus } from '../../services/eventBus'
import {
  resolveDocumentFilenameTabs,
  resolveFilenameTabFallback,
} from './documentFilenameTabModel'
import DocumentFilenameTabs from './DocumentFilenameTabs'
import FavDocuments from './FavDocuments'
import FileTree from './FileTree'
import MarkdownViewer from './MarkdownViewer'
import PathSelector from './PathSelector'
import RecentDocuments from './RecentDocuments'

interface DocumentsLayoutProps {
  projectId: string
  canWrite?: boolean
}

const DOCUMENT_NAVIGATION_PANEL_MIN_SIZE = 18
const DOCUMENT_NAVIGATION_PANEL_MAX_SIZE = 45
const DOCUMENT_NAVIGATION_PANEL_COLLAPSED_SIZE = 0

export default function DocumentsLayout({ projectId, canWrite = true }: DocumentsLayoutProps) {
  const { projectCode } = useParams<{ projectCode: string }>()
  const [searchParams] = useSearchParams()
  const pathParams = useParams<{ '*': string }>()
  const pathFromRoute = pathParams['*']
  const [files, setFiles] = useState<DocumentFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPathSelector, setShowPathSelector] = useState(false)
  const [noDocumentPathsConfigured, setNoDocumentPathsConfigured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [documentRefreshToken, setDocumentRefreshToken] = useState(0)
  const [selectedFileDeleted, setSelectedFileDeleted] = useState(false)
  const [viewerUpdateState, setViewerUpdateState] = useState<'idle' | 'updated' | 'syncing'>('idle')
  const [navigationPreferences, setNavigationPreferences] = useState(() =>
    getDocumentNavigationPreferences(projectId))

  // Load sort preferences from localStorage on mount
  const savedPreferences = getDocumentSortPreferences(projectId)
  const [sortBy, setSortBy] = useState<'name' | 'title' | 'created' | 'modified'>(savedPreferences.sortBy)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(savedPreferences.sortDirection)

  // Refs to store timeout IDs for cleanup
  const sortByTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sortDirectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedFileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigationPanelRef = useRef<PanelImperativeHandle | null>(null)
  const selectedFileRef = useRef<string | null>(null)
  const fileTreeRef = useRef<FileTreeHandle>(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      sortByTimeoutRef.current && clearTimeout(sortByTimeoutRef.current)
      sortDirectionTimeoutRef.current && clearTimeout(sortDirectionTimeoutRef.current)
      selectedFileTimeoutRef.current && clearTimeout(selectedFileTimeoutRef.current)
      errorTimeoutRef.current && clearTimeout(errorTimeoutRef.current)
      updateStateTimeoutRef.current && clearTimeout(updateStateTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    selectedFileRef.current = selectedFile
    setSelectedFileDeleted(false)
    setViewerUpdateState('idle')
  }, [selectedFile])

  useEffect(() => {
    setNavigationPreferences(getDocumentNavigationPreferences(projectId))
  }, [projectId])

  const persistNavigationPreferences = useCallback((preferences: typeof navigationPreferences) => {
    setDocumentNavigationPreferences(projectId, preferences)
    setNavigationPreferences(preferences)
  }, [projectId])

  const handleNavigationPanelResize = useCallback((panelSize: PanelSize, _id: string | number | undefined, previousPanelSize: PanelSize | undefined) => {
    if (!previousPanelSize)
      return

    const isCollapsed = panelSize.asPercentage <= DOCUMENT_NAVIGATION_PANEL_COLLAPSED_SIZE + 1
    persistNavigationPreferences({
      ...navigationPreferences,
      navigationPanelCollapsed: isCollapsed,
      navigationPanelSize: isCollapsed
        ? navigationPreferences.navigationPanelSize
        : panelSize.asPercentage,
    })
  }, [navigationPreferences, persistNavigationPreferences])

  const handleToggleNavigationPanel = useCallback(() => {
    const nextCollapsed = !navigationPreferences.navigationPanelCollapsed

    if (nextCollapsed) {
      navigationPanelRef.current?.collapse()
    }
    else {
      navigationPanelRef.current?.expand()
    }

    persistNavigationPreferences({
      ...navigationPreferences,
      navigationPanelCollapsed: nextCollapsed,
    })
  }, [navigationPreferences, persistNavigationPreferences])

  // Helper to sanitize and validate relative path (blocks .. traversal)
  const sanitizePath = (relativePath: string): string | null => {
    // Decode URL encoding to catch encoded traversal attempts
    let decoded = relativePath
    try {
      decoded = decodeURIComponent(relativePath)
    }
    catch {
      console.warn('Invalid URL encoding blocked:', relativePath)
      return null
    }

    // Block path traversal attempts (including encoded variants)
    if (decoded.includes('..') || decoded.includes('%2e%2e')) {
      console.warn('Path traversal attempt blocked:', relativePath)
      return null
    }

    // Block absolute paths
    if (decoded.startsWith('/')) {
      console.warn('Absolute path attempt blocked:', relativePath)
      return null
    }

    // Normalize slashes
    return decoded.replace(/\/+/g, '/')
  }

  // Reset and load sort preferences when project changes
  useEffect(() => {
    const preferences = getDocumentSortPreferences(projectId)
    sortByTimeoutRef.current = setTimeout(() => {
      setSortBy(preferences.sortBy)
    }, 0)
    sortDirectionTimeoutRef.current = setTimeout(() => {
      setSortDirection(preferences.sortDirection)
    }, 0)
  }, [projectId])

  // Persist sort preferences to localStorage when they change
  useEffect(() => {
    setDocumentSortPreferences(projectId, { sortBy, sortDirection })
  }, [projectId, sortBy, sortDirection])

  // Initialize selected file from URL — prefer path-style route, fall back to query param
  useEffect(() => {
    // MDT-150: Support both path-style (/prj/MDT/documents/docs/file.md) and query-param (?file=...)
    const fileSource = pathFromRoute || searchParams.get('file')
    if (fileSource) {
      const sanitized = sanitizePath(fileSource)
      if (sanitized) {
        selectedFileTimeoutRef.current = setTimeout(() => {
          setSelectedFile(sanitized)
        }, 0)
      }
      else {
        selectedFileTimeoutRef.current = setTimeout(() => {
          setSelectedFile(null)
        }, 0)
        errorTimeoutRef.current = setTimeout(() => {
          setError('Invalid file path')
        }, 0)
      }
    }
    else {
      selectedFileTimeoutRef.current = setTimeout(() => {
        setSelectedFile(null)
      }, 0)
    }
  }, [pathFromRoute, searchParams])

  const loadDocuments = useCallback(async (showLoading = true): Promise<DocumentFile[]> => {
    try {
      if (showLoading)
        setLoading(true)
      setError(null)
      const response = await authFetch(`/api/documents?projectId=${encodeURIComponent(projectId)}`)

      if (response.status === 404) {
        setNoDocumentPathsConfigured(true)
        setShowPathSelector(false)
        setFiles([])
        return []
      }
      else if (response.ok) {
        const data = await response.json()
        setFiles(data)
        setNoDocumentPathsConfigured(false)
        setShowPathSelector(false)
        return data
      }
      else {
        throw new Error(`Failed to load documents: ${response.statusText}`)
      }
    }
    catch (error) {
      console.error('Failed to load documents:', error)
      setError(error instanceof Error ? error.message : 'Failed to load documents')
      return []
    }
    finally {
      if (showLoading)
        setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const showTransientUpdateState = useCallback((state: 'updated' | 'syncing') => {
    setViewerUpdateState(state)
    if (updateStateTimeoutRef.current)
      clearTimeout(updateStateTimeoutRef.current)
    updateStateTimeoutRef.current = setTimeout(() => {
      setViewerUpdateState('idle')
    }, 2500)
  }, [])

  const selectFile = useCallback((filePath: string) => {
    setSelectedFile(filePath)
    addRecentDocument(projectId, filePath)
    setNavigationPreferences(getDocumentNavigationPreferences(projectId))

    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
    const basePath = window.location.pathname.split('/documents')[0]
    window.history.pushState({}, '', `${basePath}/documents?file=${encodedPath}`)
  }, [projectId])

  useEventBus('document:file:changed', useCallback((event) => {
    if (event.payload.projectId !== projectId)
      return

    const currentSelectedFile = selectedFileRef.current
    const selectedFileChanged = currentSelectedFile === event.payload.filePath

    loadDocuments(false)
      .then((nextFiles) => {
        if (!selectedFileChanged || event.payload.eventType !== 'unlink' || !currentSelectedFile) {
          return
        }

        const fallbackFile = resolveFilenameTabFallback(nextFiles, currentSelectedFile)
        if (fallbackFile) {
          selectFile(fallbackFile)
          return
        }

        setSelectedFileDeleted(true)
        setViewerUpdateState('idle')
      })
      .catch((error) => {
        console.error('Failed to refresh documents after SSE update:', error)
      })

    if (!selectedFileChanged)
      return

    if (event.payload.eventType === 'unlink') {
      setViewerUpdateState('idle')
      return
    }

    setSelectedFileDeleted(false)
    setDocumentRefreshToken(token => token + 1)
    showTransientUpdateState('updated')
  }, [loadDocuments, projectId, selectFile, showTransientUpdateState]), [loadDocuments, projectId, selectFile, showTransientUpdateState], 'DocumentsLayout')

  useEventBus('sse:reconnected', useCallback(() => {
    showTransientUpdateState('syncing')
    loadDocuments(false).catch((error) => {
      console.error('Failed to refresh documents after SSE reconnect:', error)
    })
    if (selectedFileRef.current) {
      setSelectedFileDeleted(false)
      setDocumentRefreshToken(token => token + 1)
    }
  }, [loadDocuments, showTransientUpdateState]), [loadDocuments, showTransientUpdateState], 'DocumentsLayout')

  const collectPaths = useCallback((fileList: DocumentFile[]): string[] => {
    return fileList.flatMap(file => [
      file.path,
      ...(file.children ? collectPaths(file.children) : []),
    ])
  }, [])

  const collectFiles = useCallback((fileList: DocumentFile[]): DocumentFile[] => {
    return fileList.flatMap(file => [
      file,
      ...(file.children ? collectFiles(file.children) : []),
    ])
  }, [])

  useEffect(() => {
    const eligiblePaths = collectPaths(files)
    if (eligiblePaths.length === 0)
      return

    const sanitized = sanitizeDocumentNavigationPreferences(navigationPreferences, eligiblePaths)
    if (JSON.stringify(sanitized) !== JSON.stringify(navigationPreferences)) {
      persistNavigationPreferences(sanitized)
    }
  }, [collectPaths, files, navigationPreferences, persistNavigationPreferences, projectId])

  // Memoized filtered and sorted files
  const filteredFiles = useMemo(() => {
    let processedFiles = files

    // Apply filtering
    if (searchQuery.trim()) {
      const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/)
      const filterFiles = (fileList: DocumentFile[]): DocumentFile[] => {
        return fileList.reduce((filtered: DocumentFile[], file) => {
          const fileName = file.name.toLowerCase()
          const fileTitle = file.title?.toLowerCase() || ''
          const filePath = file.path.toLowerCase()

          const matchesSearch = searchTerms.every(term =>
            fileName.includes(term) || fileTitle.includes(term) || filePath.includes(term),
          )

          if (file.type === 'folder') {
            // For folders, filter children and include folder if it has matching children
            const filteredChildren = filterFiles(file.children || [])
            if (filteredChildren.length > 0 || matchesSearch) {
              filtered.push({
                ...file,
                children: filteredChildren,
              })
            }
          }
          else if (matchesSearch) {
            // For files, include if it matches search
            filtered.push(file)
          }

          return filtered
        }, [])
      }

      processedFiles = filterFiles(processedFiles)
    }

    // Apply sorting
    const sortFiles = (fileList: DocumentFile[]): DocumentFile[] => {
      return fileList.map((file) => {
        if (file.type === 'folder' && file.children) {
          return {
            ...file,
            children: sortFiles(file.children),
          }
        }
        return file
      }).sort((a, b) => {
        let aValue: string
        let bValue: string

        if (sortBy === 'created' || sortBy === 'modified') {
          // Date-based sorting
          const aDate = sortBy === 'created' ? a.dateCreated : a.lastModified
          const bDate = sortBy === 'created' ? b.dateCreated : b.lastModified

          const aTime = aDate ? new Date(aDate).getTime() : 0
          const bTime = bDate ? new Date(bDate).getTime() : 0

          const comparison = aTime - bTime
          return sortDirection === 'asc' ? comparison : -comparison
        }
        else {
          // String-based sorting (name, title)
          switch (sortBy) {
            case 'title':
              aValue = a.title || a.name
              bValue = b.title || b.name
              break
            case 'name':
            default:
              aValue = a.name
              bValue = b.name
              break
          }

          const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
          return sortDirection === 'asc' ? comparison : -comparison
        }
      })
    }

    return sortFiles(processedFiles)
  }, [files, searchQuery, sortBy, sortDirection])

  // Helper function to find file by path in nested structure
  const findFileByPath = useCallback((fileList: DocumentFile[], targetPath: string): DocumentFile | null => {
    const find = (items: DocumentFile[]): DocumentFile | null => {
      for (const file of items) {
        if (file.path === targetPath) {
          return file
        }
        if (file.children) {
          const found = find(file.children)
          if (found)
            return found
        }
      }
      return null
    }

    return find(fileList)
  }, [])

  const applyFavItemsToFiles = useCallback((fileList: DocumentFile[], favItems: Array<Pick<DocumentFile, 'path' | 'type' | 'favoritedAt'>>): DocumentFile[] => {
    const favs = new Map(favItems.map(item => [item.path, item]))

    return fileList.map((file) => {
      const fav = favs.get(file.path)
      return {
        ...file,
        favorite: Boolean(fav),
        favoritedAt: fav?.favoritedAt,
        ...(file.children ? { children: applyFavItemsToFiles(file.children, favItems) } : {}),
      }
    })
  }, [])

  const favoriteDocuments = useMemo(() => {
    return collectFiles(files)
      .filter(file => file.favorite && file.favoritedAt)
      .sort((a, b) => new Date(b.favoritedAt!).getTime() - new Date(a.favoritedAt!).getTime())
  }, [collectFiles, files])

  const handleToggleFavorite = useCallback(async (file: DocumentFile) => {
    if (!canWrite) {
      return
    }

    const nextFavItems = file.favorite
      ? favoriteDocuments
          .filter(document => document.path !== file.path)
          .map(document => ({
            path: document.path,
            type: document.type,
            favoritedAt: document.favoritedAt!,
          }))
      : [
          {
            path: file.path,
            type: file.type,
            favoritedAt: new Date().toISOString(),
          },
          ...favoriteDocuments.map(document => ({
            path: document.path,
            type: document.type,
            favoritedAt: document.favoritedAt!,
          })),
        ]

    const previousFiles = files
    setFiles(applyFavItemsToFiles(files, nextFavItems))

    try {
      const savedState = await saveDocumentFavs({ projectId, favItems: nextFavItems })
      setFiles(currentFiles => applyFavItemsToFiles(currentFiles, savedState.favItems))
    }
    catch (error) {
      setFiles(previousFiles)
      setError(error instanceof Error ? error.message : 'Failed to save document favs')
    }
  }, [applyFavItemsToFiles, canWrite, favoriteDocuments, files, projectId])

  const handleSelectFavorite = useCallback((file: DocumentFile) => {
    if (file.type === 'file') {
      selectFile(file.path)
      return
    }

    if (searchQuery) {
      setSearchQuery('')
      window.setTimeout(() => fileTreeRef.current?.locatePath(file.path), 0)
      return
    }

    fileTreeRef.current?.locatePath(file.path)
  }, [searchQuery, selectFile])

  const recentDocuments = useMemo(() => {
    return navigationPreferences.recentDocuments.map((path) => {
      const file = findFileByPath(files, path)
      return {
        path,
        name: file?.name ?? path.split('/').pop() ?? path,
        title: file?.title,
      }
    })
  }, [files, findFileByPath, navigationPreferences.recentDocuments])

  const handleFavsExpandedChange = useCallback((favsExpanded: boolean) => {
    persistNavigationPreferences({
      ...navigationPreferences,
      favsExpanded,
    })
  }, [navigationPreferences, persistNavigationPreferences])

  const handleFavsShowAllChange = useCallback((favsShowAll: boolean) => {
    persistNavigationPreferences({
      ...navigationPreferences,
      favsShowAll,
    })
  }, [navigationPreferences, persistNavigationPreferences])

  const handleRecentExpandedChange = useCallback((recentExpanded: boolean) => {
    persistNavigationPreferences({
      ...navigationPreferences,
      recentExpanded,
    })
  }, [navigationPreferences, persistNavigationPreferences])

  const filenameTabs = useMemo(() => {
    return resolveDocumentFilenameTabs(files, selectedFile)
  }, [files, selectedFile])

  const selectedDocument = useMemo(() => {
    return selectedFile ? findFileByPath(files, selectedFile) : null
  }, [files, findFileByPath, selectedFile])

  const selectedDocumentTitle = selectedDocument?.title
    || selectedDocument?.name
    || selectedFile?.split('/').pop()
    || null

  usePageTitle(
    selectedFile && !selectedFileDeleted
      ? formatDocumentPageTitle(projectCode, selectedDocumentTitle)
      : null,
    PageTitlePriority.DOCUMENT,
  )

  const handlePathsSelected = async (paths: string[]) => {
    if (!canWrite) {
      return
    }

    try {
      // Save the selected paths to configuration
      const response = await authFetch('/api/documents/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          documentPaths: paths,
        }),
      })

      if (response.ok) {
        // Reload documents after configuration
        await loadDocuments()
      }
      else {
        throw new Error('Failed to save document configuration')
      }
    }
    catch (error) {
      console.error('Failed to configure documents:', error)
      setError(error instanceof Error ? error.message : 'Failed to configure documents')
    }
  }

  const handleCancelPathSelection = () => {
    setShowPathSelector(false)
  }

  const handleScrollToSelectedFile = () => {
    if (!selectedFile) {
      return
    }

    if (!findFileByPath(filteredFiles, selectedFile) && searchQuery) {
      setSearchQuery('')
      window.setTimeout(() => {
        fileTreeRef.current?.scrollToSelectedFile()
      }, 0)
      return
    }

    fileTreeRef.current?.scrollToSelectedFile()
  }

  const handleCollapseTree = () => {
    fileTreeRef.current?.collapseAll()
  }

  const pathSelectorModal = showPathSelector && canWrite
    ? (
        <Modal
          isOpen={showPathSelector}
          onClose={handleCancelPathSelection}
          size="lg"
        >
          <PathSelector
            projectId={projectId}
            onPathsSelected={handlePathsSelected}
            onCancel={handleCancelPathSelection}
          />
        </Modal>
      )
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive mb-2">Error loading documents</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      </div>
    )
  }

  if (noDocumentPathsConfigured) {
    return (
      <>
        <div data-testid="document-tree" className="flex h-64 items-center justify-center px-4">
          <div className="max-w-sm text-center">
            <h3 className="text-base font-semibold text-foreground">No document paths configured</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose which folders or Markdown files should appear in Documents View.
            </p>
            {canWrite && (
              <Button
                type="button"
                onClick={() => setShowPathSelector(true)}
                variant="outline"
                size="sm"
                className="mt-4"
                leftIcon={<Settings className="h-4 w-4" aria-hidden="true" />}
                data-testid="configure-paths-empty-button"
              >
                Configure document paths
              </Button>
            )}
          </div>
        </div>
        {pathSelectorModal}
      </>
    )
  }

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="documents-view__layout">
        <ResizablePanel
          id="documents-navigation"
          panelRef={navigationPanelRef}
          defaultSize={navigationPreferences.navigationPanelCollapsed
            ? `${DOCUMENT_NAVIGATION_PANEL_COLLAPSED_SIZE}%`
            : `${navigationPreferences.navigationPanelSize}%`}
          minSize={`${DOCUMENT_NAVIGATION_PANEL_MIN_SIZE}%`}
          maxSize={`${DOCUMENT_NAVIGATION_PANEL_MAX_SIZE}%`}
          collapsedSize={`${DOCUMENT_NAVIGATION_PANEL_COLLAPSED_SIZE}%`}
          collapsible
          onResize={handleNavigationPanelResize}
          className="documents-view__navigation-panel"
        >
          <div className="documents-view__navigation-inner">
            <div className="documents-view__navigation-header">
              <div className="documents-view__navigation-primary-row">
                <div className="flex min-w-0 items-center">
                  <h3 className="font-semibold text-foreground">Documents</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleToggleNavigationPanel}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Hide document navigation"
                    aria-label="Hide document navigation"
                    data-testid="toggle-document-navigation-button"
                  >
                    <PanelLeftClose className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCollapseTree}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Collapse document tree"
                    aria-label="Collapse document tree"
                    data-testid="collapse-document-tree-button"
                  >
                    <ListCollapse className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={handleScrollToSelectedFile}
                    disabled={!selectedFile}
                    className="p-1 hover:bg-muted rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    title="Scroll to active document"
                    aria-label="Scroll to active document"
                    data-testid="scroll-to-active-document-button"
                  >
                    <Crosshair className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => setShowPathSelector(true)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="Configure document paths"
                      aria-label="Configure document paths"
                      data-testid="configure-paths-button"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </div>
              <div className="documents-view__navigation-controls-row">
                <div className="documents-view__search-field">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    data-testid="document-filter-input"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'name' | 'title' | 'created' | 'modified')}
                  className="documents-view__sort-select"
                  title="Sort by"
                >
                  <option value="name">Filename</option>
                  <option value="title">Title</option>
                  <option value="created">Created Date</option>
                  <option value="modified">Update Date</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="documents-view__sort-direction-button"
                  title={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                  aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                >
                  {sortDirection === 'asc'
                    ? (
                        <ChevronUp className="h-3 w-3" />
                      )
                    : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                </button>
              </div>
            </div>
            <div className="flex-shrink-0 p-2 pb-0">
              <FavDocuments
                documents={favoriteDocuments}
                isExpanded={navigationPreferences.favsExpanded}
                showAll={navigationPreferences.favsShowAll}
                onSelectDocument={handleSelectFavorite}
                onToggleFavorite={canWrite ? handleToggleFavorite : undefined}
                onExpandedChange={handleFavsExpandedChange}
                onShowAllChange={handleFavsShowAllChange}
              />
              <RecentDocuments
                documents={recentDocuments}
                isExpanded={navigationPreferences.recentExpanded}
                onSelectDocument={selectFile}
                onExpandedChange={handleRecentExpandedChange}
              />
            </div>
            <ScrollArea className="min-h-0 flex-1" data-testid="document-tree-scroll-area">
              <div className="p-2">
                <FileTree
                  ref={fileTreeRef}
                  files={filteredFiles}
                  onFileSelect={selectFile}
                  selectedFile={selectedFile}
                  expandAllFolders={Boolean(searchQuery.trim())}
                  onToggleFavorite={canWrite ? handleToggleFavorite : undefined}
                />
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="documents-view__resize-handle" />
        <ResizablePanel id="documents-preview" minSize={40} className="documents-view__preview-panel">
          {navigationPreferences.navigationPanelCollapsed && (
            <button
              type="button"
              onClick={handleToggleNavigationPanel}
              className="documents-view__navigation-expand"
              title="Show document navigation"
              aria-label="Show document navigation"
              data-testid="show-document-navigation-button"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
          {selectedFile
            ? (
                <div className="documents-view__viewer-panel">
                  {filenameTabs && (
                    <div className="documents-view__filename-tabs">
                      <DocumentFilenameTabs
                        tabs={filenameTabs.tabs}
                        activeTabKey={filenameTabs.activeTabKey}
                        onSelectTab={selectFile}
                      />
                    </div>
                  )}
                  <div className="documents-view__viewer-content">
                    <MarkdownViewer
                      projectId={projectId}
                      filePath={selectedFile}
                      fileInfo={selectedDocument}
                      refreshToken={documentRefreshToken}
                      fileDeleted={selectedFileDeleted}
                      updateState={viewerUpdateState}
                    />
                  </div>
                </div>
              )
            : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a document to view
                </div>
              )}
        </ResizablePanel>
      </ResizablePanelGroup>
      {pathSelectorModal}
    </>
  )
}
