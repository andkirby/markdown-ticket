/**
 * EventHistory - Development Tool for Debugging Events
 *
 * This component displays recent events from the EventBus for debugging purposes.
 * Only renders in development mode.
 */

import type { Event } from '../../services/eventBus'
import { useEffect, useRef, useState } from 'react'
import { eventBus } from '../../services/eventBus'

interface EventItemProps {
  event: Event
}

interface EventHistoryProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** When true, both popup AND floating button are hidden */
  forceHidden?: boolean
}

export function EventHistory({ isOpen: controlledIsOpen, onOpenChange, forceHidden = false }: EventHistoryProps = {}) {
  const [events, setEvents] = useState<Event[]>([])
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [filter, setFilter] = useState<string>('')
  const isMountedRef = useRef(true)

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = onOpenChange || setInternalIsOpen

  // Update events periodically
  useEffect(() => {
    isMountedRef.current = true

    const updateEvents = () => {
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setEvents(eventBus.getRecentEvents(50))
        }
      })
    }

    updateEvents() // Initial load
    const interval = setInterval(updateEvents, 1000) // Update every second

    return () => {
      isMountedRef.current = false
      clearInterval(interval)
    }
  }, [])

  // Don't render in production
  if (import.meta.env.PROD) {
    return null
  }

  // When forceHidden is true, hide both popup AND floating button
  if (forceHidden) {
    return null
  }

  // Filter events
  const filteredEvents = filter
    ? events.filter(e =>
        e.type.toLowerCase().includes(filter.toLowerCase())
        || JSON.stringify(e.payload).toLowerCase().includes(filter.toLowerCase()),
      )
    : events

  // Get stats
  const stats = eventBus.getStats()

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-800 transition-colors z-50"
        title="Open Event History"
      >
        📡 Events (
        {events.length}
        )
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 w-[500px] h-96 bg-gray-900 text-white shadow-2xl flex flex-col z-50 border-t-2 border-blue-500">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h3 className="font-bold">📡 Event History</h3>
          <div className="text-xs text-gray-400">
            {stats.totalListeners}
            {' '}
            listeners |
            {filteredEvents.length}
            {' '}
            events
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => eventBus.clearHistory()}
            className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
          >
            Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 py-2 border-b border-gray-700">
        <input
          type="text"
          placeholder="Filter events..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {filteredEvents.length === 0
          ? (
              <div className="text-center text-gray-500 py-8">
                No events yet
              </div>
            )
          : (
              filteredEvents.map(event => (
                <EventItem key={event.id} event={event} />
              ))
            )}
      </div>

      {/* Stats Footer */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 text-xs text-gray-400">
        <details>
          <summary className="cursor-pointer hover:text-white">
            Listener Stats
          </summary>
          <div className="mt-2 space-y-1">
            {Object.entries(stats.listenersByType).map(([type, count]) => (
              <div key={type} className="flex justify-between">
                <span>{type}</span>
                <span className="text-blue-400">{count}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  )
}

function EventItem({ event }: EventItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Color based on event type
  const getEventColor = (type: string) => {
    if (type.startsWith('ticket:'))
      return 'text-green-400'
    if (type.startsWith('project:'))
      return 'text-blue-400'
    if (type.startsWith('sse:'))
      return 'text-purple-400'
    if (type.startsWith('error:'))
      return 'text-red-400'
    return 'text-yellow-400'
  }

  // Source badge color
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'sse': return 'bg-purple-600'
      case 'ui': return 'bg-blue-600'
      case 'api': return 'bg-green-600'
      default: return 'bg-gray-600'
    }
  }

  // Get listener information for this event type
  const listeners = eventBus.getListenersForType(event.type)
  const listenerCount = eventBus.getListenerCount(event.type)
  const [expandedListener, setExpandedListener] = useState<number | null>(null)

  // Format time relative to now
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60)
      return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60)
      return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const timeStr = new Date(event.timestamp).toLocaleTimeString()

  return (
    <div className="bg-gray-800 rounded px-3 py-2 text-xs">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className={`font-bold ${getEventColor(event.type)}`}>
            {event.type}
          </span>
          <span className={`px-2 py-0.5 rounded text-white text-[10px] ${getSourceColor(event.source)}`}>
            {event.source}
          </span>
          <span className="text-gray-500 text-[10px]">{timeStr}</span>
        </div>
        <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-gray-700 space-y-2">
          {/* Listener Information */}
          <div className="text-gray-400">
            <span className="text-gray-500">Listeners:</span>
            {' '}
            {listenerCount === 0
              ? (
                  <span className="text-yellow-400">0 subscribed</span>
                )
              : (
                  <span className="text-green-400">
                    (
                    {listenerCount}
                    )
                  </span>
                )}
          </div>
          {listeners.length > 0 && (
            <div className="ml-4 space-y-1">
              {listeners.map((listener, idx) => (
                <div key={listener.registeredAt} className="text-gray-400 text-[10px]">
                  <div
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 rounded px-1 py-0.5"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedListener(expandedListener === idx ? null : idx)
                    }}
                  >
                    <span className="text-gray-600">{expandedListener === idx ? '▼' : '▶'}</span>
                    <span className="text-gray-600">↳</span>
                    <span className="text-blue-400 font-mono">{listener.source}</span>
                    <span className="text-purple-400 font-mono">
                      {listener.functionName}
                      ()
                    </span>
                    <span className="text-gray-500">
                      (registered
                      {' '}
                      {formatTimeAgo(listener.registeredAt)}
                      )
                    </span>
                  </div>

                  {expandedListener === idx && (
                    <div className="mt-1 ml-6 p-2 bg-gray-900 rounded border border-gray-700">
                      <div className="text-gray-500 mb-1">Function Reference:</div>
                      <pre className="text-[9px] text-green-400 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                        {listener.functionCode}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Event ID */}
          <div className="text-gray-400">
            <span className="text-gray-500">ID:</span>
            {' '}
            {event.id}
          </div>

          {/* Payload */}
          <div className="text-gray-400">
            <span className="text-gray-500">Payload:</span>
          </div>
          <pre className="mt-1 text-gray-300 bg-gray-900 rounded p-2 overflow-auto max-h-32">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
