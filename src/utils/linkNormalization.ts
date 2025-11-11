/**
 * Link Normalization System
 *
 * Handles conversion between file system paths and web routes for smart links.
 * Supports relative path resolution, security validation, and multi-project configurations.
 */

import path from 'path';
import { Project } from '@mdt/shared/models/Project.js';
import { ProjectConfig } from '@mdt/shared/models/Project.js';

export interface LinkContext {
  /** Current project code */
  currentProject: string;
  /** Source file path (relative to project root) */
  sourcePath: string;
  /** Project configuration */
  projectConfig?: ProjectConfig;
  /** Available document paths from project config */
  documentPaths?: string[];
  /** Base path for web routes */
  webBasePath?: string;
}

export interface NormalizedLink {
  /** Original href */
  originalHref: string;
  /** Normalized href for web routing */
  webHref: string;
  /** Resolved file system path */
  filePath?: string;
  /** Link type */
  type: 'ticket' | 'document' | 'external' | 'anchor' | 'file' | 'cross-project' | 'broken';
  /** Whether the link is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Target project code (for cross-project links) */
  targetProject?: string;
}

export interface PathResolutionResult {
  /** Resolved absolute path */
  absolutePath: string;
  /** Relative path from project root */
  relativePath: string;
  /** Whether path is within allowed boundaries */
  isAllowed: boolean;
  /** Security violation details */
  securityViolation?: string;
}

/**
 * Core link normalization service
 */
export class LinkNormalizer {
  private static readonly DEFAULT_WEB_BASE = '/prj';
  private static readonly SECURITY_VIOLATIONS = {
    PATH_TRAVERSAL: 'Path traversal attempt detected',
    OUTSIDE_BOUNDS: 'Path resolves outside project boundaries',
    SYMLINK_ESCAPE: 'Symbolic link escape attempt detected',
    BLACKLISTED: 'Path contains blacklisted components'
  };

  private static readonly DEFAULT_BLACKLIST = [
    'node_modules',
    '.git',
    '.gitignore',
    '.env',
    '.DS_Store',
    'Thumbs.db',
    '__MACOSX'
  ];

