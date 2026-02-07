/**
 * EventBus - Centralized Event Management System
 *
 * This is the core of the new event architecture. All events flow through here.
 *
 * Benefits:
 * - Single source of truth for all events
 * - Type-safe event handling
 * - Easy to debug with event history
 * - Proper cleanup with unsubscribe functions
 */

import type { Project } from '@mdt/shared/models/Project'
import type { Ticket } from '../types'

/**
 * React hook for using event bus in components
 *
 * @param eventType - Type of event to listen for
 * @param handler - Event handler function
 * @param dependencies - Dependencies for useEffect
 * @param source - Optional source component name for debugging (auto-inferred if not provided)
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   useEventBus('ticket:created', (event) => {
 *     console.log('New ticket:', event.payload);
 *   }, [], 'MyComponent'); // source is optional
 *
 *   return <div>...</div>;
 * }
 * ```
 */
import { useEffect } from 'react'

export type EventType
  // Ticket events
  = | 'ticket:created'
    | 'ticket:updated'
    | 'ticket:deleted'
  // Project events
    | 'project:created'
    | 'project:changed'
    | 'project:deleted'
  // SSE connection events
    | 'sse:connected'
    | 'sse:disconnected'
    | 'sse:reconnected'
    | 'sse:error'
  // System events
    | 'error:api'
    | 'error:network'
    | 'system:refresh'

// Event payload types
interface _TicketEventPayload {
  ticketCode: string
  projectId: string
  ticket?: Ticket // Use proper Ticket type
}

interface _ProjectEventPayload {
  projectId: string
  project?: Project // Use proper Project type
}

interface _SSEEventPayload {
  url?: string
  error?: Error | unknown
  status?: string
}

interface _ErrorEventPayload {
  message: string
  error?: Error
  context?: Record<string, unknown>
}

// Generic event structure
export interface Event<T = unknown> {
  type: EventType
  payload: T
  timestamp: number
  source: 'sse' | 'ui' | 'api' | 'system'
  id: string // Unique event ID for tracking
}

// Event listener type
export type EventListener<T = unknown> = (event: Event<T>) => void

// Unsubscribe function type
type UnsubscribeFn = () => void

// Listener metadata for debugging
interface ListenerMetadata {
  handler: EventListener
  source: string // Component or hook name
  registeredAt: number
}

/**
 * EventBus class - singleton pattern
 */
class EventBus {
  private listeners = new Map<EventType, Set<EventListener>>()
  private listenerMetadata = new Map<EventType, Map<EventListener, ListenerMetadata>>() // Track metadata for dev tools
  private eventQueue: Event[] = []
  private eventIdCounter = 0
  private maxQueueSize = 100 // Keep last 100 events
  private errorCount = 0
  private maxErrors = 10 // Circuit breaker threshold
  private enableLogging = import.meta.env.DEV && !import.meta.env.VITE_DISABLE_EVENTBUS_LOGS

  /**
   * Subscribe to events of a specific type
   *
   * @param eventType - Type of event to listen for
   * @param handler - Function to call when event occurs
   * @param metadata - Optional metadata for debugging (source component name)
   * @param metadata.source - Source component name for debugging
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = eventBus.on('ticket:created', (event) => {
   *   console.log('New ticket:', event.payload.ticketCode);
   * }, { source: 'MyComponent' });
   *
   * // Later, when component unmounts:
   * unsubscribe();
   * ```
   */
  on<T = unknown>(
    eventType: EventType,
    handler: EventListener<T>,
    metadata?: { source?: string },
  ): UnsubscribeFn {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }

    const listeners = this.listeners.get(eventType)!
    listeners.add(handler as EventListener)

    // Store metadata for dev tools
    if (import.meta.env.DEV && metadata?.source) {
      if (!this.listenerMetadata.has(eventType)) {
        this.listenerMetadata.set(eventType, new Map())
      }
      this.listenerMetadata.get(eventType)!.set(handler as EventListener, {
        handler: handler as EventListener,
        source: metadata.source,
        registeredAt: Date.now(),
      })
    }

    if (this.enableLogging) {
      console.warn(`[EventBus] Subscribed to ${eventType}. Total listeners: ${listeners.size}${metadata?.source ? ` (source: ${metadata.source})` : ''}`)
    }

