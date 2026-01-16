import type { LinkContext, NormalizedLink } from '../utils/linkNormalization'
import type { ParsedLink } from '../utils/linkProcessor'
/* eslint-disable node/prefer-global/process -- Using import.meta.env for browser compatibility */
import { ExternalLink, File, FileCode, FileText, Hash } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'
import { getLinkConfig } from '../config/linkConfig'
import { classifyAndNormalizeLink, createLinkContextFromProject, LinkType } from '../utils/linkProcessor'

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
}

const linkStyles = {
  external: 'text-blue-600 hover:underline external-link',
  ticket: 'text-purple-600 hover:underline ticket-link',
  document: 'text-green-600 hover:underline document-link',
  anchor: 'text-gray-600 hover:underline anchor-link',
  file: 'text-orange-600 hover:underline file-link',
  crossProject: 'text-indigo-600 hover:underline cross-project-link',
  broken: 'text-red-400 line-through broken-link',
}

const SmartLink: React.FC<SmartLinkProps> = ({
  link,
  currentProject,
  children,
  className = '',
  showIcon = true,
  linkContext,
  originalHref,
}) => {
  // Force hot reload - showIcon should hide icons
  const baseClassName = showIcon
    ? `inline-flex items-center gap-1 ${className}`
    : `inline ${className}`

  const linkConfig = getLinkConfig()

  // Enhanced link processing if context is provided
  const [normalizedLink, setNormalizedLink] = React.useState<NormalizedLink | null>(null)

  React.useEffect(() => {
    if (linkContext && originalHref) {
      try {
        const context = createLinkContextFromProject(
          currentProject,
          linkContext.sourcePath || '',
          linkContext.projectConfig,
        )

        const { normalized } = classifyAndNormalizeLink(originalHref, currentProject, context)
        if (normalized) {
          setNormalizedLink(normalized)
        }
      }
      catch (error) {
        console.warn('Failed to normalize link:', error)
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
      <span className={`${baseClassName} ${linkStyles.broken}`} title={normalizedLink.error}>
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
          className={`${baseClassName} ${linkStyles.external}`}
        >
          {children}
          {showIcon && <ExternalLink className="w-3 h-3" />}
        </a>
      )

    case LinkType.TICKET:
      return (
        <Link
          to={effectiveLink.href}
          className={`${baseClassName} ${linkStyles.ticket}`}
        >
          {showIcon && <FileText className="w-3 h-3" />}
          {children}
        </Link>
      )

    case LinkType.DOCUMENT:
      return (
        <Link
          to={effectiveLink.href}
          className={`${baseClassName} ${linkStyles.document}`}
        >
          {showIcon && <FileCode className="w-3 h-3" />}
          {children}
        </Link>
      )

    case LinkType.ANCHOR:
      return (
        <a
          href={effectiveLink.href}
          className={`${baseClassName} ${linkStyles.anchor}`}
        >
          {showIcon && <Hash className="w-3 h-3" />}
          {children}
        </a>
      )

    case LinkType.FILE:
      return (
        <a
          href={effectiveLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClassName} ${linkStyles.file}`}
        >
          {showIcon && <File className="w-3 h-3" />}
          {children}
        </a>
      )

    case LinkType.CROSS_PROJECT:
      return (
        <Link
          to={effectiveLink.href}
          className={`${baseClassName} ${linkStyles.crossProject}`}
        >
          {showIcon && <FileText className="w-3 h-3" />}
          {children}
          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">
            {effectiveLink.projectCode || normalizedLink?.targetProject}
          </span>
        </Link>
      )

    case LinkType.UNKNOWN:
    default:
      return (
        <span className={`${baseClassName} ${linkStyles.broken}`}>
          {children}
        </span>
      )
  }
}

export default SmartLink
