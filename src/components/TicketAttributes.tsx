import type { Ticket } from '../types'
import { CRType } from '@mdt/domain-contracts'
import * as React from 'react'
import { useParams } from 'react-router-dom'
import { UI_LABELS } from '../config'
import { buildTicketLink } from '../utils/linkBuilder'
import { classifyLink } from '../utils/linkProcessor'
import SmartLink from './SmartLink'
import { Badge } from './UI/badge'

interface TicketAttributesProps {
  ticket: Ticket
  className?: string
}

const TicketAttributes: React.FC<TicketAttributesProps> = ({ ticket, className = '' }) => {
  const { projectCode } = useParams<{ projectCode: string }>()

  const formatDate = (date: Date | string | null) => {
    if (!date)
      return 'N/A'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (Number.isNaN(dateObj.getTime()))
      return 'Invalid Date'
    return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  // Helper function to render ticket references as links
  const renderTicketLinks = (tickets: string[]) => {
    return tickets.map((ticketRef, index) => {
      // Extract clean ticket code from strings like "CR-A017 (Service Provider Architecture)"
      const ticketCodeMatch = ticketRef.match(/^([A-Z]+-\d+)/)
      const cleanTicketCode = ticketCodeMatch ? ticketCodeMatch[1] : ticketRef
      // Use centralized link builder
      const fullTicketUrl = buildTicketLink(projectCode || '', cleanTicketCode)
      const parsedLink = classifyLink(fullTicketUrl, projectCode || '')
      return (
        <React.Fragment key={ticketRef}>
          {index > 0 && ', '}
          <SmartLink
            link={parsedLink}
            currentProject={projectCode || ''}
            className="hover:underline"
            showIcon={false}
          >
            {cleanTicketCode}
          </SmartLink>
        </React.Fragment>
      )
    })
  }

  const _formatArray = (arr: string[]) => {
    return arr.length > 0 ? arr.join(', ') : 'None'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700'
      case 'Medium':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700'
      case 'Low':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700'
      default:
        return 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
    }
  }

  const getTypeColor = (type: string) => {
    // UI-specific color mapping derived from domain-contracts CRType values
    const colors: Record<string, string> = {
      [CRType.BUG_FIX]: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700',
      [CRType.FEATURE_ENHANCEMENT]: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700',
      [CRType.TECHNICAL_DEBT]: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700',
      [CRType.ARCHITECTURE]: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700',
      [CRType.DOCUMENTATION]: 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-700',
      [CRType.RESEARCH]: 'bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-700',
    }
    return colors[type] || 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Proposed':
        return 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
      case 'Approved':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700'
      case 'In Progress':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700'
      case 'Implemented':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700'
      case 'Rejected':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700'
      default:
        return 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Key Attributes as Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={getStatusColor(ticket.status)}>
          {ticket.status}
        </Badge>
        <Badge variant="outline" className={getTypeColor(ticket.type)}>
          {ticket.type}
        </Badge>
        <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
          {ticket.priority}
        </Badge>
        {ticket.phaseEpic && (
          <Badge variant="outline" className="bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700">
            {ticket.phaseEpic}
          </Badge>
        )}
        {ticket.assignee && (
          <Badge variant="outline" className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700">
            👤
            {' '}
            {ticket.assignee}
          </Badge>
        )}
        {/* MDT-095: Worktree Badge */}
        {ticket.inWorktree === true && (
          <Badge
            variant="outline"
            className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 backdrop-blur-sm"
            title={ticket.worktreePath ? `Worktree: ${ticket.worktreePath}` : 'Ticket in git worktree'}
            data-testid="worktree-badge"
          >
            {UI_LABELS.WORKTREE_BADGE}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
          <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.dateCreated)}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Modified</dt>
          <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.lastModified)}</dd>
        </div>
        {ticket.implementationDate && (
          <>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Implementation Date</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.implementationDate)}</dd>
            </div>
            <div></div>
          </>
        )}
      </div>

      {((ticket.relatedTickets?.length || 0) > 0 || (ticket.dependsOn?.length || 0) > 0 || (ticket.blocks?.length || 0) > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Relationships</h4>
          <div className="flex flex-wrap gap-2">
            {(ticket.relatedTickets?.length || 0) > 0 && (
              <Badge variant="outline" className="bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700" title={`Related: ${ticket.relatedTickets.join(', ')}`}>
                🔗
                {' '}
                {renderTicketLinks(ticket.relatedTickets)}
              </Badge>
            )}
            {(ticket.dependsOn?.length || 0) > 0 && (
              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700" title={`Depends on: ${ticket.dependsOn.join(', ')}`}>
                ⬅️
                {' '}
                {renderTicketLinks(ticket.dependsOn)}
              </Badge>
            )}
            {(ticket.blocks?.length || 0) > 0 && (
              <Badge variant="outline" className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700" title={`Blocks: ${ticket.blocks.join(', ')}`}>
                ➡️
                {' '}
                {renderTicketLinks(ticket.blocks)}
              </Badge>
            )}
          </div>
        </div>
      )}

      {(ticket.description || ticket.rationale || ticket.implementationNotes) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Details</h4>
          <div className="space-y-2">
            {ticket.description && (
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.description}</dd>
              </div>
            )}
            {ticket.rationale && (
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Rationale</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.rationale}</dd>
              </div>
            )}
            {ticket.implementationNotes && (
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Implementation Notes</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.implementationNotes}</dd>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TicketAttributes
