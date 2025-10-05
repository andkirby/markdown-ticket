import React, { useMemo, useEffect, useRef } from 'react';
import showdown from 'showdown';
import DOMPurify from 'dompurify';
import parse, { HTMLReactParserOptions, Element } from 'html-react-parser';
import { processMermaidBlocks, renderMermaid } from '../utils/mermaid';
import { highlightCodeBlocks, loadPrismTheme } from '../utils/syntaxHighlight';
import { classifyLink } from '../utils/linkProcessor';
import { validateAllReferences } from '../utils/linkValidator';
import { getLinkConfig } from '../config/linkConfig';
import SmartLink from './SmartLink';
import { MarkdownErrorBoundary } from './MarkdownErrorBoundary';
import { useTheme } from '../hooks/useTheme';

interface MarkdownContentProps {
  markdown: string;
  currentProject: string;
  className?: string;
  headerLevelStart?: number;
  onRenderComplete?: () => void;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({
  markdown,
  currentProject,
  className = 'prose prose-sm max-w-none dark:prose-invert',
  headerLevelStart = 1,
  onRenderComplete,
}) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Prism theme based on current theme
  useEffect(() => {
    loadPrismTheme(theme);
  }, [theme]);

  // Initialize Showdown converter
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

  // Get link configuration (outside useMemo to ensure proper caching)
  const linkConfig = getLinkConfig();

  // Process markdown through the rendering pipeline
  const processedContent = useMemo(() => {
    if (!markdown) return '';

    try {
      let preprocessedMarkdown = markdown;
      
      if (linkConfig.enableAutoLinking) {
        // First, protect existing markdown links
        const linkPlaceholders: string[] = [];
        preprocessedMarkdown = preprocessedMarkdown.replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          (match) => {
            const placeholder = `__LINK_PLACEHOLDER_${linkPlaceholders.length}__`;
            linkPlaceholders.push(match);
            return placeholder;
          }
        );
        
        // Second, protect code blocks and inline code
        const codeBlockPlaceholders: string[] = [];
        const inlineCodePlaceholders: string[] = [];
        
        // Protect fenced code blocks (```...```)
        preprocessedMarkdown = preprocessedMarkdown.replace(
          /```[\s\S]*?```/g,
          (match) => {
            const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlockPlaceholders.length}__`;
            codeBlockPlaceholders.push(match);
            return placeholder;
          }
        );
        
        // Protect inline code (`...`)
        preprocessedMarkdown = preprocessedMarkdown.replace(
          /`[^`]+`/g,
          (match) => {
            const placeholder = `__INLINE_CODE_PLACEHOLDER_${inlineCodePlaceholders.length}__`;
            inlineCodePlaceholders.push(match);
            return placeholder;
          }
        );
        
        // Now safe to do link conversion
        if (linkConfig.enableTicketLinks) {
          // Only convert ticket references for current project
          const projectPattern = new RegExp(`\\b(${currentProject}-\\d+)\\b`, 'g');
          preprocessedMarkdown = preprocessedMarkdown.replace(
            projectPattern,
            '[$1]($1)'
          );
        }
        
        if (linkConfig.enableDocumentLinks) {
          preprocessedMarkdown = preprocessedMarkdown.replace(
            /\b(\S+\.md)\b/g,
            '[$1]($1)'
          );
        }
        
        // Restore code blocks and inline code
        inlineCodePlaceholders.forEach((code, index) => {
          preprocessedMarkdown = preprocessedMarkdown.replace(
            `__INLINE_CODE_PLACEHOLDER_${index}__`,
            code
          );
        });
        
        codeBlockPlaceholders.forEach((code, index) => {
          preprocessedMarkdown = preprocessedMarkdown.replace(
            `__CODE_BLOCK_PLACEHOLDER_${index}__`,
            code
          );
        });
        
        // Restore original markdown links
        linkPlaceholders.forEach((link, index) => {
          preprocessedMarkdown = preprocessedMarkdown.replace(
            `__LINK_PLACEHOLDER_${index}__`,
            link
          );
        });
      }

      // Step 2: Convert markdown to HTML
      const rawHTML = converter.makeHtml(preprocessedMarkdown);
      
      // Step 3: Process Mermaid diagrams
      const mermaidProcessed = processMermaidBlocks(rawHTML);
      
      // Step 4: Highlight code blocks
      const codeHighlighted = highlightCodeBlocks(mermaidProcessed);
      
      // Step 5: Sanitize HTML
      const sanitized = DOMPurify.sanitize(codeHighlighted, {
        ALLOWED_TAGS: [
          'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'code', 'pre', 'ul', 'ol', 'li', 'blockquote',
          'strong', 'em', 'del', 'table', 'thead', 'tbody',
          'tr', 'th', 'td', 'br', 'hr', 'img', 'div', 'span',
          'svg', 'g', 'path', 'rect', 'circle', 'text' // For Mermaid
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'class', 'id', 'target', 'rel',
          'src', 'alt', 'width', 'height',
          // Mermaid attributes
          'viewBox', 'xmlns', 'd', 'fill', 'stroke', 'stroke-width',
          'x', 'y', 'rx', 'ry', 'cx', 'cy', 'r', 'font-size',
          'text-anchor', 'dominant-baseline', 'transform'
        ]
      });
      
      return sanitized;
    } catch (error) {
      console.error('Markdown processing error:', error);
      return `<div class="text-red-600 p-4 border border-red-200 rounded">Error processing markdown: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
    }
  }, [markdown, currentProject, converter, linkConfig]);

  // Parse HTML and convert links to React components
  const parserOptions: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element && domNode.name === 'a') {
        const href = domNode.attribs?.href || '';
        const parsedLink = classifyLink(href, currentProject);
        
        // Extract text content safely
        const extractText = (node: any): string => {
          if (!node) return '';
          if (typeof node === 'string') return node;
          if (node.type === 'text') return node.data || '';
          if (node.children && Array.isArray(node.children)) {
            return node.children.map(extractText).join('');
          }
          return '';
        };
        
        const linkText = domNode.children ? extractText({ children: domNode.children }) : href;
        parsedLink.text = linkText || href;
        
        return (
          <SmartLink 
            link={parsedLink} 
            currentProject={currentProject}
            className={domNode.attribs?.class}
          >
            {linkText || href}
          </SmartLink>
        );
      }
    }
  };

  // Render Mermaid diagrams and validate links after HTML is ready
  useEffect(() => {
    if (processedContent && containerRef.current) {
      const timeoutId = setTimeout(() => {
        renderMermaid();
        
        // Validate link conversion
        if (containerRef.current) {
          validateAllReferences(containerRef.current);
        }
        
        onRenderComplete?.();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [processedContent, onRenderComplete]);

  // Parse HTML and convert to React elements
  const renderContent = () => {
    if (!processedContent) return null;
    return parse(processedContent, parserOptions);
  };

  return (
    <div ref={containerRef} className={className}>
      {renderContent()}
    </div>
  );
};

const MarkdownContentWithErrorBoundary: React.FC<MarkdownContentProps> = (props) => (
  <MarkdownErrorBoundary>
    <MarkdownContent {...props} />
  </MarkdownErrorBoundary>
);

export default MarkdownContentWithErrorBoundary;
