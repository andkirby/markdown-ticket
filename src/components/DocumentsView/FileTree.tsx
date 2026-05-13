import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'
import * as React from 'react'
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

interface DocumentFile {
  name: string
  path: string
  type: 'file' | 'folder'
  title?: string
  children?: DocumentFile[]
}

interface FileTreeProps {
  files: DocumentFile[]
  onFileSelect: (path: string) => void
  selectedFile: string | null
  expandAllFolders?: boolean
}

export interface FileTreeHandle {
  scrollToSelectedFile: () => void
  collapseAll: () => void
}

function getAllFolderPaths(fileList: DocumentFile[]): string[] {
  const paths: string[] = []
  fileList.forEach((file) => {
    if (file.type === 'folder') {
      paths.push(file.path)
      if (file.children) {
        paths.push(...getAllFolderPaths(file.children))
      }
    }
  })
  return paths
}

function getAncestorFolderPaths(fileList: DocumentFile[], targetPath: string): string[] {
  const findPath = (files: DocumentFile[], ancestors: string[]): string[] | null => {
    for (const file of files) {
      if (file.path === targetPath) {
        return ancestors
      }
      if (file.type === 'folder' && file.children) {
        const found = findPath(file.children, [...ancestors, file.path])
        if (found) {
          return found
        }
      }
    }
    return null
  }

  return findPath(fileList, []) ?? []
}

const FileTree = React.forwardRef<FileTreeHandle, FileTreeProps>(({
  files,
  onFileSelect,
  selectedFile,
  expandAllFolders = false,
}, ref) => {
  const itemMapRef = useRef<Map<string, HTMLDivElement>>(new Map())

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() =>
    new Set(selectedFile ? getAncestorFolderPaths(files, selectedFile) : []))

  useEffect(() => {
    if (expandAllFolders) {
      setExpandedFolders(new Set(getAllFolderPaths(files)))
      return
    }

    if (!selectedFile) {
      return
    }

    const ancestorPaths = getAncestorFolderPaths(files, selectedFile)
    if (ancestorPaths.length === 0) {
      return
    }

    setExpandedFolders(prev => new Set([...prev, ...ancestorPaths]))
  }, [expandAllFolders, files, selectedFile])

  const scrollToSelectedFile = useCallback(() => {
    if (!selectedFile) {
      return
    }

    const ancestorPaths = getAncestorFolderPaths(files, selectedFile)
    setExpandedFolders(prev => new Set([...prev, ...ancestorPaths]))

    window.requestAnimationFrame(() => {
      itemMapRef.current.get(selectedFile)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }, [files, selectedFile])

  const collapseAll = useCallback(() => {
    if (!selectedFile) {
      setExpandedFolders(new Set())
      return
    }

    setExpandedFolders(new Set(getAncestorFolderPaths(files, selectedFile)))
  }, [files, selectedFile])

  useImperativeHandle(ref, () => ({
    collapseAll,
    scrollToSelectedFile,
  }), [collapseAll, scrollToSelectedFile])

  const setItemRef = (path: string, element: HTMLDivElement | null) => {
    if (element) {
      itemMapRef.current.set(path, element)
    }
    else {
      itemMapRef.current.delete(path)
    }
  }

  const handleFileClick = (file: DocumentFile) => {
    if (file.type === 'file') {
      onFileSelect(file.path)
    }
    else {
      setExpandedFolders((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(file.path)) {
          newSet.delete(file.path)
        }
        else {
          newSet.add(file.path)
        }
        return newSet
      })
    }
  }

  const renderFiles = (fileList: DocumentFile[], level = 0): React.ReactNode => {
    return fileList.map(file => (
      <div key={file.path}>
        <div
          ref={element => setItemRef(file.path, element)}
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-muted transition-colors ${
            selectedFile === file.path ? 'bg-primary/10 text-primary' : 'text-foreground'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => handleFileClick(file)}
          data-testid={file.type === 'folder' ? 'folder-item' : 'document-item'}
          data-document-path={file.path}
        >
          {file.type === 'folder'
            ? (
                <>
                  {expandedFolders.has(file.path)
                    ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )
                    : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                  <Folder className="w-4 h-4 text-muted-foreground" />
                </>
              )
            : (
                <File className="w-4 h-4 text-muted-foreground" />
              )}
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">
              {file.type === 'file' && file.title ? file.title : file.name}
            </div>
            {file.type === 'file' && file.title && (
              <div className="text-xs text-muted-foreground truncate">
                {file.name}
              </div>
            )}
          </div>
        </div>
        {file.children && file.children.length > 0 && expandedFolders.has(file.path) && (
          renderFiles(file.children, level + 1)
        )}
      </div>
    ))
  }

  return (
    <div data-testid="document-tree" className="space-y-1">
      {renderFiles(files)}
    </div>
  )
})

export default FileTree
