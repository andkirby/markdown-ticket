/**
 * PathSelector - Modal for selecting document paths to include in documents view
 *
 * @testid path-selector — Main container for the path selector modal
 * @testid path-checkbox-{path} — Checkbox for a specific path (e.g., path-checkbox-docs)
 * @testid path-selector-cancel — Cancel button
 * @testid path-selector-save — Save selection button
 * @testid path-selector-count — Display showing number of selected items
 */
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  Info,
  ListCollapse,
  ListTree,
} from 'lucide-react'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/auth/authFetch'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface PathItem {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: PathItem[]
  selected?: boolean
}

/** Optional document settings staged alongside path selection (MDT-168). */
export interface DocumentSelectionPatch {
  paths: string[]
  excludeFolders?: string[]
  maxDepth?: number
}

interface PathSelectorProps {
  projectId: string
  /** Called with selected paths; optionally carries excludeFolders/maxDepth (MDT-168). */
  onPathsSelected: (patch: DocumentSelectionPatch) => void
  onCancel: () => void
}

function collectAncestorPaths(paths: Iterable<string>): string[] {
  const ancestors = new Set<string>()

  for (const selectedPath of paths) {
    const normalizedPath = selectedPath.replace(/\/+$/, '')
    if (!normalizedPath || normalizedPath === './') {
      continue
    }

    const parts = normalizedPath.split('/')

    for (let index = 1; index < parts.length; index += 1) {
      ancestors.add(parts.slice(0, index).join('/'))
    }
  }

  return Array.from(ancestors)
}

