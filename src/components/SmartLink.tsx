import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FileText, FileCode, Hash, File } from 'lucide-react';
import { ParsedLink, LinkType } from '../utils/linkProcessor';
import { buildTicketLink, buildDocumentLink } from '../utils/linkBuilder';
import { getLinkConfig } from '../config/linkConfig';

interface SmartLinkProps {
  link: ParsedLink;
  currentProject: string;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

const linkStyles = {
  external: 'text-blue-600 hover:underline external-link',
  ticket: 'text-purple-600 hover:underline ticket-link',
  document: 'text-green-600 hover:underline document-link',
  anchor: 'text-gray-600 hover:underline anchor-link',
  file: 'text-orange-600 hover:underline file-link',
  crossProject: 'text-indigo-600 hover:underline cross-project-link',
  broken: 'text-red-400 line-through broken-link'
};

const SmartLink: React.FC<SmartLinkProps> = ({ link, currentProject, children, className = '', showIcon = true }) => {
  // Force hot reload - showIcon should hide icons
  const baseClassName = showIcon 
    ? `inline-flex items-center gap-1 ${className}`
    : `inline ${className}`;

  const linkConfig = getLinkConfig();

  // If auto-linking is disabled, render as plain text
  if (!linkConfig.enableAutoLinking) {
    return <span className={className}>{children}</span>;
  }

  // Check specific link type configurations
  if (link.type === LinkType.TICKET && !linkConfig.enableTicketLinks) {
    return <span className={className}>{children}</span>;
  }

  if (link.type === LinkType.DOCUMENT && !linkConfig.enableDocumentLinks) {
    return <span className={className}>{children}</span>;
  }

  switch (link.type) {
    case LinkType.EXTERNAL:
      return (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClassName} ${linkStyles.external}`}
        >
          {children}
          {showIcon && <ExternalLink className="w-3 h-3" />}
        </a>
      );

    case LinkType.TICKET:
      return (
        <Link
          to={buildTicketLink(currentProject, link.ticketKey || '', link.anchor)}
          className={`${baseClassName} ${linkStyles.ticket}`}
        >
          {showIcon && <FileText className="w-3 h-3" />}
          {children}
        </Link>
      );

    case LinkType.DOCUMENT:
      return (
        <Link
          to={buildDocumentLink(currentProject, link.documentPath || '')}
          className={`${baseClassName} ${linkStyles.document}`}
        >
          {showIcon && <FileCode className="w-3 h-3" />}
          {children}
        </Link>
      );

    case LinkType.ANCHOR:
      return (
        <a
          href={link.href}
          className={`${baseClassName} ${linkStyles.anchor}`}
        >
          {showIcon && <Hash className="w-3 h-3" />}
          {children}
        </a>
      );

    case LinkType.FILE:
      return (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClassName} ${linkStyles.file}`}
        >
          {showIcon && <File className="w-3 h-3" />}
          {children}
        </a>
      );

    case LinkType.CROSS_PROJECT:
      return (
        <Link
          to={buildTicketLink(link.projectCode || '', link.ticketKey || '', link.anchor)}
          className={`${baseClassName} ${linkStyles.crossProject}`}
        >
          {showIcon && <FileText className="w-3 h-3" />}
          {children}
          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">
            {link.projectCode}
          </span>
        </Link>
      );

    case LinkType.UNKNOWN:
    default:
      return (
        <span className={`${baseClassName} ${linkStyles.broken}`}>
          {children}
        </span>
      );
  }
};

export default SmartLink;
