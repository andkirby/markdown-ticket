export interface FilenameNamespaceParseResult {
  baseName: string
  variantKey: string
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

export function parseFilenameNamespace(filename: string): FilenameNamespaceParseResult | null {
  const dotIndex = filename.indexOf('.')
  if (dotIndex <= 0 || dotIndex === filename.length - 1) {
    return null
  }

  return {
    baseName: filename.slice(0, dotIndex),
    variantKey: filename.slice(dotIndex + 1),
  }
}

export function sortFilenameNamespaceKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => collator.compare(a, b))
}
