import type { Ticket } from '../types'
import * as React from 'react'
import TicketAttributeTags from './TicketAttributeTags'
import { TicketCode } from './TicketCode'

interface TicketCardProps {
  ticket: Ticket
  onMove: (newStatus: string) => void
  onEdit: () => void
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onEdit }) => {
  return (
    <div
      className="group ticket-card bg-gradient-to-br from-white to-gray-50/80 dark:from-slate-800 dark:to-slate-900/80 border border-gray-200/50 dark:border-slate-700/50 rounded-xl px-3 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 hover:scale-[1.005] transition-all duration-300 ease-out cursor-pointer backdrop-blur-sm"
      onClick={onEdit}
      data-testid="ticket-card"
      data-ticket-key={ticket.code}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="ticket-title font-semibold text-gray-900 dark:text-white text-sm">
          <TicketCode code={ticket.code} />
          {' '}
          •
          {ticket.title}
        </h4>
      </div>

      <div className="flex items-center justify-between">
        <TicketAttributeTags ticket={ticket} />

        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 ease-out"
            title="Edit ticket"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  )
}

export default TicketCard
