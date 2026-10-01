import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { formatRelativeTime } from './dateFormat'

const REAL_NOW = new Date()
const FIXED_NOW = new Date('2026-03-23T12:00:00Z')

function minutesAgo(minutes: number): Date {
  return new Date(FIXED_NOW.getTime() - minutes * 60000)
}

function daysAgo(days: number): Date {
  return new Date(FIXED_NOW.getTime() - days * 86400000)
}

describe('formatRelativeTime', () => {
  beforeEach(() => {
    setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    setSystemTime(REAL_NOW)
  })

  it('returns "just now" below one minute', () => {
    expect(formatRelativeTime(minutesAgo(0))).toBe('just now')
    expect(formatRelativeTime(new Date(FIXED_NOW.getTime() - 59000))).toBe('just now')
    expect(formatRelativeTime(minutesAgo(1))).toBe('1m ago')
  })

  it('formats minutes compactly', () => {
    expect(formatRelativeTime(minutesAgo(45))).toBe('45m ago')
    expect(formatRelativeTime(minutesAgo(59))).toBe('59m ago')
  })

  it('formats hours compactly', () => {
    expect(formatRelativeTime(minutesAgo(60))).toBe('1h ago')
    expect(formatRelativeTime(minutesAgo(23 * 60))).toBe('23h ago')
  })

  it('formats days compactly, with no plural distinction', () => {
    expect(formatRelativeTime(daysAgo(1))).toBe('1d ago')
    expect(formatRelativeTime(daysAgo(6))).toBe('6d ago')
  })

  it('formats weeks compactly', () => {
    expect(formatRelativeTime(daysAgo(7))).toBe('1w ago')
    expect(formatRelativeTime(daysAgo(29))).toBe('4w ago')
  })

  it('formats months as "mo" to stay distinct from minutes', () => {
    expect(formatRelativeTime(daysAgo(30))).toBe('1mo ago')
    expect(formatRelativeTime(daysAgo(364))).toBe('12mo ago')
  })

  it('formats years compactly', () => {
    expect(formatRelativeTime(daysAgo(365))).toBe('1y ago')
    expect(formatRelativeTime(daysAgo(800))).toBe('2y ago')
  })

  it('treats future timestamps as "just now"', () => {
    expect(formatRelativeTime(daysAgo(-3))).toBe('just now')
  })

  it('returns "unknown" for unparseable input', () => {
    expect(formatRelativeTime('not-a-date')).toBe('unknown')
  })
})
