/**
 * Custom Jest resolver for ESM-style .js imports in TypeScript files
 *
 * This resolver handles the case where TypeScript files import from each other
 * using .js extensions (for ESM compatibility) but Jest needs to find the .ts files.
 */

function resolve(source, options) {
  const { defaultResolver } = options

  // If the source ends with .js, try resolving to .ts first
  if (source.endsWith('.js')) {
    const tsSource = source.replace(/\.js$/, '.ts')
    try {
      return defaultResolver(tsSource, options)
    }
    catch {
      // Fall through to default resolver
    }
  }

  return defaultResolver(source, options)
}

module.exports = resolve
