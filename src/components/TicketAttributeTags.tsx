import type { Ticket } from '../types'
import { CRType } from '@mdt/domain-contracts'
import * as React from 'react'
import { useParams } from 'react-router-dom'
import { classifyLink } from '../utils/linkProcessor'
import SmartLink from './SmartLink'
import { Badge } from './UI/badge'

interface TicketAttributeTagsProps {
  ticket: Ticket
  className?: string
}

const TicketAttributeTags: React.FC<TicketAttributeTagsProps> = ({ ticket, className = '' }) => {
  const { projectCode } = useParams<{ projectCode: string }>()

  // Helper function to render ticket references as links
  const renderTicketLinks = (tickets: string[]) => {
    return tickets.map((ticketRef, index) => {
      const parsedLink = classifyLink(ticketRef, projectCode || '')
      return (
        <React.Fragment key={ticketRef}>
          {index > 0 && ', '}
          <SmartLink
            link={parsedLink}
            currentProject={projectCode || ''}
            className="hover:underline"
            showIcon={false}
          >
            {ticketRef}
          </SmartLink>
        </React.Fragment>
      )
    })
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      High: 'bg-gradient-to-r from-rose-50 to-rose-100/80 text-rose-700 border-rose-200/60 shadow-sm',
      Medium: 'bg-gradient-to-r from-amber-50 to-amber-100/80 text-amber-700 border-amber-200/60 shadow-sm',
      Low: 'bg-gradient-to-r from-emerald-50 to-emerald-100/80 text-emerald-700 border-emerald-200/60 shadow-sm',
      Critical: 'bg-gradient-to-r from-red-100 to-rose-200 text-red-900 border-red-300 shadow-md',
    }
    return colors[priority] || colors.Low
  }

  const getTypeColor = (type: string) => {
    // UI-specific color mapping derived from domain-contracts CRType values
    const colors: Record<string, string> = {
      [CRType.FEATURE_ENHANCEMENT]: 'bg-gradient-to-r from-blue-50 to-indigo-100/80 text-blue-700 border-blue-200/60 shadow-sm',
      [CRType.BUG_FIX]: 'bg-gradient-to-r from-orange-50 to-amber-100/80 text-orange-700 border-orange-200/60 shadow-sm',
      [CRType.ARCHITECTURE]: 'bg-gradient-to-r from-purple-50 to-violet-100/80 text-purple-700 border-purple-200/60 shadow-sm',
      [CRType.TECHNICAL_DEBT]: 'bg-gradient-to-r from-slate-50 to-gray-100/80 text-slate-700 border-slate-200/60 shadow-sm',
      [CRType.DOCUMENTATION]: 'bg-gradient-to-r from-cyan-50 to-teal-100/80 text-cyan-700 border-cyan-200/60 shadow-sm',
      [CRType.RESEARCH]: 'bg-gradient-to-r from-pink-50 to-rose-100/80 text-pink-700 border-pink-200/60 shadow-sm',
    }
    return colors[type] || 'bg-gradient-to-r from-gray-50 to-slate-100/80 text-gray-700 border-gray-200/60 shadow-sm'
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
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Badge variant="outline" className={`${getStatusColor(ticket.status)} backdrop-blur-sm`}>
        {ticket.status}
      </Badge>
      <Badge variant="outline" className={`${getPriorityColor(ticket.priority)} backdrop-blur-sm`}>
        {ticket.priority}
      </Badge>
      <Badge variant="outline" className={`${getTypeColor(ticket.type || 'Unknown')} backdrop-blur-sm`}>
        {ticket.type || 'Unknown'}
      </Badge>
      {ticket.phaseEpic && (
        <Badge variant="outline" className="bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700">
          {ticket.phaseEpic}
        </Badge>
      )}
      {ticket.relatedTickets && ticket.relatedTickets.length > 0 && (
        <Badge variant="outline" className="bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700" title={`Related: ${ticket.relatedTickets.join(', ')}`}>
          🔗
          {' '}
          {renderTicketLinks(ticket.relatedTickets)}
        </Badge>
      )}
      {ticket.dependsOn && ticket.dependsOn.length > 0 && (
        <Badge variant="outline" className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700" title={`Depends on: ${ticket.dependsOn.join(', ')}`}>
          ⬅️
          {' '}
          {renderTicketLinks(ticket.dependsOn)}
        </Badge>
      )}
      {ticket.blocks && ticket.blocks.length > 0 && (
        <Badge variant="outline" className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700" title={`Blocks: ${ticket.blocks.join(', ')}`}>
          ➡️
          {' '}
          {renderTicketLinks(ticket.blocks)}
        </Badge>
      )}
    </div>
  )
}

export default TicketAttributeTags
