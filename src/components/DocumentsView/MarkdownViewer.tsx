import React, { useState, useEffect } from 'react';
import showdown from 'showdown';

interface DocumentFile {
  name: string;
  path: string;
  type: 'file' | 'folder';
  title?: string;
  children?: DocumentFile[];
  dateCreated?: Date | string;
  lastModified?: Date | string;
}

interface MarkdownViewerProps {
  filePath: string;
  fileInfo?: DocumentFile | null;
}

const converter = new showdown.Converter({
  tables: true,
  strikethrough: true,
  tasklists: true,
  ghCodeBlocks: true,
  smoothLivePreview: true,
  simpleLineBreaks: true,
  headerLevelStart: 1,
  parseImgDimensions: true,
  simplifiedAutoLink: true,
  excludeTrailingPunctuationFromURLs: true,
  literalMidWordUnderscores: true,
  ghCompatibleHeaderId: true,
});

export default function MarkdownViewer({ filePath, fileInfo }: MarkdownViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFile();
  }, [filePath]);

  const loadFile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/documents/content?filePath=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const text = await response.text();
        setContent(text);
      } else {
        setError('Failed to load document');
      }
    } catch (err) {
      setError('Failed to load document');
      console.error('Error loading document:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading document...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  const htmlContent = converter.makeHtml(content);

  // Format date helper
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Unknown';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        {fileInfo && (
          <div className="mb-4 pb-3 border-b border-border">
            <div className="text-xs text-muted-foreground space-x-4">
              <span>
                <strong>Created:</strong> {formatDate(fileInfo.dateCreated)}
              </span>
              <span className="text-muted-foreground/60">|</span>
              <span>
                <strong>Updated:</strong> {formatDate(fileInfo.lastModified)}
              </span>
            </div>
          </div>
        )}
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
}
