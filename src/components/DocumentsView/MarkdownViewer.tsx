import parse from 'html-react-parser'
import Prism from 'prismjs'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RelativeTimestamp } from '@/components/shared/RelativeTimestamp'
import TableOfContents from '@/components/shared/TableOfContents'
import { ScrollArea } from '@/components/ui/scroll-area'
import { extractTableOfContents } from '@/utils/tableOfContents'
import MarkdownContent from '../MarkdownContent'
import 'prismjs/components/prism-yaml'

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

interface ParsedDocumentContent {
  frontmatter: string | null
  body: string
}

function extractDocumentFrontmatter(value: string): ParsedDocumentContent {
  if (!value.startsWith('---\n') && !value.startsWith('---\r\n')) {
    return { frontmatter: null, body: value }
  }

  const marker = value.startsWith('---\r\n') ? '---\r\n' : '---\n'
  let searchIndex = marker.length

  while (searchIndex < value.length) {
    const nextLineIndex = value.indexOf('\n', searchIndex)
    const lineEnd = nextLineIndex === -1 ? value.length : nextLineIndex + 1
    const line = value.slice(searchIndex, lineEnd).replace(/\r?\n$/, '')

    if (line === '---') {
      const frontmatter = value.slice(marker.length, searchIndex).replace(/\r?\n$/, '')
      return {
        frontmatter: frontmatter.trim() ? frontmatter : null,
        body: value.slice(lineEnd),
      }
    }

    if (nextLineIndex === -1)
      break

    searchIndex = lineEnd
  }

  return { frontmatter: null, body: value }
}

export default function MarkdownViewer({ projectId, filePath, fileInfo, refreshToken = 0, fileDeleted = false, updateState = 'idle' }: MarkdownViewerProps) {
  const { projectCode } = useParams<{ projectCode: string }>()
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasContentRef = useRef(false)
  const loadedFilePathRef = useRef<string | null>(null)

  const parsedContent = useMemo(() => {
    return extractDocumentFrontmatter(content)
  }, [content])

  // Extract ToC items from the rendered body, excluding the raw frontmatter disclosure.
  const tocItems = useMemo(() => {
    return extractTableOfContents(parsedContent.body)
  }, [parsedContent.body])

  const highlightedFrontmatter = useMemo(() => {
    if (!parsedContent.frontmatter)
      return null

    return Prism.highlight(parsedContent.frontmatter, Prism.languages.yaml, 'yaml')
  }, [parsedContent.frontmatter])

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
              <>
                {parsedContent.frontmatter && (
                  <details className="document-frontmatter">
                    <summary className="document-frontmatter__summary">Frontmatter</summary>
                    <pre className="document-frontmatter__code language-yaml">
                      <code className="language-yaml">
                        {parse(highlightedFrontmatter || '')}
                      </code>
                    </pre>
                  </details>
                )}
                {parsedContent.body && (
                  <MarkdownContent
                    key={`${filePath}:${refreshToken}`}
                    markdown={parsedContent.body}
                    currentProject={projectCode || ''}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
