export enum LinkType {
  EXTERNAL = 'external',
  TICKET = 'ticket',
  DOCUMENT = 'document',
  ANCHOR = 'anchor',
  FILE = 'file',
  CROSS_PROJECT = 'cross-project',
  UNKNOWN = 'unknown'
}

export interface ParsedLink {
  type: LinkType;
  href: string;
  text: string;
  projectCode?: string;
  ticketKey?: string;
  documentPath?: string;
  anchor?: string;
  isValid?: boolean;
}

export function classifyLink(href: string, currentProject: string): ParsedLink {
  const text = href; // Will be updated by caller with actual link text
  
  // External URLs
  if (/^https?:\/\//.test(href) || /^mailto:/.test(href) || /^tel:/.test(href)) {
    return {
      type: LinkType.EXTERNAL,
      href,
      text,
      isValid: isValidURL(href)
    };
  }
  
  // Anchor links
  if (/^#/.test(href)) {
    return {
      type: LinkType.ANCHOR,
      href,
      text,
      anchor: href,
      isValid: true
    };
  }
  
  // Ticket references (CR-A017, CR-017, CR-A017.md, CR-017.md, CR-A017#section, CR-017#section)
  const ticketMatch = href.match(/^([A-Z]+-[A-Z]?\d+)(\.md)?(#.*)?$/);
  if (ticketMatch) {
    const [, ticketKey, , anchor] = ticketMatch;
    return {
      type: LinkType.TICKET,
      href,
      text,
      projectCode: currentProject,
      ticketKey,
      anchor,
      isValid: true // Will be validated later against available tickets
    };
  }
  
  // Cross-project ticket references
  const crossProjectMatch = href.match(/^([A-Z]+)-(\d+)(\.md)?(#.*)?$/);
  if (crossProjectMatch) {
    const [, projectCode, number, , anchor] = crossProjectMatch;
    if (projectCode !== currentProject) {
      return {
        type: LinkType.CROSS_PROJECT,
        href,
        text,
        projectCode,
        ticketKey: `${projectCode}-${number}`,
        anchor,
        isValid: true
      };
    }
  }
  
  // Document references (.md files)
  if (/\.md$/.test(href)) {
    return {
      type: LinkType.DOCUMENT,
      href,
      text,
      documentPath: href,
      isValid: true // Will be validated later against available documents
    };
  }
  
  // File references (images, PDFs, etc.)
  if (/\.(png|jpg|jpeg|gif|svg|pdf|json|yaml|yml|txt)$/i.test(href)) {
    return {
      type: LinkType.FILE,
      href,
      text,
      isValid: true
    };
  }
  
  // Unknown/relative paths
  return {
    type: LinkType.UNKNOWN,
    href,
    text,
    isValid: false
  };
}

export function isValidURL(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    return allowedProtocols.includes(url.protocol);
  } catch {
    return false;
  }
}

export function validateTicketLink(ticketKey: string, availableTickets: string[]): boolean {
  return availableTickets.includes(ticketKey);
}

export function validateDocumentLink(docPath: string, availableDocuments: string[]): boolean {
  return availableDocuments.includes(docPath);
}
