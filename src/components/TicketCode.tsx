import type { Ticket } from '../types/ticket'
import * as React from 'react'
import { WORKTREE_ICON } from '../config'

interface TicketCodeProps {
  code: string
  className?: string
  ticket?: Ticket // Optional ticket for worktree status
}

export const TicketCode: React.FC<TicketCodeProps> = ({ code, className = '', ticket }) => {
  const inWorktree = ticket?.inWorktree === true
  return (
    <span className={`font-medium text-primary dark:text-blue-400 ${className}`}>
      {code}
      {inWorktree && ` ${WORKTREE_ICON}`}
    </span>
  )
}
