import { useState, useCallback } from 'react';

/**
 * Simplified path resolution hook that leverages enhanced /api/filesystem/exists endpoint
 * SECURITY: All path expansion and validation happens server-side
 * PERFORMANCE: Single API call returns existence, discovery status, and expanded path
 */
export const usePathResolution = () => {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Check path with enhanced API - single call gets existence, discovery, and expansion
   * @param inputPath - Path to check (may contain tilde ~)
   * @returns Object with existence, discovery status, and expanded path
   */
  const checkPath = useCallback(async (inputPath: string) => {
    if (!inputPath || typeof inputPath !== 'string') {
      return {
        exists: false,
        isInDiscovery: false,
        expandedPath: inputPath
      };
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/filesystem/exists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: inputPath }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        exists: result.exists === 1,
        isInDiscovery: result.isInDiscovery === 1,
        expandedPath: result.expandedPath || inputPath
      };
    } catch (error) {
      console.error('Error checking path:', error);
      // Return fallback values
      return {
        exists: false,
        isInDiscovery: false,
        expandedPath: inputPath
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    checkPath
  };
};