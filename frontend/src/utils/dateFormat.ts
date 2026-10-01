/**
 * Date formatting utilities
 */

/** Compact units (`45m ago`), matching the EventHistory dev tool; `mo` disambiguates month from minute. */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = typeof date === 'string' ? new Date(date) : date

  if (Number.isNaN(then.getTime())) {
    return 'unknown'
  }

  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1)
    return 'just now'
  if (diffMins < 60)
    return `${diffMins}m ago`
  if (diffHours < 24)
    return `${diffHours}h ago`
  if (diffDays < 7)
    return `${diffDays}d ago`
  if (diffDays < 30)
    return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365)
    return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export function formatFullDateTime(date: Date | string | null): string {
  if (!date)
    return 'N/A'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(dateObj.getTime()))
    return 'Invalid Date'
  return dateObj.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
