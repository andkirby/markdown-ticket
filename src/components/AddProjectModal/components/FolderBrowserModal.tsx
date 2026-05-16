import { ChevronRight, Folder } from 'lucide-react'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/index'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePathResolution } from '@/hooks/usePathResolution'

interface DirectoryItem {
  name: string
  path: string
  isDirectory: boolean
}

interface DirectoryListing {
  currentPath: string
  parentPath: string
  directories: DirectoryItem[]
}

interface FolderBrowserModalProps {
  isOpen: boolean
  onClose: () => void
  onFolderSelected: (path: string) => void
  initialPath?: string
  title?: string
}

interface ClickState {
  [path: string]: {
    clickCount: number
    lastClickTime: number
  }
}

export default function FolderBrowserModal({
  isOpen,
  onClose,
  onFolderSelected,
  initialPath = '',
  title = 'Select Folder',
}: FolderBrowserModalProps) {
  const [directoryListing, setDirectoryListing] = useState<DirectoryListing | null>(null)
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [_currentPath, setCurrentPath] = useState<string>('')
  const [clickState, setClickState] = useState<ClickState>({})

  // 🔐 Simplified path resolution hook - uses enhanced API
  const { checkPath } = usePathResolution()

  const loadFileSystem = async (path: string = '') => {
    try {
      setLoading(true)

      // 🔐 Check if path exists and get expanded path from enhanced API
      const pathCheck = await checkPath(path || '~')
      const expandedPath = pathCheck.expandedPath

      const response = await fetch(`/api/directories${expandedPath ? `?path=${encodeURIComponent(expandedPath)}` : ''}`)

      if (response.ok) {
        const data: DirectoryListing = await response.json()
        setDirectoryListing(data)
        if (data.currentPath) {
          setSelectedPath(data.currentPath)
        }
      }
      else {
        console.warn('Directory not found, falling back to home directory')
        // Use the expanded path from checkPath as fallback
        const fallbackResponse = await fetch(`/api/directories?path=${encodeURIComponent(expandedPath)}`)

        if (fallbackResponse.ok) {
          const fallbackData: DirectoryListing = await fallbackResponse.json()
          setDirectoryListing(fallbackData)
          if (fallbackData.currentPath) {
            setSelectedPath(fallbackData.currentPath)
          }
        }
        else {
          console.error('Failed to load home directory as fallback')
          setDirectoryListing(null)
        }
      }
    }
    catch (error) {
      console.error('Failed to load file system:', error)
      setDirectoryListing(null)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setDirectoryListing(null)
      setSelectedPath('')
      setLoading(true)
      setCurrentPath('')
      setClickState({})
      return
    }

    void loadFileSystem(initialPath.trim())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkPath, initialPath, isOpen])

  const navigateToFolder = (path: string) => {
    setCurrentPath(path)
    loadFileSystem(path)
  }

  const navigateUp = () => {
    if (directoryListing?.parentPath) {
      setCurrentPath(directoryListing.parentPath)
      loadFileSystem(directoryListing.parentPath)
    }
  }

  const handleSelect = () => {
    if (selectedPath) {
      onFolderSelected(selectedPath)
      onClose()
    }
  }

  const handleItemClick = (item: DirectoryItem) => {
    if (!item.isDirectory)
      return

    const now = Date.now()
    const currentClickState = clickState[item.path] || { clickCount: 0, lastClickTime: 0 }

    // Check if this is a rapid second click (double click behavior)
    const isDoubleClick = now - currentClickState.lastClickTime < 500

    if (isDoubleClick) {
      // Second click - navigate into folder
      navigateToFolder(item.path)
      setClickState(prev => ({
        ...prev,
        [item.path]: { clickCount: 0, lastClickTime: 0 },
      }))
    }
    else {
      // First click - select folder
      setSelectedPath(item.path)
      setClickState(prev => ({
        ...prev,
        [item.path]: { clickCount: 1, lastClickTime: now },
      }))
    }
  }

  const pathDisplay = (
    <>
      Current:
      {' '}
      <code
        data-testid="folder-browser-current-path"
        className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs"
      >
        {directoryListing?.currentPath || 'Loading...'}
      </code>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" data-testid="folder-browser-modal">
      <ModalHeader title={title} description={pathDisplay} onClose={onClose} closeTestId="folder-browser-close" />

      {/* Content */}
      <ScrollArea
        type="hover"
        scrollHideDelay={600}
        className="h-full"
        style={{ height: 'calc(80vh - 180px)' }}
      >
        <div className="p-4">
          {loading
            ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading folders...</div>
                </div>
              )
            : !directoryListing || directoryListing.directories.length === 0
                ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-muted-foreground">
                        No folders found
                        <div className="text-xs mt-2">
                          Debug:
                          {' '}
                          {directoryListing ? `Found ${directoryListing.directories.length} directories` : 'No directory listing'}
                        </div>
                      </div>
                    </div>
                  )
                  : (
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="p-2">
                          {/* Add ".." parent directory link */}
                          {directoryListing.parentPath && (
                            <div
                              className={`flex items-center py-2 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer group ${
                                selectedPath === directoryListing.parentPath ? 'bg-primary/10 dark:bg-primary/20 border-l-2 border-primary' : ''
                              }`}
                              onClick={() => navigateUp()}
                            >
                              <div className="flex items-center flex-1 min-w-0">
                                <Folder className="w-4 h-4 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                                <span className={`text-sm truncate ${
                                  selectedPath === directoryListing.parentPath ? 'font-medium text-primary dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                                }`}
                                >
                                  ..
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2 opacity-0 group-hover:opacity-100" />
                            </div>
                          )}

                          {directoryListing.directories.map((item) => {
                            const isSelected = selectedPath === item.path
                            return (
                              <div
                                key={item.path}
                                data-testid="folder-browser-item"
                                className={`flex items-center py-2 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer group ${
                                  isSelected ? 'bg-primary/10 dark:bg-primary/20 border-l-2 border-primary' : ''
                                }`}
                                onClick={() => handleItemClick(item)}
                              >
                                <div className="flex items-center flex-1 min-w-0">
                                  <Folder className="w-4 h-4 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                                  <span className={`text-sm truncate ${
                                    isSelected ? 'font-medium text-primary dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                  >
                                    {item.name}
                                  </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2 opacity-0 group-hover:opacity-100" />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <ModalFooter justify="between">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {selectedPath && (
            <span>
              Selected:
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs max-w-xs truncate inline-block">{selectedPath}</code>
            </span>
          )}
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedPath}
            data-testid="folder-browser-select-button"
          >
            Select Folder
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
