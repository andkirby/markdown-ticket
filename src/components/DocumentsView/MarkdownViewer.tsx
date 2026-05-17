import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RelativeTimestamp } from '@/components/shared/RelativeTimestamp'
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
      <div className="document-viewer__center">
        <div className="document-viewer__center-message">Loading document...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="document-viewer__center">
        <div className="document-viewer__center-message--error">{error}</div>
      </div>
    )
  }

  if (fileDeleted) {
    return (
      <div data-testid="file-viewer" className="document-viewer__center document-viewer__deleted">
        <div className="document-viewer__deleted-content">
          <div className="document-viewer__deleted-title">File was deleted</div>
          <div className="document-viewer__deleted-help">Choose another document from the tree.</div>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="file-viewer" className="document-viewer">
      <TableOfContents items={tocItems} view="document" />
      <ScrollArea className="document-viewer__scroll">
        <div className="document-viewer__body">
          <div className="document-viewer__content">
            {fileInfo && (
              <div className="relative-timestamp__floating">
                <RelativeTimestamp
                  createdAt={fileInfo.dateCreated}
                  updatedAt={fileInfo.lastModified}
                />
                {updateState !== 'idle' && (
                  <span className="relative-timestamp__sync-state">
                    {updateState === 'syncing' ? 'Syncing...' : 'Updated'}
                  </span>
                )}
              </div>
            )}
            {content && (
              <MarkdownContent
                key={`${filePath}:${refreshToken}`}
                markdown={content}
                currentProject={projectCode || ''}
              />
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
