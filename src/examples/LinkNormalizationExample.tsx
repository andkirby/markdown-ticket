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
        status: link.isValid ? 'valid' : (link.error?.includes('security') ? 'invalid' : 'warning') as 'valid' | 'invalid' | 'warning'
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
          return `<span class="broken-link" title="${processed.error || 'Invalid link'}">${text}</span>`;
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
    <div className="link-normalization-example">
      <style>{`
        .link-normalization-example {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .content-section {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .links-analysis {
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .link-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .link-item.valid {
          background: #d4edda;
          border-left: 4px solid #28a745;
        }
        .link-item.invalid {
          background: #f8d7da;
          border-left: 4px solid #dc3545;
        }
        .link-item.warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
        }
        .link-details {
          flex: 1;
          font-family: monospace;
          font-size: 12px;
        }
        .link-status {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          margin-left: 12px;
        }
        .status-valid {
          background: #28a745;
          color: white;
        }
        .status-invalid {
          background: #dc3545;
          color: white;
        }
        .status-warning {
          background: #ffc107;
          color: #212529;
        }
        .processed-content {
          line-height: 1.6;
        }
        .broken-link {
          color: #dc3545;
          text-decoration: line-through;
          cursor: not-allowed;
        }
        .stats {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }
        .stat-item {
          text-align: center;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
        }
        .stat-label {
          font-size: 12px;
          color: #6c757d;
          text-transform: uppercase;
        }
      `}</style>

      <div className="stats">
        <div className="stat-item">
          <div className="stat-number">{extractedLinks.length}</div>
          <div className="stat-label">Total Links</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">
            {extractedLinks.filter(l => l.status === 'valid').length}
          </div>
          <div className="stat-label">Valid</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">
            {extractedLinks.filter(l => l.status === 'warning').length}
          </div>
          <div className="stat-label">Warnings</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">
            {extractedLinks.filter(l => l.status === 'invalid').length}
          </div>
          <div className="stat-label">Invalid</div>
        </div>
      </div>

      <div className="content-section">
        <h3>Processed Content</h3>
        <div className="processed-content">
          {renderContentWithSmartLinks(processedContent)}
        </div>
      </div>

      <div className="links-analysis">
        <h3>Links Analysis</h3>
        {extractedLinks.length === 0 ? (
          <p>No links found in the content.</p>
        ) : (
          extractedLinks.map((link, index) => (
            <div key={index} className={`link-item ${link.status}`}>
              <div className="link-details">
                <div><strong>Original:</strong> {link.original}</div>
                <div><strong>Type:</strong> {link.processed.parsed.type}</div>
                {link.processed.normalized && (
                  <div><strong>Normalized:</strong> {link.processed.normalized.webHref}</div>
                )}
                {link.processed.error && (
                  <div><strong>Error:</strong> {link.processed.error}</div>
                )}
              </div>
              <span className={`link-status status-${link.status}`}>
                {link.status}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="content-section">
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