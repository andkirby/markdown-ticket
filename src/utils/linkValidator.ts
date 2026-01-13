interface ValidationResult {
  success: boolean;
  message: string;
  elementInfo?: {
    tagName: string;
    href?: string;
    textContent?: string;
  };
}

function validateTicketReferences(container: HTMLElement): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Find all text nodes that contain ticket patterns
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  const ticketPattern = /\b([A-Z]+-\d+)\b/g;
  let node;
  
  while (node = walker.nextNode()) {
    const text = node.textContent || '';
    const matches = [...text.matchAll(ticketPattern)];
    
    for (const match of matches) {
      const ticketRef = match[1];
      
      // Skip validation if inside code blocks or inline code
      const inCodeBlock = (node.parentElement as Element)?.closest('pre, code');
      if (inCodeBlock) {
        continue; // Skip - code blocks should not have link conversion
      }
      
      // Check if this ticket reference is inside a link
      const parentLink = (node.parentElement as Element)?.closest('a');
      
      if (parentLink) {
        const href = parentLink.getAttribute('href');
        if (href?.includes(ticketRef)) {
          const result = {
            success: true,
            message: `✓ Ticket reference "${ticketRef}" properly converted to link`,
            elementInfo: {
              tagName: parentLink.tagName,
              href,
              textContent: parentLink.textContent || ''
            }
          };
          results.push(result);
          console.log(result.message, { href, text: parentLink.textContent });
        } else {
          const result = {
            success: false,
            message: `✗ Ticket reference "${ticketRef}" in link but href mismatch: ${href}`,
            elementInfo: {
              tagName: parentLink.tagName,
              href: href || '',
              textContent: parentLink.textContent || ''
            }
          };
          results.push(result);
          console.error(result.message, { href, text: parentLink.textContent });
        }
      } else {
        const result = {
          success: false,
          message: `✗ Ticket reference "${ticketRef}" found as plain text, not converted to link`,
          elementInfo: {
            tagName: node.parentElement?.tagName || 'unknown',
            textContent: text
          }
        };
        results.push(result);
        console.error(result.message, { text });
      }
    }
  }
  
  return results;
}

function validateDocumentReferences(container: HTMLElement): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Find all text nodes that contain .md references
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  const docPattern = /\b(\S+\.md)\b/g;
  let node;
  
  while (node = walker.nextNode()) {
    const text = node.textContent || '';
    const matches = [...text.matchAll(docPattern)];
    
    for (const match of matches) {
      const docRef = match[1];
      
      // Skip validation if inside code blocks or inline code
      const inCodeBlock = (node.parentElement as Element)?.closest('pre, code');
      if (inCodeBlock) {
        continue; // Skip - code blocks should not have link conversion
      }
      
      // Check if this document reference is inside a link
      const parentLink = (node.parentElement as Element)?.closest('a');
      
      if (parentLink) {
        const href = parentLink.getAttribute('href');
        if (href?.includes(docRef) || href?.includes(encodeURIComponent(docRef))) {
          const result = {
            success: true,
            message: `✓ Document reference "${docRef}" properly converted to link`,
            elementInfo: {
              tagName: parentLink.tagName,
              href: href || '',
              textContent: parentLink.textContent || ''
            }
          };
          results.push(result);
          console.log(result.message, { href, text: parentLink.textContent });
        } else {
          const result = {
            success: false,
            message: `✗ Document reference "${docRef}" in link but href mismatch: ${href}`,
            elementInfo: {
              tagName: parentLink.tagName,
              href: href || '',
              textContent: parentLink.textContent || ''
            }
          };
          results.push(result);
          console.error(result.message, { href, text: parentLink.textContent });
        }
      } else {
        const result = {
          success: false,
          message: `✗ Document reference "${docRef}" found as plain text, not converted to link`,
          elementInfo: {
            tagName: node.parentElement?.tagName || 'unknown',
            textContent: text
          }
        };
        results.push(result);
        console.error(result.message, { text });
      }
    }
  }
  
  return results;
}

export function validateAllReferences(container: HTMLElement): void {
  console.group('🔍 Link Validation Results');
  
  const ticketResults = validateTicketReferences(container);
  const docResults = validateDocumentReferences(container);
  
  const totalResults = [...ticketResults, ...docResults];
  const successCount = totalResults.filter(r => r.success).length;
  const failureCount = totalResults.filter(r => !r.success).length;
  
  console.log(`📊 Summary: ${successCount} success, ${failureCount} failures`);
  console.groupEnd();
}
