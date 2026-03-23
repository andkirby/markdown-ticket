/**
 * Date formatting utilities
 */

function formatRelativeUnit(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`
}

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

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return formatRelativeUnit(diffMins, 'minute')
  if (diffHours < 24) return formatRelativeUnit(diffHours, 'hour')
  if (diffDays < 7) return formatRelativeUnit(diffDays, 'day')
  if (diffDays < 30) return formatRelativeUnit(Math.floor(diffDays / 7), 'week')
  if (diffDays < 365) return formatRelativeUnit(Math.floor(diffDays / 30), 'month')
  return formatRelativeUnit(Math.floor(diffDays / 365), 'year')
}

export function formatFullDateTime(date: Date | string | null): string {
  if (!date) return 'N/A'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(dateObj.getTime())) return 'Invalid Date'
  return dateObj.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
