import type { ReactNode } from 'react'

/** Safe literal matching: punctuation is text, and React escapes every segment. */
export function SearchHighlight({ text, query = '' }: { text: string, query?: string }): ReactNode {
  const terms = [...new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))]
  if (!terms.length)
    return text
  const lower = text.toLowerCase()
  const matches: Array<{ start: number, end: number }> = []
  for (const term of terms) {
    let start = lower.indexOf(term)
    while (start !== -1) {
      matches.push({ start, end: start + term.length })
      start = lower.indexOf(term, start + 1)
    }
  }
  const merged: typeof matches = []
  for (const match of matches.sort((a, b) => a.start - b.start || b.end - a.end)) {
    const last = merged[merged.length - 1]
    if (last && match.start <= last.end)
      last.end = Math.max(last.end, match.end)
    else
      merged.push({ ...match })
  }
  const parts: ReactNode[] = []
  let end = 0
  for (const match of merged) {
    parts.push(text.slice(end, match.start), <mark className="search-match" key={match.start}>{text.slice(match.start, match.end)}</mark>)
    end = match.end
  }
  parts.push(text.slice(end))
  // Keep the whole text run in one flex item when rendered beside key glyphs.
  return <span>{parts}</span>
}
