/**
 * QuickSearchModal - Modal overlay for quick ticket search
 * MDT-136: Cmd+K Quick Search for Tickets
 *
 * @testid quick-search-modal — modal overlay container
 */

import type { Ticket } from '@/types/ticket'
import { useCallback, useEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { useQuickSearch } from '@/hooks/useQuickSearch'

import { QuickSearchInput } from './QuickSearchInput'
import { QuickSearchResults } from './QuickSearchResults'

export interface QuickSearchModalProps {
  isOpen: boolean
  onClose: () => void
  tickets: Ticket[]
  onSelectTicket: (ticket: Ticket) => void
}

export function QuickSearchModal({ isOpen, onClose, tickets, onSelectTicket }: QuickSearchModalProps): React.ReactElement | null {
  const [query, setQuery] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  const { filteredTickets, selectedIndex, setSelectedIndex, handleKeyDown: handleSearchKeyDown } = useQuickSearch({ tickets, query })

  // Reset query when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen, setSelectedIndex])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredTickets.length > 0) {
      const selectedTicket = filteredTickets[selectedIndex]
      if (selectedTicket) {
        onSelectTicket(selectedTicket)
        onClose()
      }
    }
    else {
      handleSearchKeyDown(e)
    }
  }, [filteredTickets, selectedIndex, onSelectTicket, onClose, handleSearchKeyDown])

  const handleSelectTicket = useCallback((ticket: Ticket) => {
    onSelectTicket(ticket)
    onClose()
  }, [onSelectTicket, onClose])

  if (!isOpen) {
    return null
  }

  const modalContent = (
    <div className="fixed inset-0 z-50" data-testid="quick-search-modal">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal container */}
      <div className="flex min-h-screen items-start justify-center pt-[15vh] pointer-events-none">
        <div
          ref={modalRef}
          className="pointer-events-auto relative w-full max-w-[900px] mx-4 bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <QuickSearchInput
              value={query}
              onChange={setQuery}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Results */}
          <QuickSearchResults
            tickets={filteredTickets}
            selectedIndex={selectedIndex}
            onSelect={handleSelectTicket}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
