/**
 * Link Normalization System Example
 *
 * This example demonstrates how to use the comprehensive link normalization system
 * in a real-world scenario with ticket management and document linking.
 */

import React, { useState, useEffect } from 'react';
import SmartLink from '../components/SmartLink';
import { useSmartLinkProcessor } from '../hooks/useSmartLinkProcessor';
import { createLinkContextFromProject } from '../utils/linkProcessor';
import { preprocessMarkdown } from '../utils/markdownPreprocessor';
import { getLinkConfig } from '../config/linkConfig';

interface ExampleProps {
  currentProject: string;
  sourcePath: string;
  projectConfig?: any;
  markdownContent: string;
}

/**
 * Example component showing comprehensive link normalization usage
 */
export const LinkNormalizationExample: React.FC<ExampleProps> = ({
  currentProject,
  sourcePath,
  projectConfig,
  markdownContent
}) => {
  // Initialize the smart link processor
  const linkProcessor = useSmartLinkProcessor({
    currentProject,
    sourcePath,
    projectConfig,
    enableCache: true
  });

  // Link configuration
  const linkConfig = getLinkConfig();
  const linkContext = createLinkContextFromProject(currentProject, sourcePath, projectConfig);

  // State for processed content
  const [processedContent, setProcessedContent] = useState<string>('');
  const [extractedLinks, setExtractedLinks] = useState<Array<{
    original: string;
    processed: any;
    status: 'valid' | 'invalid' | 'warning';
  }>>([]);

  // Process markdown content
  useEffect(() => {
    if (!markdownContent) return;

    try {
      // Preprocess markdown to convert references to links
      const preprocessed = preprocessMarkdown(markdownContent, currentProject, linkConfig);

      // Extract all links from the content
      const links = linkProcessor.extractAndProcessLinks(preprocessed);

      // Categorize links by status
      const categorizedLinks = links.map(link => ({
        original: link.original,
        processed: link,
        status: link.isValid ? 'valid' as const : (link.error?.includes('security') ? 'invalid' as const : 'warning' as const)
      }));

      setExtractedLinks(categorizedLinks);
      setProcessedContent(preprocessed);
    } catch (error) {
      console.error('Error processing content:', error);
    }
  }, [markdownContent, currentProject, linkConfig, linkProcessor]);

  // Custom renderer for markdown content with smart links
  const renderMarkdownWithSmartLinks = (content: string) => {
    // Replace markdown links with React components
    return content.replace(
      /\[([^\]]*)\]\(([^)]+)\)/g,
      (match, text, href) => {
        const processed = linkProcessor.processLink(href, text);

        if (!processed.isValid) {
          return `<span class="text-red-600 line-through cursor-not-allowed" title="${processed.error || 'Invalid link'}">${text}</span>`;
        }

        // Create a unique key for React
        const key = `${href}-${text}`.replace(/[^a-zA-Z0-9]/g, '-');

        return `<smart-link data-href="${href}" data-text="${text}" data-key="${key}"></smart-link>`;
      }
    );
  };

  // Function to render smart links in the content
  const renderContentWithSmartLinks = (content: string) => {
    const renderedContent = renderMarkdownWithSmartLinks(content);

    // Split content and replace smart-link placeholders with actual components
    const parts = renderedContent.split(/(<smart-link[^>]*><\/smart-link>)/);

    return parts.map((part, index) => {
      if (part.startsWith('<smart-link')) {
        const hrefMatch = part.match(/data-href="([^"]*)"/);
        const textMatch = part.match(/data-text="([^"]*)"/);
        const keyMatch = part.match(/data-key="([^"]*)"/);

        if (hrefMatch && textMatch && keyMatch) {
          const href = hrefMatch[1];
          const text = textMatch[1];
          const key = keyMatch[1];

          const processed = linkProcessor.processLink(href, text);

          return (
            <SmartLink
              key={key}
              link={processed.parsed}
              currentProject={currentProject}
              originalHref={href}
              linkContext={linkContext}
            >
              {text}
            </SmartLink>
          );
        }
      }

      return part;
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-5">{/* link-normalization-example */}

      <div className="flex gap-5 mb-5">{/* stats */}
        <div className="text-center p-2.5 bg-gray-50 rounded">{/* stat-item */}
          <div className="text-2xl font-bold text-blue-600">{extractedLinks.length}</div>{/* stat-number */}
          <div className="text-xs text-gray-500 uppercase">Total Links</div>{/* stat-label */}
        </div>
        <div className="text-center p-2.5 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-blue-600">
            {extractedLinks.filter(l => l.status === 'valid').length}
          </div>
          <div className="text-xs text-gray-500 uppercase">Valid</div>
        </div>
        <div className="text-center p-2.5 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-blue-600">
            {extractedLinks.filter(l => l.status === 'warning').length}
          </div>
          <div className="text-xs text-gray-500 uppercase">Warnings</div>
        </div>
        <div className="text-center p-2.5 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-blue-600">
            {extractedLinks.filter(l => l.status === 'invalid').length}
          </div>
          <div className="text-xs text-gray-500 uppercase">Invalid</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-5 mb-5">
        <h3>Processed Content</h3>
        <div className="leading-relaxed">
          {renderContentWithSmartLinks(processedContent)}
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-5 mb-5">
        <h3>Links Analysis</h3>
        {extractedLinks.length === 0 ? (
          <p>No links found in the content.</p>
        ) : (
          extractedLinks.map((link, index) => (
            <div key={index} className={`flex items-center px-3 py-2 rounded mb-2 ${
                link.status === 'valid' ? 'bg-green-100 border-l-4 border-green-500' :
                link.status === 'invalid' ? 'bg-red-100 border-l-4 border-red-500' :
                'bg-yellow-100 border-l-4 border-yellow-500'
              }`}>
              <div className="flex-1 font-mono text-xs">
                <div><strong>Original:</strong> {link.original}</div>
                <div><strong>Type:</strong> {link.processed.parsed.type}</div>
                {link.processed.normalized && (
                  <div><strong>Normalized:</strong> {link.processed.normalized.webHref}</div>
                )}
                {link.processed.error && (
                  <div><strong>Error:</strong> {link.processed.error}</div>
                )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ml-3 ${
                link.status === 'valid' ? 'bg-green-600 text-white' :
                link.status === 'invalid' ? 'bg-red-600 text-white' :
                'bg-yellow-500 text-gray-900'
              }`}>
                {link.status}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-5 mb-5">
        <h3>System Information</h3>
        <div>
          <p><strong>Current Project:</strong> {currentProject}</p>
          <p><strong>Source Path:</strong> {sourcePath}</p>
          <p><strong>Cache Size:</strong> {linkProcessor.cacheSize} entries</p>
          <p><strong>Document Paths:</strong> {linkContext.documentPaths?.join(', ') || 'None'}</p>
          <p><strong>Auto-Linking Enabled:</strong> {linkConfig.enableAutoLinking ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
};

// Example usage
export const ExampleUsage: React.FC = () => {
  const exampleMarkdown = `
# Project Documentation

## Getting Started

Welcome to the project! This document contains various types of links to demonstrate the link normalization system.

### Ticket References

- Initial setup: [MDT-001](MDT-001)
- User authentication: [MDT-002](MDT-002#authentication)
- API implementation: [MDT-003](MDT-003.md)

### Document Links

- User guide: [User Guide](./user-guide.md)
- API documentation: [API Docs](../api/README.md)
- Project overview: [README](../README.md)
- Configuration: [Config](./config.json)

### External Links

- Official website: [Example.com](https://example.com)
- Support email: [Support](mailto:support@example.com)
- GitHub repository: [GitHub](https://github.com/user/repo)

### Cross-Project References

- Shared component: [LIB-001](LIB-001)
- Common utility: [UTIL-123](UTIL-123.md)

### File Links

- Architecture diagram: [Architecture](./architecture.png)
- Specification PDF: [Spec](./specification.pdf)

### Security Examples (These should be blocked)

- Path traversal attempt: [Hacker](../../../etc/passwd)
- Blacklisted path: [Node modules](./node_modules/package.json)

### Anchors

- [Jump to implementation](#implementation)
- [API Reference](#api-reference)
  `;

  const projectConfig = {
    document_paths: [
      'docs',
      'generated-docs',
      'README.md'
    ],
    exclude_folders: [
      'docs/CRs',
      'node_modules',
      '.git'
    ]
  };

  return (
    <LinkNormalizationExample
      currentProject="MDT"
      sourcePath="docs/CRs/MDT-001.md"
      projectConfig={projectConfig}
      markdownContent={exampleMarkdown}
    />
  );
};

export default LinkNormalizationExample;