    // Return unsubscribe function
    return () => {
      listeners.delete(handler as EventListener)
      if (this.enableLogging) {
        console.warn(`[EventBus] Unsubscribed from ${eventType}. Remaining listeners: ${listeners.size}`)
      }

      // Clean up metadata
      if (import.meta.env.DEV && this.listenerMetadata.has(eventType)) {
        this.listenerMetadata.get(eventType)!.delete(handler as EventListener)
        if (this.listenerMetadata.get(eventType)!.size === 0) {
          this.listenerMetadata.delete(eventType)
        }
      }

      // Clean up empty listener sets
      if (listeners.size === 0) {
        this.listeners.delete(eventType)
      }
    }
  }

  /**
   * Emit an event to all subscribers
   *
   * @param eventType - Type of event to emit
   * @param payload - Event data
   * @param source - Source of the event (sse, ui, api, system)
   *
   * @example
   * ```typescript
   * eventBus.emit('ticket:created', {
   *   ticketCode: 'MDT-001',
   *   projectId: 'markdown-ticket'
   * }, 'ui');
   * ```
   */
  emit<T = unknown>(
    eventType: EventType,
    payload: T,
    source: Event['source'] = 'system',
  ): void {
    const event: Event<T> = {
      type: eventType,
      payload,
      timestamp: Date.now(),
      source,
      id: `evt_${++this.eventIdCounter}`,
    }

    // Log event for debugging
    if (this.enableLogging) {
      console.warn(`[EventBus] 📤 ${eventType}`, {
        id: event.id,
        source,
        payload,
        listenerCount: this.listeners.get(eventType)?.size || 0,
      })
    }

    // Add to event queue for debugging
    this.eventQueue.push(event)
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.shift() // Remove oldest event
    }

    // Notify all listeners
    const listeners = this.listeners.get(eventType)
    if (listeners && listeners.size > 0) {
      listeners.forEach((handler) => {
        try {
          handler(event)
        }
        catch (error) {
          console.error(`[EventBus] ❌ Error in listener for ${eventType}:`, error)
          this.errorCount++

          // Circuit breaker: prevent infinite error recursion
          if (!eventType.startsWith('error:') && this.errorCount < this.maxErrors) {
            this.emit('error:api', {
              message: `Event handler error for ${eventType}`,
              error: error as Error,
              context: { eventType, eventId: event.id },
            }, 'system')
          }
          else if (this.errorCount >= this.maxErrors) {
            console.error(`[EventBus] 🛑 Circuit breaker activated - too many errors (${this.errorCount})`)
          }
        }
      })
    }
    else if (this.enableLogging) {
      console.warn(`[EventBus] ⚠️ No listeners for ${eventType}`)
    }
  }

  /**
   * Get recent events for debugging
   *
   * @param count - Number of recent events to retrieve
   * @returns Array of recent events
   */
  getRecentEvents(count = 20): Event[] {
    return this.eventQueue.slice(-count)
  }

  /**
   * Get all events of a specific type from history
   *
   * @param eventType - Type of event to filter
   * @returns Array of events matching the type
   */
  getEventsByType(eventType: EventType): Event[] {
    return this.eventQueue.filter(e => e.type === eventType)
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventQueue = []
    if (this.enableLogging) {
      console.warn('[EventBus] Event history cleared')
    }
  }

  /**
   * Reset error count (circuit breaker)
   */
  resetErrorCount(): void {
    this.errorCount = 0
    if (this.enableLogging) {
      console.warn('[EventBus] Error count reset')
    }
  }

  /**
   * Get statistics about the event bus
   */
  getStats(): {
    totalListeners: number
    eventTypes: string[]
    totalEventsInQueue: number
    listenersByType: Record<string, number>
    errorCount: number
  } {
    const listenersByType: Record<string, number> = {}
    let totalListeners = 0

    this.listeners.forEach((listeners, eventType) => {
      listenersByType[eventType] = listeners.size
      totalListeners += listeners.size
    })

    return {
      totalListeners,
      eventTypes: Array.from(this.listeners.keys()),
      totalEventsInQueue: this.eventQueue.length,
      listenersByType,
      errorCount: this.errorCount,
    }
  }

  /**
   * Remove all listeners (use with caution)
   */
  removeAllListeners(): void {
    this.listeners.clear()
    if (this.enableLogging) {
      console.warn('[EventBus] All listeners removed')
    }
  }

  /**
   * Check if there are any listeners for an event type
   */
  hasListeners(eventType: EventType): boolean {
    const listeners = this.listeners.get(eventType)
    return listeners ? listeners.size > 0 : false
  }

  /**
   * Get listener count for a specific event type
   * @param eventType - Event type to get count for
   * @returns Number of listeners subscribed to this event type
   */
  getListenerCount(eventType: EventType): number {
    const listeners = this.listeners.get(eventType)
    return listeners ? listeners.size : 0
  }

  /**
   * Get listener details for a specific event type (dev tools only)
   * @param eventType - Event type to get listeners for
   * @returns Array of listener metadata (source, registeredAt, function details)
   */
  getListenersForType(eventType: EventType): Array<{
    source: string
    registeredAt: number
    functionName: string
    functionCode: string
    handler: EventListener
  }> {
    if (!import.meta.env.DEV)
      return []

    const listeners = this.listeners.get(eventType)
    if (!listeners)
      return []

    const metadata = this.listenerMetadata.get(eventType)

    return Array.from(listeners).map((handler) => {
      const meta = metadata?.get(handler)
      return {
        source: meta?.source || 'unknown',
        registeredAt: meta?.registeredAt || 0,
        functionName: handler.name || 'anonymous',
        functionCode: handler.toString(),
        handler, // Include reference to actual function
      }
    })
  }
}

// Export singleton instance
export const eventBus = new EventBus()

// Export class for testing

export function useEventBus<T = unknown>(
  eventType: EventType,
  handler: EventListener<T>,
  dependencies: unknown[] = [],
  source?: string,
): void {
  useEffect(() => {
    // Try to infer component name from the call stack if not provided
    let componentSource = source
    if (!componentSource && import.meta.env.DEV) {
      try {
        const stack = new Error('useEventBus stack trace').stack
        // Extract component name from stack trace (rough heuristic)
        const match = stack?.match(/at (\w+)/g)
        if (match && match.length > 2) {
          // Skip 'Error' and 'useEventBus', get the calling component
          componentSource = match[2]?.replace('at ', '') || 'unknown'
        }
      }
      catch {
        componentSource = 'unknown'
      }
    }

    const unsubscribe = eventBus.on(
      eventType,
      handler,
      componentSource ? { source: componentSource } : undefined,
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, ...dependencies])
}
