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

import { Ticket } from '../types';
import { Project } from '../../shared/models/Project';
export type EventType =
  // Ticket events
  | 'ticket:created'
  | 'ticket:updated'
  | 'ticket:deleted'
  // Project events
  | 'project:created'
  | 'project:changed'
  | 'project:deleted'
  // SSE connection events
  | 'sse:connected'
  | 'sse:disconnected'
  | 'sse:error'
  // System events
  | 'error:api'
  | 'error:network'
  | 'system:refresh';

// Event payload types
export interface TicketEventPayload {
  ticketCode: string;
  projectId: string;
  ticket?: Ticket; // Use proper Ticket type
}

export interface ProjectEventPayload {
  projectId: string;
  project?: Project; // Use proper Project type
}

export interface SSEEventPayload {
  url?: string;
  error?: any;
  status?: string;
}

export interface ErrorEventPayload {
  message: string;
  error?: Error;
  context?: Record<string, any>;
}

// Generic event structure
export interface Event<T = any> {
  type: EventType;
  payload: T;
  timestamp: number;
  source: 'sse' | 'ui' | 'api' | 'system';
  id: string; // Unique event ID for tracking
}

// Event listener type
export type EventListener<T = any> = (event: Event<T>) => void;

// Unsubscribe function type
export type UnsubscribeFn = () => void;

/**
 * EventBus class - singleton pattern
 */
class EventBus {
  private listeners = new Map<EventType, Set<EventListener>>();
  private eventQueue: Event[] = [];
  private eventIdCounter = 0;
  private maxQueueSize = 100; // Keep last 100 events
  private errorCount = 0;
  private maxErrors = 10; // Circuit breaker threshold

  /**
   * Subscribe to events of a specific type
   *
   * @param eventType - Type of event to listen for
   * @param handler - Function to call when event occurs
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = eventBus.on('ticket:created', (event) => {
   *   console.log('New ticket:', event.payload.ticketCode);
   * });
   *
   * // Later, when component unmounts:
   * unsubscribe();
   * ```
   */
  on<T = any>(eventType: EventType, handler: EventListener<T>): UnsubscribeFn {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;
    listeners.add(handler as EventListener);

    if (import.meta.env.DEV) {
      console.log(`[EventBus] Subscribed to ${eventType}. Total listeners: ${listeners.size}`);
    }

    // Return unsubscribe function
    return () => {
      listeners.delete(handler as EventListener);
      if (import.meta.env.DEV) {
        console.log(`[EventBus] Unsubscribed from ${eventType}. Remaining listeners: ${listeners.size}`);
      }

      // Clean up empty listener sets
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    };
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
  emit<T = any>(
    eventType: EventType,
    payload: T,
    source: Event['source'] = 'system'
  ): void {
    const event: Event<T> = {
      type: eventType,
      payload,
      timestamp: Date.now(),
      source,
      id: `evt_${++this.eventIdCounter}`
    };

    // Log event for debugging
    if (import.meta.env.DEV) {
      console.log(`[EventBus] 📤 ${eventType}`, {
        id: event.id,
        source,
        payload,
        listenerCount: this.listeners.get(eventType)?.size || 0
      });
    }

    // Add to event queue for debugging
    this.eventQueue.push(event);
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.shift(); // Remove oldest event
    }

    // Notify all listeners
    const listeners = this.listeners.get(eventType);
    if (listeners && listeners.size > 0) {
      listeners.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] ❌ Error in listener for ${eventType}:`, error);
          this.errorCount++;

          // Circuit breaker: prevent infinite error recursion
          if (!eventType.startsWith('error:') && this.errorCount < this.maxErrors) {
            this.emit('error:api', {
              message: `Event handler error for ${eventType}`,
              error: error as Error,
              context: { eventType, eventId: event.id }
            }, 'system');
          } else if (this.errorCount >= this.maxErrors) {
            console.error(`[EventBus] 🛑 Circuit breaker activated - too many errors (${this.errorCount})`);
          }
        }
      });
    } else {
      console.warn(`[EventBus] ⚠️ No listeners for ${eventType}`);
    }
  }

  /**
   * Get recent events for debugging
   *
   * @param count - Number of recent events to retrieve
   * @returns Array of recent events
   */
  getRecentEvents(count = 20): Event[] {
    return this.eventQueue.slice(-count);
  }

  /**
   * Get all events of a specific type from history
   *
   * @param eventType - Type of event to filter
   * @returns Array of events matching the type
   */
  getEventsByType(eventType: EventType): Event[] {
    return this.eventQueue.filter(e => e.type === eventType);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventQueue = [];
    console.log('[EventBus] Event history cleared');
  }

  /**
   * Reset error count (circuit breaker)
   */
  resetErrorCount(): void {
    this.errorCount = 0;
    console.log('[EventBus] Error count reset');
  }

  /**
   * Get statistics about the event bus
   */
  getStats(): {
    totalListeners: number;
    eventTypes: string[];
    totalEventsInQueue: number;
    listenersByType: Record<string, number>;
    errorCount: number;
  } {
    const listenersByType: Record<string, number> = {};
    let totalListeners = 0;

    this.listeners.forEach((listeners, eventType) => {
      listenersByType[eventType] = listeners.size;
      totalListeners += listeners.size;
    });

    return {
      totalListeners,
      eventTypes: Array.from(this.listeners.keys()),
      totalEventsInQueue: this.eventQueue.length,
      listenersByType,
      errorCount: this.errorCount
    };
  }

  /**
   * Remove all listeners (use with caution)
   */
  removeAllListeners(): void {
    this.listeners.clear();
    console.log('[EventBus] All listeners removed');
  }

  /**
   * Check if there are any listeners for an event type
   */
  hasListeners(eventType: EventType): boolean {
    const listeners = this.listeners.get(eventType);
    return listeners ? listeners.size > 0 : false;
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Export class for testing
export { EventBus };

/**
 * React hook for using event bus in components
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   useEventBus('ticket:created', (event) => {
 *     console.log('New ticket:', event.payload);
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
import { useEffect } from 'react';

export function useEventBus<T = any>(
  eventType: EventType,
  handler: EventListener<T>,
  dependencies: any[] = []
): void {
  useEffect(() => {
    const unsubscribe = eventBus.on(eventType, handler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, ...dependencies]);
}
