import { useEffect, useMemo, useRef } from 'react'

const DEFAULT_TITLE = 'CR Task Board'

export const PageTitlePriority = {
  ROOT_VIEW: 10,
  DOCUMENT: 20,
  TICKET: 30,
} as const

export type PageTitlePriorityValue = typeof PageTitlePriority[keyof typeof PageTitlePriority]

export type RootViewTitleArea = 'Board' | 'Listing' | 'Documents'

interface PageTitleRegistration {
  priority: PageTitlePriorityValue
  title: string
}

const pageTitleRegistrations = new Map<symbol, PageTitleRegistration>()

function normalizeTitlePart(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function joinTitleParts(parts: Array<string | null | undefined>): string {
  return parts
    .map(normalizeTitlePart)
    .filter(Boolean)
    .join(' - ')
}

function publishPageTitle(): void {
  if (typeof document === 'undefined') {
    return
  }

  const active = [...pageTitleRegistrations.values()]
    .filter(registration => registration.title)
    .sort((a, b) => b.priority - a.priority)[0]

  document.title = active?.title || DEFAULT_TITLE
}

function registerPageTitle(id: symbol, registration: PageTitleRegistration): void {
  pageTitleRegistrations.set(id, registration)
  publishPageTitle()
}

function unregisterPageTitle(id: symbol): void {
  pageTitleRegistrations.delete(id)
  publishPageTitle()
}

export function formatRootViewPageTitle(projectCode: string | null | undefined, area: RootViewTitleArea): string {
  const normalizedProjectCode = normalizeTitlePart(projectCode)
  return normalizedProjectCode ? `${normalizedProjectCode} ${area}` : area
}

export function formatTicketPageTitle(
  ticketCode: string | null | undefined,
  ticketTitle: string | null | undefined,
  contextLabel?: string | null,
): string {
  return joinTitleParts([ticketCode, ticketTitle, contextLabel])
}

export function formatDocumentPageTitle(
  projectCode: string | null | undefined,
  documentTitle: string | null | undefined,
): string {
  return joinTitleParts([projectCode, documentTitle])
}

export function usePageTitle(title: string | null | undefined, priority: PageTitlePriorityValue): void {
  const idRef = useRef<symbol | null>(null)
  if (!idRef.current) {
    idRef.current = Symbol('page-title')
  }

  const normalizedTitle = useMemo(() => normalizeTitlePart(title), [title])

  useEffect(() => {
    const id = idRef.current!

    if (normalizedTitle) {
      registerPageTitle(id, { priority, title: normalizedTitle })
      return () => unregisterPageTitle(id)
    }

    unregisterPageTitle(id)
    return () => unregisterPageTitle(id)
  }, [normalizedTitle, priority])
}

export function resetPageTitleForTests(): void {
  pageTitleRegistrations.clear()
  publishPageTitle()
}
