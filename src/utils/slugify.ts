/**
 * Shared heading slug generator.
 *
 * Produces GitHub-compatible heading IDs matching Showdown's
 * `ghCompatibleHeaderId` algorithm:
 *   1. Lowercase
 *   2. Split on whitespace
 *   3. Strip non-word characters from each segment (preserving hyphens and Unicode)
 *   4. Join segments with hyphens (empty segments produce consecutive hyphens)
 *
 * Used by both `markdown-it-anchor` config in `useMarkdownProcessor.ts`
 * and `tableOfContents.ts` for TOC ID generation.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(segment => segment.replace(/[^\p{L}\p{N}-]/gu, ''))
    .join('-')
}
