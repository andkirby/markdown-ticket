import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import TableOfContents from '@/components/shared/TableOfContents'
import { ScrollArea } from '@/components/ui/scroll-area'
import { extractTableOfContents } from '@/utils/tableOfContents'
import MarkdownContent from '../MarkdownContent'

interface DocumentFile {
  name: string
  path: string
  type: 'file' | 'folder'
  title?: string
  children?: DocumentFile[]
  dateCreated?: Date | string
  lastModified?: Date | string
}

interface MarkdownViewerProps {
  projectId: string
  filePath: string
  fileInfo?: DocumentFile | null
  refreshToken?: number
  fileDeleted?: boolean
  updateState?: 'idle' | 'updated' | 'syncing'
}

export default function MarkdownViewer({ projectId, filePath, fileInfo, refreshToken = 0, fileDeleted = false, updateState = 'idle' }: MarkdownViewerProps) {
  const { projectCode } = useParams<{ projectCode: string }>()
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasContentRef = useRef(false)
  const loadedFilePathRef = useRef<string | null>(null)

  // Extract ToC items from content
  const tocItems = useMemo(() => {
    return extractTableOfContents(content)
  }, [content])

  const loadFile = useCallback(async () => {
    try {
      if (loadedFilePathRef.current !== filePath) {
        hasContentRef.current = false
        setContent('')
      }
      if (!hasContentRef.current)
        setLoading(true)
      setError(null)
      const response = await fetch(`/api/documents/content?projectId=${encodeURIComponent(projectId)}&filePath=${encodeURIComponent(filePath)}`)
      if (response.ok) {
        const text = await response.text()
        setContent(text)
        hasContentRef.current = true
        loadedFilePathRef.current = filePath
      }
      else {
        setError('Failed to load document')
      }
    }
    catch (err) {
      setError('Failed to load document')
      console.error('Error loading document:', err)
    }
    finally {
      setLoading(false)
    }
  }, [filePath, projectId])

  useEffect(() => {
    if (!fileDeleted)
      loadFile()
  }, [fileDeleted, loadFile, refreshToken])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading document...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

  if (fileDeleted) {
    return (
      <div data-testid="file-viewer" className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive mb-2">File was deleted</div>
          <div className="text-sm text-muted-foreground">Choose another document from the tree.</div>
        </div>
      </div>
    )
  }

  // Format date helper
  const formatDate = (date: Date | string | undefined): string => {
    if (!date)
      return 'Unknown'
    try {
      const d = new Date(date)
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    catch {
      return 'Unknown'
    }
  }

  return (
    <div data-testid="file-viewer" className="h-full flex flex-col relative">
      <TableOfContents items={tocItems} view="document" />
      <ScrollArea className="h-[calc(100dvh-100px)]">
        <div className="p-6">
          {fileInfo && (
            <div className="sticky top-0 z-10 mb-4 pb-3 border-b border-border bg-background/95 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground space-x-4">
                <span>
                  <strong>Created:</strong>
                  {' '}
                  {formatDate(fileInfo.dateCreated)}
                </span>
                <span className="text-muted-foreground/60">|</span>
                <span>
                  <strong>Updated:</strong>
                  {' '}
                  {formatDate(fileInfo.lastModified)}
                </span>
                {updateState !== 'idle' && (
                  <span className="text-primary">
                    {updateState === 'syncing' ? 'Syncing...' : 'Updated'}
                  </span>
                )}
              </div>
            </div>
          )}
          {content && (
            <MarkdownContent
              markdown={content}
              currentProject={projectCode || ''}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
