import React, { useMemo, useEffect } from 'react';
import showdown from 'showdown';
import { processMermaidBlocks, renderMermaid } from '../../utils/mermaid';
import { highlightCodeBlocks, loadPrismTheme } from '../../utils/syntaxHighlight';
import { useTheme } from '../../hooks/useTheme';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  headerLevelStart?: number; // Default: 1
  onRenderComplete?: () => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = 'prose prose-sm max-w-none dark:prose-invert',
  headerLevelStart = 1,
  onRenderComplete,
}) => {
  const { theme } = useTheme();

  // Load Prism theme based on current theme
  useEffect(() => {
    loadPrismTheme(theme);
  }, [theme]);

  // Initialize Showdown converter with provided configuration
  const converter = useMemo(() => {
    return new showdown.Converter({
      tables: true,
      strikethrough: true,
      tasklists: true,
      ghCodeBlocks: true,
      smoothLivePreview: true,
      simpleLineBreaks: true,
      headerLevelStart,
      parseImgDimensions: true,
      simplifiedAutoLink: true,
      excludeTrailingPunctuationFromURLs: true,
      literalMidWordUnderscores: true,
      ghCompatibleHeaderId: true,
    });
  }, [headerLevelStart]);

  // Process markdown through the rendering pipeline
  const htmlContent = useMemo(() => {
    if (!content) return '';
    const html = converter.makeHtml(content);
    const mermaidProcessed = processMermaidBlocks(html);
    return highlightCodeBlocks(mermaidProcessed);
  }, [content, converter]);

  // Render Mermaid diagrams after HTML is ready
  useEffect(() => {
    if (htmlContent) {
      setTimeout(() => {
        renderMermaid();
        onRenderComplete?.();
      }, 100);
    }
  }, [htmlContent, onRenderComplete]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownRenderer;