export default function PathSelector({
  projectId,
  onPathsSelected,
  onCancel,
}: PathSelectorProps) {
  const [items, setItems] = useState<PathItem[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(
    () => new Set(),
  )
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(),
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [maxDepth, setMaxDepth] = useState(5)
  const [ticketsPath, setTicketsPath] = useState('docs/CRs')
  // MDT-168: editable excludeFolders (comma/space-separated input) staged into the patch.
  const [excludeFoldersText, setExcludeFoldersText] = useState('')

  const loadFileSystem = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const response = await authFetch(
        `/api/filesystem?projectId=${encodeURIComponent(projectId)}`,
        {
          ownerIntent: true,
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to load selectable paths (${response.status})`)
      }

      const data: unknown = await response.json()

      if (!Array.isArray(data)) {
        throw new TypeError('Selectable paths response was not a tree')
      }

      setItems(data as PathItem[])
    }
    catch (error) {
      console.error('Failed to load file system:', error)
      setItems([])
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Failed to load selectable paths',
      )
    }
    finally {
      setLoading(false)
    }
  }, [projectId])

  const loadCurrentDocumentPaths = useCallback(async () => {
    try {
      // Get the actual configured paths from the config file
      const response = await authFetch(
        `/api/projects/${encodeURIComponent(projectId)}/config`,
      )

      if (response.ok) {
        const data = await response.json()

        // Use document.paths from config (nested under project.document)
        // API returns: { project, config: { project: { document: { paths: [...] } } } }
        const configuredPaths = new Set<string>(
          data.config?.project?.document?.paths
          || data.config?.document?.paths
          || [],
        )
        const configuredMaxDepth
          = data.config?.project?.document?.maxDepth
            ?? data.config?.document?.maxDepth
        const configuredTicketsPath
          = data.config?.project?.ticketsPath
            ?? data.project?.project?.ticketsPath
            ?? data.project?.project?.path
            ?? data.config?.project?.path

        setSelectedPaths(configuredPaths)
        setExpandedPaths(new Set(collectAncestorPaths(configuredPaths)))
        setMaxDepth(
          typeof configuredMaxDepth === 'number' ? configuredMaxDepth : 5,
        )
        setTicketsPath(
          typeof configuredTicketsPath === 'string'
          && configuredTicketsPath.trim()
            ? configuredTicketsPath
            : 'docs/CRs',
        )
        // MDT-168: load current excludeFolders for editing (exclude the auto-added ticketsPath from the editable text).
        const configuredExcludeFolders: string[]
          = data.config?.project?.document?.excludeFolders
            ?? data.config?.document?.excludeFolders
            ?? []
        setExcludeFoldersText(
          configuredExcludeFolders
            .filter(f => f !== configuredTicketsPath && f !== 'docs/CRs')
            .join(', '),
        )
      }
    }
    catch {
      console.warn('No existing document configuration found')
    }
  }, [projectId])

  useEffect(() => {
    loadFileSystem()
    loadCurrentDocumentPaths()
  }, [loadFileSystem, loadCurrentDocumentPaths])

  const toggleSelection = (
    path: string,
    _isFolder: boolean,
    _item?: PathItem,
  ) => {
    const newSelected = new Set(selectedPaths)

    // Simple toggle - don't auto-select/deselect children
    if (newSelected.has(path)) {
      newSelected.delete(path)
    }
    else {
      newSelected.add(path)
    }

    setSelectedPaths(newSelected)
  }

  const getSafeTestId = (path: string) => {
    return path === './'
      ? 'root'
      : path.replace(/\//g, '-').replace(/^\./, 'root')
  }

  const collectFolderPaths = (pathItems: PathItem[]): string[] => {
    return pathItems.flatMap((item) => {
      if (item.type !== 'folder') {
        return []
      }

      return [item.path, ...collectFolderPaths(item.children || [])]
    })
  }

  const toggleExpansion = (path: string) => {
    setExpandedPaths((currentPaths) => {
      const nextPaths = new Set(currentPaths)

      if (nextPaths.has(path)) {
        nextPaths.delete(path)
      }
      else {
        nextPaths.add(path)
      }

      return nextPaths
    })
  }

  const expandAll = () => {
    setExpandedPaths(new Set(collectFolderPaths(items)))
  }

  const collapseAll = () => {
    setExpandedPaths(new Set())
  }

  const renderItem = (item: PathItem, depth = 0) => {
    const isSelected = selectedPaths.has(item.path)
    const isFolder = item.type === 'folder'
    const isExpanded = expandedPaths.has(item.path)
    const hasChildren = Boolean(item.children?.length)

    const hasSelectedChildren = Array.from(selectedPaths).some(
      path => path.startsWith(`${item.path}/`) && path !== item.path,
    )

    const safeTestId = getSafeTestId(item.path)

    return (
      <div key={item.path} style={{ marginLeft: `${depth * 20}px` }}>
        <div className="path-selector__row">
          {isFolder && hasChildren
            ? (
                <button
                  type="button"
                  onClick={() => toggleExpansion(item.path)}
                  className="path-selector__tree-toggle"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name}`}
                  data-testid={`path-toggle-${safeTestId}`}
                >
                  {isExpanded
                    ? (
                        <ChevronDown className="path-selector__icon" aria-hidden="true" />
                      )
                    : (
                        <ChevronRight className="path-selector__icon" aria-hidden="true" />
                      )}
                </button>
              )
            : (
                <span className="path-selector__tree-toggle-spacer" />
              )}
          <label
            className="path-selector__option"
            htmlFor={`checkbox-${item.path}`}
          >
            <input
              id={`checkbox-${item.path}`}
              type="checkbox"
              checked={isSelected}
              onChange={() =>
                toggleSelection(item.path, item.type === 'folder', item)}
              className="checkbox"
              data-testid={`path-checkbox-${safeTestId}`}
            />
            {isFolder
              ? (
                  <Folder
                    className="path-selector__icon path-selector__icon--muted"
                    aria-hidden="true"
                  />
                )
              : (
                  <File
                    className="path-selector__icon path-selector__icon--muted"
                    aria-hidden="true"
                  />
                )}
            <span
              className={cn(
                'path-selector__name',
                isFolder && 'path-selector__name--folder',
                hasSelectedChildren && 'path-selector__name--selected',
              )}
            >
              {item.name}
            </span>
          </label>
        </div>
        {isFolder
          && isExpanded
          && item.children?.map(child => renderItem(child, depth + 1))}
      </div>
    )
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="documents-view__state">
          <div className="documents-view__state-loading">Loading file system...</div>
        </div>
      )
    }

    if (loadError) {
      return (
        <div className="path-selector__state path-selector__state--destructive">
          {loadError}
        </div>
      )
    }

    if (items.length === 0) {
      return (
        <div className="path-selector__state path-selector__state--muted">
          No selectable document paths found.
        </div>
      )
    }

    return (
      <div>
        <div className="path-selector__toolbar">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandAll}
            disabled={items.length === 0}
            leftIcon={<ListTree className="path-selector__icon" aria-hidden="true" />}
            data-testid="path-selector-expand-all"
          >
            Expand all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={collapseAll}
            disabled={items.length === 0}
            leftIcon={<ListCollapse className="path-selector__icon" aria-hidden="true" />}
            data-testid="path-selector-collapse-all"
          >
            Collapse all
          </Button>
        </div>
        <div className="path-selector__tree" data-testid="path-selector-tree">
          <div className="path-selector__tree-inner">{items.map(item => renderItem(item))}</div>
        </div>
      </div>
    )
  }

  const handleSave = () => {
    // MDT-168: pass the full document patch (paths + editable excludeFolders/maxDepth).
    const excludeFolders = excludeFoldersText
      .split(/[,\s]+/u)
      .map(f => f.trim())
      .filter(f => f.length > 0)
    onPathsSelected({
      paths: Array.from(selectedPaths),
      excludeFolders,
      maxDepth,
    })
  }

  return (
    <div className="path-selector" data-testid="path-selector">
      {/* Fixed Header */}
      <div className="path-selector__header">
        <h3 className="path-selector__title">
          Select Document Paths
        </h3>
        <p className="path-selector__subtitle">
          Choose the files and folders you want to include in the documents
          view.
        </p>
        <div className="path-selector__options">
          <label
            className="path-selector__field"
            data-testid="path-selector-max-depth"
          >
            <span>Max depth:</span>
            <input
              type="number"
              min={1}
              max={10}
              value={maxDepth}
              onChange={e =>
                setMaxDepth(
                  Math.min(10, Math.max(1, Number(e.target.value) || 5)),
                )}
              className="path-selector__field-input path-selector__field-input--num"
              aria-label="Document scan max depth (1 to 10)"
              data-testid="path-selector-max-depth-input"
            />
          </label>
          <label
            className="path-selector__field"
            data-testid="path-selector-exclude-folders"
          >
            <span>Exclude folders:</span>
            <input
              type="text"
              value={excludeFoldersText}
              onChange={e => setExcludeFoldersText(e.target.value)}
              placeholder="node_modules, dist"
              className="path-selector__field-input path-selector__field-input--text"
              aria-label="Folders to exclude from document discovery (comma separated)"
              data-testid="path-selector-exclude-folders-input"
            />
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="path-selector__info-btn"
                  aria-label="Ticket path exclusion details"
                  data-testid="path-selector-info"
                >
                  <Info className="path-selector__icon" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                className="path-selector__tooltip"
                data-testid="path-selector-info-tooltip"
              >
                <p>
                  {ticketsPath}
                  {' '}
                  is excluded automatically because it is the
                  ticket area.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <ScrollArea type="hover" scrollHideDelay={600} className="path-selector__scroll">
        <div className="path-selector__body">{renderContent()}</div>
      </ScrollArea>

      {/* Fixed Footer */}
      <div className="path-selector__footer">
        <div className="path-selector__footer-row">
          <div
            className="path-selector__count"
            data-testid="path-selector-count"
          >
            {selectedPaths.size}
            {' '}
            item
            {selectedPaths.size !== 1 ? 's' : ''}
            {' '}
            selected
          </div>
          <div className="path-selector__actions">
            <Button
              variant="outline"
              onClick={onCancel}
              data-testid="path-selector-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedPaths.size === 0}
              data-testid="path-selector-save"
            >
              Save Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
