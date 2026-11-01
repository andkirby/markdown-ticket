import type { ExternalReference } from '@mdt/domain-contracts'

/** Split presentation only; the original identity, destination and label stay intact. */
export function splitRepositoryLabel(reference: ExternalReference) {
  if (reference.kind !== 'github' && reference.kind !== 'gitlab')
    return undefined
  const separator = reference.displayKey.lastIndexOf('#')
  if (separator <= 0)
    return undefined
  const repository = reference.displayKey.slice(0, separator)
  const suffixStart = Math.max(0, repository.length - 6)
  return {
    start: repository.slice(0, suffixStart),
    end: repository.slice(suffixStart),
    issue: reference.displayKey.slice(separator),
  }
}
