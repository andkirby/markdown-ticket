import { promises as fs } from 'node:fs'
import { Command } from './Command.js'

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'ENOENT')
}

interface CacheEntry {
  data: string
  timestamp: number
}

/**
 * Command to read file content
 * Note: Cache has no size limit - could grow large with many files.
 */
export class ReadFileCommand extends Command {
  private cache: Map<string, CacheEntry>
  private TTL: number

  constructor(ttlSeconds = 3600) {
    super()
    this.cache = new Map()
    this.TTL = ttlSeconds * 1000 // Convert to milliseconds
  }

  async execute(...args: unknown[]): Promise<unknown> {
    const [filePath] = args as [string]
    // Check cache first
    const cached = this.cache.get(filePath)

    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data
    }

    try {
      const content = await fs.readFile(filePath, 'utf8')

      this.cache.set(filePath, {
        data: content,
        timestamp: Date.now(),
      })

      return content
    }
    catch (error) {
      // ponytail: ENOENT is a normal condition (file deleted externally) — surface it distinctly
      // so the controller can return 404 instead of a generic 500.
      if (isMissingFileError(error)) {
        throw new Error('File not found')
      }
      throw new Error(`Failed to read file: ${filePath}`)
    }
  }

  invalidate(filePath: string): void {
    this.cache.delete(filePath)
  }

  clearCache(): void {
    this.cache.clear()
  }
}
