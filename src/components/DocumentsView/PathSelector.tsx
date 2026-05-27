/**
 * PathSelector - Modal for selecting document paths to include in documents view
 *
 * @testid path-selector — Main container for the path selector modal
 * @testid path-checkbox-{path} — Checkbox for a specific path (e.g., path-checkbox-docs)
 * @testid path-selector-cancel — Cancel button
 * @testid path-selector-save — Save selection button
 * @testid path-selector-count — Display showing number of selected items
 */
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/auth/authFetch'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/scroll-area'

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

export default function PathSelector({ projectId, onPathsSelected, onCancel }: PathSelectorProps) {
  const [items, setItems] = useState<PathItem[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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
        const configuredPaths = new Set<string>(data.config?.project?.document?.paths || [])
        setSelectedPaths(configuredPaths)
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

  const renderItem = (item: PathItem, depth = 0) => {
    const isSelected = selectedPaths.has(item.path)

    const hasSelectedChildren = Array.from(selectedPaths).some(path =>
      path.startsWith(`${item.path}/`) && path !== item.path,
    )

    // Create a safe testid by replacing special characters
    // ./ becomes _root_ and other slashes become dashes
    const safeTestId = item.path === './'
      ? 'root'
      : item.path.replace(/\//g, '-').replace(/^\./, 'root')

    return (
      <div key={item.path} style={{ marginLeft: `${depth * 20}px` }}>
        <label
          className="flex cursor-pointer items-center rounded py-1 text-foreground hover:bg-accent"
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
          <span className={`text-sm ${item.type === 'folder' ? 'font-medium' : ''} ${hasSelectedChildren ? 'text-primary' : ''}`}>
            {item.type === 'folder' ? '📁' : '📄'}
            {' '}
            {item.name}
          </span>
        </label>
        {item.children && item.children.map(child => renderItem(child, depth + 1))}
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
      <div className="rounded-lg border border-border">
        <div className="p-4">
          {items.map(item => renderItem(item))}
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
        <p className="mt-2 text-xs text-muted-foreground" data-testid="document-exclusion-notice">
          docs/CRs is excluded automatically because it is the ticket area.
        </p>
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
