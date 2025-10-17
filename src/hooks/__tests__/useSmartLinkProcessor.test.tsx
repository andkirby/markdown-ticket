/**
 * Smart Link Processor Hook Tests
 *
 * Tests for the React hook that provides enhanced link processing capabilities
 * with caching, validation, and context awareness.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { useSmartLinkProcessor, SmartLinkProcessorOptions } from '../useSmartLinkProcessor';
import { LinkType } from '../../utils/linkProcessor';

// Mock window.location for URL validation
const mockLocation = {
  origin: 'http://localhost:5173'
};

Object.defineProperty(global, 'window', {
  value: {
    location: mockLocation
  },
  writable: true
});

describe('useSmartLinkProcessor', () => {
  const basicOptions: SmartLinkProcessorOptions = {
    currentProject: 'MDT',
    sourcePath: 'docs/CRs/MDT-001.md',
    projectConfig: {
      document_paths: ['docs', 'generated-docs', 'README.md']
    }
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Link Processing', () => {
    it('should process ticket links correctly', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      const processed = result.current.processLink('MDT-001', 'Test Ticket');

      expect(processed.original).toBe('MDT-001');
      expect(processed.parsed.type).toBe(LinkType.TICKET);
      expect(processed.parsed.text).toBe('Test Ticket');
      expect(processed.isValid).toBe(true);
      expect(processed.normalized?.webHref).toBe('/prj/MDT/ticket/MDT-001');
    });

    it('should process document links correctly', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      const processed = result.current.processLink('./guide.md', 'Guide');

      expect(processed.original).toBe('./guide.md');
      expect(processed.parsed.type).toBe(LinkType.DOCUMENT);
      expect(processed.parsed.text).toBe('Guide');
      expect(processed.isValid).toBe(true);
      expect(processed.normalized?.filePath).toBe('docs/CRs/guide.md');
    });

    it('should process external links correctly', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      const processed = result.current.processLink('https://example.com', 'Example');

      expect(processed.original).toBe('https://example.com');
      expect(processed.parsed.type).toBe(LinkType.EXTERNAL);
      expect(processed.parsed.text).toBe('Example');
      expect(processed.isValid).toBe(true);
    });

    it('should handle invalid links gracefully', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      const processed = result.current.processLink('../../../etc/passwd');

      expect(processed.original).toBe('../../../etc/passwd');
      expect(processed.isValid).toBe(false);
      expect(processed.error).toBeDefined();
    });
  });

  describe('Caching', () => {
    it('should cache processed links', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      // Process link first time
      const processed1 = result.current.processLink('MDT-001');
      expect(result.current.cacheSize).toBe(1);

      // Process same link again
      const processed2 = result.current.processLink('MDT-001');
      expect(result.current.cacheSize).toBe(1);

      // Should return cached result
      expect(processed1).toBe(processed2);
    });

    it('should clear cache manually', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      result.current.processLink('MDT-001');
      result.current.processLink('MDT-002');

      expect(result.current.cacheSize).toBe(2);

      act(() => {
        result.current.clearCache();
      });

      expect(result.current.cacheSize).toBe(0);
    });

    it('should clear expired cache entries', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      result.current.processLink('MDT-001');

      expect(result.current.cacheSize).toBe(1);

      // Fast-forward time beyond cache TTL
      act(() => {
        jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
      });

      expect(result.current.cacheSize).toBe(0);
    });

    it('should respect enableCache option', () => {
      const optionsWithCache = { ...basicOptions, enableCache: false };
      const { result } = renderHook(() => useSmartLinkProcessor(optionsWithCache));

      result.current.processLink('MDT-001');
      result.current.processLink('MDT-001');

      expect(result.current.cacheSize).toBe(0);
    });
  });

  describe('Multiple Link Processing', () => {
    it('should process multiple links efficiently', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      const links = [
        { href: 'MDT-001', text: 'Ticket 1' },
        { href: 'MDT-002', text: 'Ticket 2' },
        { href: './guide.md', text: 'Guide' }
      ];

      const processed = result.current.processMultipleLinks(links);

      expect(processed).toHaveLength(3);
      expect(processed[0].parsed.type).toBe(LinkType.TICKET);
      expect(processed[1].parsed.type).toBe(LinkType.TICKET);
      expect(processed[2].parsed.type).toBe(LinkType.DOCUMENT);
      expect(result.current.cacheSize).toBe(3);
    });

    it('should extract and process links from markdown', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      const markdown = `
        # Test Document

        See [MDT-001](MDT-001) for details.
        Check out the [guide](./guide.md) for more info.
        Visit [Example](https://example.com) for external resources.
      `;

      const processed = result.current.extractAndProcessLinks(markdown);

      expect(processed).toHaveLength(3);
      expect(processed[0].parsed.text).toBe('MDT-001');
      expect(processed[1].parsed.text).toBe('guide');
      expect(processed[2].parsed.text).toBe('Example');
    });
  });

  describe('Path Validation', () => {
    it('should validate paths against document configuration', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      // Valid paths
      expect(result.current.validatePath('docs/guide.md')).toBe(true);
      expect(result.current.validatePath('generated-docs/api.md')).toBe(true);
      expect(result.current.validatePath('README.md')).toBe(true);

      // Invalid paths
      expect(result.current.validatePath('private/secret.md')).toBe(false);
      expect(result.current.validatePath('node_modules/package.json')).toBe(false);
    });

    it('should allow all paths when no document paths configured', () => {
      const optionsNoDocs = {
        currentProject: 'MDT',
        sourcePath: 'test.md',
        projectConfig: { document_paths: [] }
      };

      const { result } = renderHook(() => useSmartLinkProcessor(optionsNoDocs));

      expect(result.current.validatePath('any/path/file.md')).toBe(true);
      expect(result.current.validatePath('private/secret.md')).toBe(true);
    });
  });

  describe('Custom Validation', () => {
    it('should apply custom validation function', () => {
      const customValidator = jest.fn((link) => {
        return link.text?.includes('allowed');
      });

      const optionsWithValidator = {
        ...basicOptions,
        validator: customValidator
      };

      const { result } = renderHook(() => useSmartLinkProcessor(optionsWithValidator));

      // Valid according to custom validator
      const validResult = result.current.processLink('MDT-001', 'allowed ticket');
      expect(validResult.isValid).toBe(true);
      expect(customValidator).toHaveBeenCalled();

      // Invalid according to custom validator
      const invalidResult = result.current.processLink('MDT-002', 'forbidden ticket');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Link validation failed');
    });

    it('should handle validator errors gracefully', () => {
      const faultyValidator = jest.fn(() => {
        throw new Error('Validator error');
      });

      const optionsWithFaultyValidator = {
        ...basicOptions,
        validator: faultyValidator
      };

      const { result } = renderHook(() => useSmartLinkProcessor(optionsWithFaultyValidator));

      expect(() => {
        const processed = result.current.processLink('MDT-001');
        expect(processed.isValid).toBe(false);
        expect(processed.error).toBe('Unknown processing error');
      }).not.toThrow();
    });
  });

  describe('Context and State', () => {
    it('should provide link context', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      expect(result.current.linkContext.currentProject).toBe('MDT');
      expect(result.current.linkContext.sourcePath).toBe('docs/CRs/MDT-001.md');
      expect(result.current.linkContext.documentPaths).toEqual(['docs', 'generated-docs', 'README.md']);
      expect(result.current.linkContext.webBasePath).toBe('/prj');
    });

    it('should provide LinkType enum', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      expect(result.current.LinkType).toBeDefined();
      expect(result.current.LinkType.TICKET).toBe('ticket');
      expect(result.current.LinkType.DOCUMENT).toBe('document');
      expect(result.current.LinkType.EXTERNAL).toBe('external');
    });

    it('should update context when options change', () => {
      const { result, rerender } = renderHook(
        (props) => useSmartLinkProcessor(props),
        { initialProps: basicOptions }
      );

      expect(result.current.linkContext.currentProject).toBe('MDT');

      const newOptions = {
        ...basicOptions,
        currentProject: 'NEW',
        sourcePath: 'different/path.md'
      };

      rerender(newOptions);

      expect(result.current.linkContext.currentProject).toBe('NEW');
      expect(result.current.linkContext.sourcePath).toBe('different/path.md');
    });
  });

  describe('Error Handling', () => {
    it('should handle processing errors gracefully', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      // This should not throw
      expect(() => {
        const processed = result.current.processLink('' as any);
        expect(processed.isValid).toBe(false);
        expect(processed.error).toBeDefined();
      }).not.toThrow();
    });

    it('should cache error results with shorter TTL', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      // Process invalid link
      result.current.processLink('../../../etc/passwd');
      expect(result.current.cacheSize).toBe(1);

      // Fast-forward time, but not enough to clear error cache
      act(() => {
        jest.advanceTimersByTime(4 * 60 * 1000); // 4 minutes
      });

      expect(result.current.cacheSize).toBe(1); // Still cached

      // Fast-forward beyond error cache TTL
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 1000); // 2 more minutes (total 6)
      });

      expect(result.current.cacheSize).toBe(0); // Cache cleared
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of links efficiently', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      // Create 100 links
      const links = Array.from({ length: 100 }, (_, i) => ({
        href: `MDT-${String(i + 1).padStart(3, '0')}`,
        text: `Ticket ${i + 1}`
      }));

      const startTime = performance.now();
      const processed = result.current.processMultipleLinks(links);
      const endTime = performance.now();

      expect(processed).toHaveLength(100);
      expect(result.current.cacheSize).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should reuse cached results for repeated processing', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      // Process links first time
      const links = [
        { href: 'MDT-001', text: 'Ticket 1' },
        { href: 'MDT-002', text: 'Ticket 2' }
      ];
      result.current.processMultipleLinks(links);

      const startTime = performance.now();
      // Process same links again (should use cache)
      result.current.processMultipleLinks(links);
      const endTime = performance.now();

      // Second processing should be much faster
      expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
    });
  });

  describe('Integration with Link Normalization', () => {
    it('should integrate correctly with link normalization system', () => {
      const { result } = renderHook(() => useSmartLinkProcessor(basicOptions));

      // Test relative path resolution
      const relativeLink = result.current.processLink('../README.md');
      expect(relativeLink.isValid).toBe(true);
      expect(relativeLink.normalized?.filePath).toBe('docs/README.md');

      // Test cross-project links
      const crossProjectLink = result.current.processLink('ABC-123');
      expect(crossProjectLink.isValid).toBe(true);
      expect(crossProjectLink.normalized?.type).toBe('cross-project');

      // Test security validation
      const maliciousLink = result.current.processLink('../../../etc/passwd');
      expect(maliciousLink.isValid).toBe(false);
      expect(maliciousLink.error).toContain('security');
    });
  });
});