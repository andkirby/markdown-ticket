/**
 * Smart Link Processing Hook
 *
 * Provides enhanced link processing capabilities with context-aware normalization
 * and caching for optimal performance.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ParsedLink, LinkType, classifyAndNormalizeLink, extractDocumentPaths } from '../utils/linkProcessor';
import { LinkContext, NormalizedLink } from '../utils/linkNormalization';

export interface SmartLinkProcessorOptions {
  /** Current project code */
  currentProject: string;
  /** Source file path for relative link resolution */
  sourcePath?: string;
  /** Project configuration for document paths */
  projectConfig?: any;
  /** Enable link caching for performance */
  enableCache?: boolean;
  /** Custom link validation function */
  validator?: (link: ParsedLink) => boolean;
}

export interface ProcessedLink {
  /** Original link text/href */
  original: string;
  /** Parsed link information */
  parsed: ParsedLink;
  /** Normalized link information */
  normalized?: NormalizedLink;
  /** Whether the link is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
}

export interface LinkCache {
  [key: string]: {
    link: ProcessedLink;
    timestamp: number;
  };
}

const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useSmartLinkProcessor(options: SmartLinkProcessorOptions) {
  const {
    currentProject,
    sourcePath = '',
    projectConfig,
    enableCache = true,
    validator
  } = options;

  // Link cache for performance optimization
  const [linkCache, setLinkCache] = useState<LinkCache>({});

  // Create link context memoized for performance
  const linkContext = useMemo<LinkContext>(() => ({
    currentProject,
    sourcePath,
    projectConfig,
    documentPaths: extractDocumentPaths(projectConfig),
    webBasePath: '/prj'
  }), [currentProject, sourcePath, projectConfig]);

  // Clear expired cache entries
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    setLinkCache(prev => {
      const cleaned: LinkCache = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (now - value.timestamp < DEFAULT_CACHE_TTL) {
          cleaned[key] = value;
        }
      });
      return cleaned;
    });
  }, []);

  // Process a single link with caching
  const processLink = useCallback((href: string, linkText?: string): ProcessedLink => {
    const cacheKey = `${href}:${linkContext.sourcePath}:${currentProject}`;

    // Check cache first
    if (enableCache && linkCache[cacheKey]) {
      const cached = linkCache[cacheKey];
      if (Date.now() - cached.timestamp < DEFAULT_CACHE_TTL) {
        return cached.link;
      }
    }

    try {
      const { parsed, normalized } = classifyAndNormalizeLink(href, currentProject, linkContext);

      // Set link text if provided
      if (linkText) {
        parsed.text = linkText;
      }

      // Apply custom validation if provided
      const isValid = validator ? validator(parsed) : (normalized?.isValid ?? parsed.isValid ?? false);

      const processedLink: ProcessedLink = {
        original: href,
        parsed,
        normalized,
        isValid,
        error: normalized?.error || (!isValid ? 'Link validation failed' : undefined)
      };

      // Cache the result
      if (enableCache) {
        setLinkCache(prev => ({
          ...prev,
          [cacheKey]: {
            link: processedLink,
            timestamp: Date.now()
          }
        }));
      }

      return processedLink;

    } catch (error) {
      const errorLink: ProcessedLink = {
        original: href,
        parsed: {
          type: LinkType.UNKNOWN,
          href,
          text: linkText || href,
          isValid: false
        },
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      };

      // Cache error results with shorter TTL
      if (enableCache) {
        setLinkCache(prev => ({
          ...prev,
          [cacheKey]: {
            link: errorLink,
            timestamp: Date.now() - (DEFAULT_CACHE_TTL * 0.8) // Cache errors for 80% of normal TTL
          }
        }));
      }

      return errorLink;
    }
  }, [currentProject, linkContext, enableCache, validator, linkCache]);

  // Process multiple links efficiently
  const processMultipleLinks = useCallback((
    links: Array<{ href: string; text?: string }>
  ): ProcessedLink[] => {
    return links.map(({ href, text }) => processLink(href, text));
  }, [processLink]);

  // Extract and process all links from markdown content
  const extractAndProcessLinks = useCallback((markdown: string): ProcessedLink[] => {
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    const links: Array<{ href: string; text?: string }> = [];
    let match;

    while ((match = linkRegex.exec(markdown)) !== null) {
      const [, text, href] = match;
      links.push({ href, text });
    }

    return processMultipleLinks(links);
  }, [processMultipleLinks]);

  // Validate a path against project configuration
  const validatePath = useCallback((filePath: string): boolean => {
    if (!linkContext.documentPaths || linkContext.documentPaths.length === 0) {
      return true; // No restrictions
    }

    const normalizedPath = filePath.replace(/^\/+/, '').replace(/\\/g, '/');

    return linkContext.documentPaths.some(docPath => {
      const normalizedDocPath = docPath.replace(/^\/+/, '').replace(/\\/g, '/');

      if (normalizedPath === normalizedDocPath) {
        return true;
      }

      if (normalizedPath.startsWith(normalizedDocPath + '/')) {
        return true;
      }

      return false;
    });
  }, [linkContext.documentPaths]);

  // Clear cache manually
  const clearCache = useCallback(() => {
    setLinkCache({});
  }, []);

  // Auto-clear expired cache periodically
  useEffect(() => {
    if (!enableCache) return;

    const interval = setInterval(clearExpiredCache, DEFAULT_CACHE_TTL);
    return () => clearInterval(interval);
  }, [enableCache, clearExpiredCache]);

  return {
    // Core processing functions
    processLink,
    processMultipleLinks,
    extractAndProcessLinks,

    // Validation
    validatePath,

    // Cache management
    clearCache,
    clearExpiredCache,

    // Context and state
    linkContext,
    cacheSize: Object.keys(linkCache).length,

    // Utilities
    LinkType
  };
}