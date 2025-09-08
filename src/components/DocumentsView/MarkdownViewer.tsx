import React, { useState, useEffect } from 'react';
import showdown from 'showdown';

interface MarkdownViewerProps {
  filePath: string;
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

export default function MarkdownViewer({ filePath }: MarkdownViewerProps) {
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

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div 
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
}