  /**
   * Normalize a link based on context
   */
  static normalizeLink(href: string, context: LinkContext): NormalizedLink {
    try {
      // Strip any surrounding whitespace
      const cleanHref = href.trim();

      // Handle different link types
      if (this.isTicketLink(cleanHref)) {
        return this.normalizeTicketLink(cleanHref, context);
      }

      if (this.isExternalLink(cleanHref)) {
        return this.normalizeExternalLink(cleanHref, context);
      }

      if (this.isAnchorLink(cleanHref)) {
        return this.normalizeAnchorLink(cleanHref, context);
      }

      if (this.isCrossProjectTicket(cleanHref, context)) {
        return this.normalizeCrossProjectLink(cleanHref, context);
      }

      // Handle document and file links
      return this.normalizeDocumentOrFileLink(cleanHref, context);

    } catch (error) {
      return {
        originalHref: href,
        webHref: href,
        type: 'broken',
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Resolve a relative path against a source context
   */
  static resolveRelativePath(relativePath: string, context: LinkContext): PathResolutionResult {
    // Prevent path traversal attempts
    if (this.containsPathTraversal(relativePath)) {
      return {
        absolutePath: '',
        relativePath: '',
        isAllowed: false,
        securityViolation: this.SECURITY_VIOLATIONS.PATH_TRAVERSAL
      };
    }

    // Check for blacklisted components
    const normalizedPath = path.normalize(relativePath);
    if (this.containsBlacklistedComponents(normalizedPath)) {
      return {
        absolutePath: '',
        relativePath: '',
        isAllowed: false,
        securityViolation: this.SECURITY_VIOLATIONS.BLACKLISTED
      };
    }

    // Resolve relative to source file directory
    const sourceDir = path.dirname(context.sourcePath);
    const resolvedRelativeToSource = path.resolve(sourceDir, normalizedPath);

    // For relative path normalization, we need to determine the project root
    // Since we're in frontend context, we'll use relative path logic
    const relativeToProject = this.normalizeRelativeToProject(resolvedRelativeToSource, context);

    return {
      absolutePath: resolvedRelativeToSource,
      relativePath: relativeToProject,
      isAllowed: true
    };
  }

  /**
   * Build web route for a document link
   */
  static buildDocumentWebRoute(projectCode: string, documentPath: string): string {
    const webBase = this.DEFAULT_WEB_BASE;
    const encodedPath = encodeURIComponent(documentPath);
    return `${webBase}/${projectCode}/documents?file=${encodedPath}`;
  }

  /**
   * Build web route for a ticket link
   */
  static buildTicketWebRoute(projectCode: string, ticketKey: string, anchor?: string): string {
    const webBase = this.DEFAULT_WEB_BASE;
    return `${webBase}/${projectCode}/ticket/${ticketKey}${anchor || ''}`;
  }

  /**
   * Check if a path is within configured document paths
   */
  static isPathInDocumentPaths(filePath: string, documentPaths: string[]): boolean {
    if (!documentPaths || documentPaths.length === 0) {
      return true; // If no restrictions, allow all paths
    }

    const normalizedFilePath = path.normalize(filePath);

    return documentPaths.some(docPath => {
      const normalizedDocPath = path.normalize(docPath);

      // Exact match
      if (normalizedFilePath === normalizedDocPath) {
        return true;
      }

      // Check if file is within document path directory
      if (normalizedFilePath.startsWith(normalizedDocPath + path.sep)) {
        return true;
      }

      return false;
    });
  }

  // Private helper methods

  private static normalizeTicketLink(href: string, context: LinkContext): NormalizedLink {
    const ticketMatch = href.match(/^([A-Z]+-[A-Z]?\d+)(\.md)?(#.*)?$/);
    if (!ticketMatch) {
      return {
        originalHref: href,
        webHref: href,
        type: 'broken',
        isValid: false,
        error: 'Invalid ticket format'
      };
    }

    const [, ticketKey, , anchor] = ticketMatch;
    const webRoute = this.buildTicketWebRoute(context.currentProject, ticketKey, anchor);

    return {
      originalHref: href,
      webHref: webRoute,
      type: 'ticket',
      isValid: true
    };
  }

  private static normalizeCrossProjectLink(href: string, context: LinkContext): NormalizedLink {
    const crossProjectMatch = href.match(/^([A-Z]+)-(\d+)(\.md)?(#.*)?$/);
    if (!crossProjectMatch) {
      return {
        originalHref: href,
        webHref: href,
        type: 'broken',
        isValid: false,
        error: 'Invalid cross-project ticket format'
      };
    }

    const [, projectCode, number, , anchor] = crossProjectMatch;
    const ticketKey = `${projectCode}-${number}`;

    if (projectCode === context.currentProject) {
      // Convert to regular ticket link
      return this.normalizeTicketLink(href, context);
    }

    const webRoute = this.buildTicketWebRoute(projectCode, ticketKey, anchor);

    return {
      originalHref: href,
      webHref: webRoute,
      type: 'cross-project',
      isValid: true,
      targetProject: projectCode
    };
  }

  private static normalizeDocumentOrFileLink(href: string, context: LinkContext): NormalizedLink {
    // Determine if this is a relative path
    const isRelative = href.startsWith('./') || href.startsWith('../') || !href.startsWith('/');

    let resolvedPath: PathResolutionResult;

    if (isRelative) {
      // Resolve relative path
      resolvedPath = this.resolveRelativePath(href, context);
    } else {
      // Handle absolute paths (relative to project root)
      resolvedPath = {
        absolutePath: path.resolve('/' + href.replace(/^\//, '')),
        relativePath: href.replace(/^\//, ''),
        isAllowed: true
      };
    }

    if (!resolvedPath.isAllowed) {
      return {
        originalHref: href,
        webHref: href,
        type: 'broken',
        isValid: false,
        error: resolvedPath.securityViolation || 'Path not allowed'
      };
    }

    // Check if path is in allowed document paths
    if (context.documentPaths && !this.isPathInDocumentPaths(resolvedPath.relativePath, context.documentPaths)) {
      return {
        originalHref: href,
        webHref: href,
        type: 'broken',
        isValid: false,
        error: 'Path not in configured document paths'
      };
    }

    // Determine link type and build web route
    const isMarkdown = resolvedPath.relativePath.endsWith('.md');
    const isFile = this.isFileExtension(resolvedPath.relativePath);

    if (isMarkdown) {
      const webRoute = this.buildDocumentWebRoute(context.currentProject, resolvedPath.relativePath);
      return {
        originalHref: href,
        webHref: webRoute,
        filePath: resolvedPath.relativePath,
        type: 'document',
        isValid: true
      };
    } else if (isFile) {
      // For non-markdown files, we'll treat them as file links
      return {
        originalHref: href,
        webHref: href, // Keep original href for file links
        filePath: resolvedPath.relativePath,
        type: 'file',
        isValid: true
      };
    } else {
      return {
        originalHref: href,
        webHref: href,
        type: 'broken',
        isValid: false,
        error: 'Unsupported file type'
      };
    }
  }

  private static normalizeExternalLink(href: string, context: LinkContext): NormalizedLink {
    return {
      originalHref: href,
      webHref: href,
      type: 'external',
      isValid: this.isValidURL(href)
    };
  }

  private static normalizeAnchorLink(href: string, context: LinkContext): NormalizedLink {
    return {
      originalHref: href,
      webHref: href,
      type: 'anchor',
      isValid: true
    };
  }

  private static isTicketLink(href: string): boolean {
    return /^([A-Z]+-[A-Z]?\d+)(\.md)?(#.*)?$/.test(href);
  }

  private static isCrossProjectTicket(href: string, context: LinkContext): boolean {
    const match = href.match(/^([A-Z]+)-(\d+)(\.md)?(#.*)?$/);
    if (!match) return false;

    const [, projectCode] = match;
    return projectCode !== context.currentProject;
  }

  private static isExternalLink(href: string): boolean {
    return /^https?:\/\//.test(href) || /^mailto:/.test(href) || /^tel:/.test(href);
  }

  private static isAnchorLink(href: string): boolean {
    return href.startsWith('#');
  }

  private static containsPathTraversal(pathStr: string): boolean {
    return /\.\./.test(pathStr) || pathStr.includes('\\..') || pathStr.includes('..\\');
  }

  private static containsBlacklistedComponents(pathStr: string): boolean {
    const parts = pathStr.split(path.sep);
    return this.DEFAULT_BLACKLIST.some(blacklisted =>
      parts.some(part => part === blacklisted)
    );
  }

  private static isFileExtension(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return [
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
      '.pdf', '.txt', '.json', '.yaml', '.yml', '.xml',
      '.zip', '.tar', '.gz', '.csv', '.xlsx', '.docx'
    ].includes(ext);
  }

  private static isValidURL(href: string): boolean {
    try {
      const url = new URL(href, window.location.origin);
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
      return allowedProtocols.includes(url.protocol);
    } catch {
      return false;
    }
  }

  private static normalizeRelativeToProject(absolutePath: string, context: LinkContext): string {
    // In frontend context, we need to normalize relative paths
    // This is a simplified approach - in a real implementation,
    // you might need to fetch project configuration from the backend

    const sourceDir = path.dirname(context.sourcePath);
    const relative = path.relative(sourceDir, absolutePath);

    // If we're at the same level or deeper, use relative path
    if (!relative.startsWith('..')) {
      return relative;
    }

    // Otherwise, use the absolute path's basename
    return path.basename(absolutePath);
  }
}

/**
 * Factory function to create link context
 */
export function createLinkContext(params: {
  currentProject: string;
  sourcePath: string;
  projectConfig?: ProjectConfig;
  documentPaths?: string[];
  webBasePath?: string;
}): LinkContext {
  return {
    currentProject: params.currentProject,
    sourcePath: params.sourcePath,
    projectConfig: params.projectConfig,
    documentPaths: params.documentPaths || [],
    webBasePath: params.webBasePath || LinkNormalizer['DEFAULT_WEB_BASE']
  };
}

/**
 * Utility function to normalize multiple links
 */
export function normalizeMultipleLinks(
  hrefs: string[],
  context: LinkContext
): NormalizedLink[] {
  return hrefs.map(href => LinkNormalizer.normalizeLink(href, context));
}