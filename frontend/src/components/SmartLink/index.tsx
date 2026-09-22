import type { LinkContext, NormalizedLink } from '../../utils/linkNormalization'
import type { ParsedLink } from '../../utils/linkProcessor'

import { ExternalLink, File, FileCode, FileText, Hash } from 'lucide-react'
import * as React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ensureGlobalLinkConfig, getLinkConfig, subscribeGlobalLinkConfig } from '../../config/linkConfig'
import { ensureDocumentIndex, getCachedDocumentIndex, subscribeDocumentIndex } from '../../utils/documentExistenceCache'
import { classifyAndNormalizeLink, createLinkContextFromProject, LinkType } from '../../utils/linkProcessor'
import { carryViewParam } from '../routes/viewModeDerivation'
import { documentTargetFromHref, useDocumentDelivery } from './documentDelivery'

interface SmartLinkProps {
  link: ParsedLink
  currentProject: string
  children: React.ReactNode
  className?: string
  showIcon?: boolean
  /** Optional link context for enhanced normalization */
  linkContext?: Partial<LinkContext>
  /** Original href before normalization */
  originalHref?: string
  /** Optional accessible name override (e.g. "Open epic MDT-012", MDT-246) */
  ariaLabel?: string
}

const SmartLink: React.FC<SmartLinkProps> = ({
  link,
  currentProject,
  children,
  className = '',
  showIcon = true,
  linkContext,
  originalHref,
  ariaLabel,
}) => {
  // Force hot reload - showIcon should hide icons
  const baseClassName = showIcon
    ? `inline-flex items-center gap-1 ${className}`
    : `inline ${className}`

  const linkConfig = getLinkConfig()

  // MDT-237 follow-up: re-render when global config.toml link defaults arrive
  const [, setLinkConfigTick] = React.useState(0)
  React.useEffect(() => {
    ensureGlobalLinkConfig()
    return subscribeGlobalLinkConfig(() => setLinkConfigTick(t => t + 1))
  }, [])

  // Enhanced link processing if context is provided
  const [normalizedLink, setNormalizedLink] = React.useState<NormalizedLink | null>(null)

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    if (linkContext && originalHref) {
      try {
        const context = createLinkContextFromProject(
          currentProject,
          linkContext.sourcePath || '',
          linkContext.projectConfig,
        )

        const { normalized } = classifyAndNormalizeLink(originalHref, currentProject, context)
        if (normalized) {
          // Use setTimeout to avoid direct setState in useEffect
          timeoutId = setTimeout(() => setNormalizedLink(normalized), 0)
        }
      }
      catch (error) {
        console.warn('Failed to normalize link:', error)
      }
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [linkContext, originalHref, currentProject])

  // Use normalized href for document/file links, but keep original for ticket links
  // This prevents overriding correctly built ticket URLs
  const shouldUseNormalizedHref = normalizedLink
    && link.type !== LinkType.TICKET
    && link.type !== LinkType.CROSS_PROJECT

  const effectiveHref = shouldUseNormalizedHref ? normalizedLink.webHref : link.href
  const effectiveLink = shouldUseNormalizedHref ? { ...link, href: effectiveHref } : link

  // MDT-246 (BR-1.7): ticket links opened inside a ticket modal carry the
  // current ?view= context, so closing the opened ticket returns to the
  // originating view. Rule owned by viewModeDerivation.carryViewParam.
  const location = useLocation()
  const isTicketLikeLink
    = effectiveLink.type === LinkType.TICKET || effectiveLink.type === LinkType.CROSS_PROJECT
  const ticketHref = isTicketLikeLink
    ? carryViewParam(effectiveLink.href, location.pathname, location.search)
    : effectiveLink.href

  // MDT-237 (BR-2.1): visibly flag document links whose target is known to be
  // missing. One document-index fetch per project (C5); unknown index (loading,
  // unconfigured paths, or failure) renders the normal link — no signal, no flag.
  const [, setIndexTick] = React.useState(0)
  React.useEffect(() => {
    if (link.type !== LinkType.DOCUMENT) {
      return
    }
    ensureDocumentIndex(currentProject)
    return subscribeDocumentIndex(currentProject, () => setIndexTick(t => t + 1))
  }, [link.type, currentProject])

  const documentMissing = (() => {
    if (effectiveLink.type !== LinkType.DOCUMENT) {
      return false
    }
    const index = getCachedDocumentIndex(currentProject)
    if (!index) {
      return false
    }
    try {
      const fileParam = new URL(effectiveLink.href, window.location.origin).searchParams.get('file')
      if (!fileParam) {
        return false
      }
      // MDT-237 UAT 2026-09-12 (BR-2.8): known-missing requires the index to
      // positively cover the target's directory. Targets under prefixes the
      // index never lists (the tickets area, unconfigured directories) are
      // unknown, not missing — render the normal link, never a false flag.
      const dirPrefix = fileParam.slice(0, fileParam.lastIndexOf('/') + 1)
      if (!index.coversPrefix(dirPrefix)) {
        return false
      }
      return !index.has(fileParam)
    }
    catch {
      return false
    }
  })()

  // MDT-248: inside the ticket modal, document links deliver to the side
  // reading pane instead of navigating. No provider (every other surface)
  // falls through to router navigation — byte-identical to before (C6).
  const delivery = useDocumentDelivery()
  const paneTarget = delivery && !documentMissing
    ? (normalizedLink?.filePath ?? documentTargetFromHref(effectiveLink.href))
    : null

  // If auto-linking is disabled, render as plain text
  if (!linkConfig.enableAutoLinking) {
    return <span className={className}>{children}</span>
  }

  // Check specific link type configurations
  if (effectiveLink.type === LinkType.TICKET && !linkConfig.enableTicketLinks) {
    return <span className={className}>{children}</span>
  }

  if (effectiveLink.type === LinkType.DOCUMENT && !linkConfig.enableDocumentLinks) {
    return <span className={className}>{children}</span>
  }

  // Show error state if normalization failed
  if (normalizedLink && !normalizedLink.isValid) {
    return (
      <span className={`${baseClassName} smart-link`} data-link-type="broken" title={normalizedLink.error}>
        {children}
      </span>
    )
  }

  // MDT-237 (BR-2.1): known-missing document target — visibly flagged, not clickable
  if (documentMissing) {
    return (
      <span className={`${baseClassName} smart-link`} data-link-type="broken" title="Document not found">
        {children}
      </span>
    )
  }

  switch (effectiveLink.type) {
    case LinkType.EXTERNAL:
      return (
        <a
          href={effectiveLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClassName} smart-link`}
          data-link-type="external"
          aria-label={ariaLabel}
        >
          {children}
          {showIcon && <ExternalLink className="smart-link__icon" />}
        </a>
      )

    case LinkType.TICKET:
      return (
        <Link
          to={ticketHref}
          className={`${baseClassName} smart-link`}
          data-link-type="ticket"
          aria-label={ariaLabel}
        >
          {showIcon && <FileText className="smart-link__icon" />}
          {children}
        </Link>
      )

    case LinkType.DOCUMENT:
      return (
        <Link
          to={effectiveLink.href}
          onClick={paneTarget
            ? (event) => {
                event.preventDefault()
                delivery?.openDocument(paneTarget)
              }
            : undefined}
          className={`${baseClassName} smart-link`}
          data-link-type="document"
          aria-label={ariaLabel}
        >
          {showIcon && <FileCode className="smart-link__icon" />}
          {children}
        </Link>
      )

    case LinkType.ANCHOR:
      return (
        <a
          href={effectiveLink.href}
          className={`${baseClassName} smart-link`}
          data-link-type="anchor"
          aria-label={ariaLabel}
        >
          {showIcon && <Hash className="smart-link__icon" />}
          {children}
        </a>
      )

    case LinkType.FILE:
      return (
        <a
          href={effectiveLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClassName} smart-link`}
          data-link-type="file"
          aria-label={ariaLabel}
        >
          {showIcon && <File className="smart-link__icon" />}
          {children}
        </a>
      )

    case LinkType.CROSS_PROJECT:
      return (
        <Link
          to={ticketHref}
          className={`${baseClassName} smart-link`}
          data-link-type="cross-project"
          aria-label={ariaLabel}
        >
          {showIcon && <FileText className="smart-link__icon" />}
          {children}
          <span className="smart-link__project-badge">
            {effectiveLink.projectCode || normalizedLink?.targetProject}
          </span>
        </Link>
      )

    case LinkType.UNKNOWN:
    default:
      return (
        <span className={`${baseClassName} smart-link`} data-link-type="broken">
          {children}
        </span>
      )
  }
}

export default SmartLink
