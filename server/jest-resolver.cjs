/**
 * Custom Jest resolver for ESM-style .js imports in TypeScript files
 *
 * This resolver handles the case where TypeScript files import from each other
 * using .js extensions (for ESM compatibility) but Jest needs to find the .ts files.
 */
const path = require('node:path')

function isPathLike(source) {
  return source.startsWith('.') || path.isAbsolute(source)
}

function resolve(source, options) {
  const { defaultResolver } = options

  // If extensionless local/absolute path, prefer TypeScript sources first.
  if (isPathLike(source) && path.extname(source) === '') {
    const extensionlessCandidates = [
      `${source}.ts`,
      `${source}.tsx`,
      `${source}/index.ts`,
      `${source}/index.tsx`,
    ]

    for (const candidate of extensionlessCandidates) {
      try {
        return defaultResolver(candidate, options)
      }
      catch {
        // Try next candidate
      }
    }
  }

  // If the source ends with .js, try resolving to .ts first
  if (source.endsWith('.js')) {
    const jsCandidates = [
      source.replace(/\.js$/, '.ts'),
      source.replace(/\.js$/, '.tsx'),
    ]

    for (const candidate of jsCandidates) {
      try {
        return defaultResolver(candidate, options)
      }
      catch {
        // Try next candidate
      }
    }
  }

  return defaultResolver(source, options)
}

module.exports = resolve
