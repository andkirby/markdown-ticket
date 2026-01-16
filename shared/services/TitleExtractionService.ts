import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Cache entry for extracted title information
 */
class TitleCacheEntry {
  title: string
  fileModifiedTime: number
  extractedAt: number

  constructor(title: string, fileModifiedTime: number, extractedAt: number) {
    this.title = title
    this.fileModifiedTime = fileModifiedTime
    this.extractedAt = extractedAt
  }
}

/**
 * Service for extracting and caching ticket titles from H1 headers
 * Implements MDT-064: H1 as Single Source of Truth for ticket titles
 */
export class TitleExtractionService {
  private cache: Map<string, TitleCacheEntry>
  private ttl: number
  private readonly DEFAULT_TTL = 60 * 60 * 1000
  private readonly H1_PATTERN = /^#\s+(.+)$/m // Strict H1 detection: starts with "# "

  constructor(ttl: number = 60 * 60 * 1000) { // 1 hour in milliseconds default
    this.cache = new Map()
    this.ttl = ttl
  }

  /**
   * Extract title from markdown content with H1 as authoritative source
   * Falls back to filename extraction if no H1 found
   *
   * @param projectPath Project root path for cache key generation
   * @param filePath Absolute file path
   * @param content Optional markdown content (if not provided, will read file)
   * @returns Extracted title
   */
  async extractTitle(projectPath: string, filePath: string, content?: string): Promise<string> {
    const cacheKey = this.generateCacheKey(projectPath, filePath)

    // Check cache first
    const cachedEntry = this.getCachedEntry(cacheKey, filePath)
    if (cachedEntry) {
      return cachedEntry.title
    }

    // Read content if not provided
    let fileContent = content
    if (!fileContent) {
      try {
        fileContent = await fs.promises.readFile(filePath, 'utf-8')
      }
      catch (error) {
        console.error(`Failed to read file ${filePath}:`, error)
        return this.extractFromFilename(filePath)
      }
    }

    // Extract title from H1
    const h1Title = this.extractH1Title(fileContent)
    let title: string

    if (h1Title) {
      title = h1Title
    }
    else {
      // Fallback to filename and log warning
      title = this.extractFromFilename(filePath)
      console.error(`MDT-064 Warning: No H1 header found in ${filePath}, using filename fallback: "${title}"`)
    }

    // Cache the result
    await this.cacheEntry(cacheKey, title, filePath)

    return title
  }

  /**
   * Extract title from the first H1 header in markdown content
   * Uses strict pattern matching: only lines starting with "# " (exact)
   *
   * @param content Markdown content
   * @returns First H1 title or null if not found
   */
  extractH1Title(content: string): string | null {
    const lines = content.split('\n')

    for (const line of lines) {
      const match = line.trim().match(this.H1_PATTERN)
      if (match) {
        return match[1].trim()
      }
    }

    return null
  }

  /**
   * Process content to remove additional H1 headers (keep only first)
   * This ensures content consistency when displaying in UI
   *
   * @param content Markdown content
   * @returns Processed content with only first H1 preserved
   */
  processContentForDisplay(content: string): string {
    const lines = content.split('\n')
    let firstH1Found = false
    const processedLines: string[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (trimmedLine.match(this.H1_PATTERN)) {
        if (!firstH1Found) {
          // Skip the first H1 entirely (it will be shown as the ticket title)
          firstH1Found = true
        }
        else {
          // Convert additional H1s to H2s for preservation
          const h1Match = trimmedLine.match(this.H1_PATTERN)
          if (h1Match) {
            processedLines.push(`## ${h1Match[1]}`)
          }
        }
      }
      else {
        processedLines.push(line)
      }
    }

    return processedLines.join('\n')
  }

  /**
   * Extract title from filename when no H1 is present
   * Pattern: DEB-031-testing-ticket.md -> "testing-ticket"
   *
   * @param filePath File path
   * @returns Extracted filename-based title
   */
  extractFromFilename(filePath: string): string {
    const filename = path.basename(filePath, '.md')

    // Look for pattern: CODE-NUMBER-title
    const match = filename.match(/^[A-Z]+-\d+-(.+)$/i)
    if (match) {
      return match[1].replace(/-/g, ' ').trim()
    }

    // Fallback: use entire filename (without extension)
    return filename.replace(/-/g, ' ').trim()
  }

  /**
   * Generate cache key in format: project:filepath
   *
   * @param projectPath Project root path
   * @param filePath Absolute file path
   * @returns Cache key
   */
  generateCacheKey(projectPath: string, filePath: string): string {
    const relativePath = path.relative(projectPath, filePath)
    return `${projectPath}:${relativePath}`
  }

  /**
   * Get cached entry if valid and not stale
   *
   * @param cacheKey Cache key
   * @param filePath File path for modification time check
   * @returns Cached entry or null if invalid/stale
   */
  getCachedEntry(cacheKey: string, filePath: string): TitleCacheEntry | null {
    const cached = this.cache.get(cacheKey)

    if (!cached) {
      return null
    }

    // Check if cache entry is expired
    const now = Date.now()
    if (now - cached.extractedAt > this.ttl) {
      this.cache.delete(cacheKey)
      return null
    }

    // Check if file has been modified since caching
    try {
      const stats = fs.statSync(filePath)
      if (stats.mtime.getTime() > cached.fileModifiedTime) {
        this.cache.delete(cacheKey)
        return null
      }
    }
    catch (error) {
      // File might not exist, invalidate cache
      this.cache.delete(cacheKey)
      return null
    }

    return cached
  }

  /**
   * Cache a title extraction result
   *
   * @param cacheKey Cache key
   * @param title Extracted title
   * @param filePath File path for modification time
   */
  async cacheEntry(cacheKey: string, title: string, filePath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(filePath)
      const entry: TitleCacheEntry = {
        title,
        fileModifiedTime: stats.mtime.getTime(),
        extractedAt: Date.now(),
      }

      this.cache.set(cacheKey, entry)
    }
    catch (error) {
      console.error(`Failed to cache entry for ${filePath}:`, error)
    }
  }

  /**
   * Invalidate cache entry for specific file
   *
   * @param projectPath Project root path
   * @param filePath File path
   */
  invalidateCache(projectPath: string, filePath: string): void {
    const cacheKey = this.generateCacheKey(projectPath, filePath)
    this.cache.delete(cacheKey)
  }

  /**
   * Clear all cached entries (useful for testing or bulk operations)
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number, entries: Array<{ key: string, title: string, age: number }> } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      title: entry.title,
      age: now - entry.extractedAt,
    }))

    return {
      size: this.cache.size,
      entries,
    }
  }
}
