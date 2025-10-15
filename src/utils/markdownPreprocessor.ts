interface PreprocessorState {
  linkPlaceholders: string[];
  codeBlockPlaceholders: string[];
  inlineCodePlaceholders: string[];
}

/**
 * Safely replaces all occurrences of a placeholder with its content
 */
function safeReplace(text: string, placeholder: string, replacement: string): string {
  return text.split(placeholder).join(replacement);
}

/**
 * Protects code blocks from link processing by replacing them with placeholders
 * Uses line-by-line parsing for reliable detection
 */
function protectCodeBlocks(markdown: string, state: PreprocessorState): string {
  const lines = markdown.split('\n');
  let inCodeBlock = false;
  let codeBlockStart = -1;
  const codeBlocks: string[] = [];
  let processed = markdown;
  
  // Find all code blocks using line-by-line parsing
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStart = i;
      } else {
        inCodeBlock = false;
        const codeBlock = lines.slice(codeBlockStart, i + 1).join('\n');
        codeBlocks.push(codeBlock);
      }
    }
  }
  
  // Replace each code block with a placeholder
  codeBlocks.forEach(block => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${state.codeBlockPlaceholders.length}__`;
    state.codeBlockPlaceholders.push(block);
    processed = safeReplace(processed, block, placeholder);
  });
  
  return processed;
}

/**
 * Protects inline code from link processing
 */
function protectInlineCode(markdown: string, state: PreprocessorState): string {
  return markdown.replace(/`[^`\n]+`/g, (match) => {
    const placeholder = `__INLINE_CODE_PLACEHOLDER_${state.inlineCodePlaceholders.length}__`;
    state.inlineCodePlaceholders.push(match);
    return placeholder;
  });
}

/**
 * Protects existing markdown links from processing
 */
function protectExistingLinks(markdown: string, state: PreprocessorState): string {
  return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
    const placeholder = `__LINK_PLACEHOLDER_${state.linkPlaceholders.length}__`;
    state.linkPlaceholders.push(match);
    return placeholder;
  });
}

/**
 * Converts ticket references to markdown links with absolute URLs
 */
function convertTicketReferences(markdown: string, currentProject: string): string {
  const projectPattern = new RegExp(`\\b(${currentProject}-\\d+)\\b`, 'g');
  // Use absolute URLs to prevent Showdown.js from resolving relative to current page
  return markdown.replace(projectPattern, `[$1](/prj/${currentProject}/ticket/$1)`);
}

/**
 * Converts document references to markdown links
 */
function convertDocumentReferences(markdown: string): string {
  return markdown.replace(/\b(\S+\.md)\b/g, '[$1]($1)');
}

/**
 * Restores all protected content in the correct order
 */
function restoreProtectedContent(markdown: string, state: PreprocessorState): string {
  let processed = markdown;
  
  // Restore in reverse order: code blocks first (largest), then inline code, then links
  state.codeBlockPlaceholders.forEach((code, index) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${index}__`;
    processed = safeReplace(processed, placeholder, code);
  });
  
  state.inlineCodePlaceholders.forEach((code, index) => {
    const placeholder = `__INLINE_CODE_PLACEHOLDER_${index}__`;
    processed = safeReplace(processed, placeholder, code);
  });
  
  state.linkPlaceholders.forEach((link, index) => {
    const placeholder = `__LINK_PLACEHOLDER_${index}__`;
    processed = safeReplace(processed, placeholder, link);
  });
  
  // Safety check: clean up any remaining placeholders
  const remainingPlaceholders = processed.match(/__[A-Z_]+_PLACEHOLDER_\d+__/g);
  if (remainingPlaceholders) {
    console.warn('Cleaning up unrestored placeholders:', remainingPlaceholders);
    remainingPlaceholders.forEach(placeholder => {
      processed = safeReplace(processed, placeholder, '');
    });
  }
  
  return processed;
}

/**
 * Main preprocessing function that safely processes markdown for link conversion
 */
export function preprocessMarkdown(
  markdown: string,
  currentProject: string,
  linkConfig: {
    enableAutoLinking: boolean;
    enableTicketLinks: boolean;
    enableDocumentLinks: boolean;
  }
): string {
  if (!linkConfig.enableAutoLinking) {
    return markdown;
  }
  
  const state: PreprocessorState = {
    linkPlaceholders: [],
    codeBlockPlaceholders: [],
    inlineCodePlaceholders: []
  };
  
  let processed = markdown;
  
  try {
    // Step 1: Protect existing content
    processed = protectExistingLinks(processed, state);
    processed = protectCodeBlocks(processed, state);
    processed = protectInlineCode(processed, state);
    
    // Step 2: Convert references to links
    if (linkConfig.enableTicketLinks) {
      processed = convertTicketReferences(processed, currentProject);
    }
    
    if (linkConfig.enableDocumentLinks) {
      processed = convertDocumentReferences(processed);
    }
    
    // Step 3: Restore protected content
    processed = restoreProtectedContent(processed, state);
    
    return processed;
    
  } catch (error) {
    console.error('Markdown preprocessing error:', error);
    // Fallback: try to restore what we can
    return restoreProtectedContent(processed, state);
  }
}

/**
 * Test function to validate the preprocessor works correctly
 */
export function testPreprocessor(): boolean {
  const testMarkdown = `# Test Document

Here's a mermaid diagram:

\`\`\`mermaid
graph TB
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

And some inline code: \`const x = 1\`

Also a ticket reference: MDT-001

And an existing link: [GitHub](https://github.com)

Document reference: README.md
`;

  const config = {
    enableAutoLinking: true,
    enableTicketLinks: true,
    enableDocumentLinks: true
  };

  const result = preprocessMarkdown(testMarkdown, 'MDT', config);
  
  // Verify mermaid block is preserved
  const hasMermaidBlock = result.includes('```mermaid\ngraph TB\n    A[Start] --> B[Process]\n    B --> C[End]\n```');
  
  // Verify inline code is preserved
  const hasInlineCode = result.includes('`const x = 1`');
  
  // Verify ticket was converted
  const hasTicketLink = result.includes('[MDT-001](MDT-001)');
  
  // Verify existing link is preserved
  const hasExistingLink = result.includes('[GitHub](https://github.com)');
  
  // Verify no placeholders remain
  const hasNoPlaceholders = !result.match(/__[A-Z_]+_PLACEHOLDER_\d+__/);
  
  const success = hasMermaidBlock && hasInlineCode && hasTicketLink && hasExistingLink && hasNoPlaceholders;
  
  if (!success) {
    console.error('Preprocessor test failed:', {
      hasMermaidBlock,
      hasInlineCode,
      hasTicketLink,
      hasExistingLink,
      hasNoPlaceholders,
      result
    });
  }
  
  return success;
}
