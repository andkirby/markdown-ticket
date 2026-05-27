/**
 * PathSelector - Modal for selecting document paths to include in documents view
 *
 * @testid path-selector — Main container for the path selector modal
 * @testid path-checkbox-{path} — Checkbox for a specific path (e.g., path-checkbox-docs)
 * @testid path-selector-cancel — Cancel button
 * @testid path-selector-save — Save selection button
 * @testid path-selector-count — Display showing number of selected items
 */
import { ChevronDown, ChevronRight, File, Folder, Info, ListCollapse, ListTree } from 'lucide-react'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/auth/authFetch'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface PathItem {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: PathItem[]
  selected?: boolean
}

interface PathSelectorProps {
  projectId: string
  onPathsSelected: (paths: string[]) => void
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

export default function PathSelector({ projectId, onPathsSelected, onCancel }: PathSelectorProps) {
  const [items, setItems] = useState<PathItem[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set())
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [maxDepth, setMaxDepth] = useState(5)
  const [ticketsPath, setTicketsPath] = useState('docs/CRs')

  const loadFileSystem = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const response = await authFetch(`/api/filesystem?projectId=${encodeURIComponent(projectId)}`, {
        ownerIntent: true,
      })

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
      setLoadError(error instanceof Error ? error.message : 'Failed to load selectable paths')
    }
    finally {
      setLoading(false)
    }
  }, [projectId])

  const loadCurrentDocumentPaths = useCallback(async () => {
    try {
      // Get the actual configured paths from the config file
      const response = await authFetch(`/api/projects/${encodeURIComponent(projectId)}/config`)

      if (response.ok) {
        const data = await response.json()

        // Use document.paths from config (nested under project.document)
        // API returns: { project, config: { project: { document: { paths: [...] } } } }
        const configuredPaths = new Set<string>(data.config?.project?.document?.paths || data.config?.document?.paths || [])
        const configuredMaxDepth = data.config?.project?.document?.maxDepth ?? data.config?.document?.maxDepth
        const configuredTicketsPath = data.config?.project?.ticketsPath
          ?? data.project?.project?.ticketsPath
          ?? data.project?.project?.path
          ?? data.config?.project?.path

        setSelectedPaths(configuredPaths)
        setExpandedPaths(new Set(collectAncestorPaths(configuredPaths)))
        setMaxDepth(typeof configuredMaxDepth === 'number' ? configuredMaxDepth : 5)
        setTicketsPath(typeof configuredTicketsPath === 'string' && configuredTicketsPath.trim() ? configuredTicketsPath : 'docs/CRs')
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

  const toggleSelection = (path: string, _isFolder: boolean, _item?: PathItem) => {
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

      return [
        item.path,
        ...collectFolderPaths(item.children || []),
      ]
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

    const hasSelectedChildren = Array.from(selectedPaths).some(path =>
      path.startsWith(`${item.path}/`) && path !== item.path,
    )

    const safeTestId = getSafeTestId(item.path)

    return (
      <div key={item.path} style={{ marginLeft: `${depth * 20}px` }}>
        <div className="flex items-center rounded py-1 text-foreground hover:bg-accent">
          {isFolder && hasChildren
            ? (
                <button
                  type="button"
                  onClick={() => toggleExpansion(item.path)}
                  className="mr-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name}`}
                  data-testid={`path-toggle-${safeTestId}`}
                >
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                </button>
              )
            : <span className="mr-1 h-6 w-6 flex-shrink-0" />}
          <label
            className="flex min-w-0 flex-1 cursor-pointer items-center"
            htmlFor={`checkbox-${item.path}`}
          >
            <input
              id={`checkbox-${item.path}`}
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelection(item.path, item.type === 'folder', item)}
              className="mr-2 cursor-pointer"
              data-testid={`path-checkbox-${safeTestId}`}
            />
            {isFolder
              ? <Folder className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
              : <File className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />}
            <span
              className={cn(
                'truncate text-sm',
                isFolder && 'font-medium',
                hasSelectedChildren && 'text-primary',
              )}
            >
              {item.name}
            </span>
          </label>
        </div>
        {isFolder && isExpanded && item.children?.map(child => renderItem(child, depth + 1))}
      </div>
    )
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading file system...</div>
        </div>
      )
    }

    if (loadError) {
      return (
        <div className="flex h-64 items-center justify-center rounded-lg border border-border px-4 text-center text-sm text-destructive">
          {loadError}
        </div>
      )
    }

    if (items.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center rounded-lg border border-border px-4 text-center text-sm text-muted-foreground">
          No selectable document paths found.
        </div>
      )
    }

    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandAll}
            disabled={items.length === 0}
            leftIcon={<ListTree className="h-4 w-4" aria-hidden="true" />}
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
            leftIcon={<ListCollapse className="h-4 w-4" aria-hidden="true" />}
            data-testid="path-selector-collapse-all"
          >
            Collapse all
          </Button>
        </div>
        <div className="rounded-lg border border-border" data-testid="path-selector-tree">
          <div className="p-4">
            {items.map(item => renderItem(item))}
          </div>
        </div>
      </div>
    )
  }

  const handleSave = () => {
    onPathsSelected(Array.from(selectedPaths))
  }

  return (
    <div className="flex flex-col h-[70vh]" data-testid="path-selector">
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h3 className="mb-2 text-xl font-semibold text-foreground">Select Document Paths</h3>
        <p className="text-sm text-muted-foreground">
          Choose the files and folders you want to include in the documents view.
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span data-testid="path-selector-max-depth">
            Max depth:
            {' '}
            {maxDepth}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Ticket path exclusion details"
                  data-testid="path-selector-info"
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" data-testid="path-selector-info-tooltip">
                <p>
                  {ticketsPath}
                  {' '}
                  is excluded automatically because it is the ticket area.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <ScrollArea
        type="hover"
        scrollHideDelay={600}
        className="min-h-0 flex-1"
      >
        <div className="p-4">
          {renderContent()}
        </div>
      </ScrollArea>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground" data-testid="path-selector-count">
            {selectedPaths.size}
            {' '}
            item
            {selectedPaths.size !== 1 ? 's' : ''}
            {' '}
            selected
          </div>
          <div className="flex space-x-3">
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
