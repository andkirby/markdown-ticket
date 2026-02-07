/**
 * SSEClient - Server-Sent Events Connection Manager
 *
 * Responsibilities:
 * - Maintain SSE connection to backend
 * - Map SSE events to EventBus events
 * - Handle reconnection with exponential backoff
 * - Clean separation: ONLY handles SSE, no business logic
 */

import { eventBus } from './eventBus'

interface SSEMessageData {
  type: string
  data: {
    eventType?: 'add' | 'change' | 'unlink'
    filename?: string
    projectId?: string
    timestamp?: number
    status?: string
    ticketData?: {
      code: string
      title: string
      status: string
      type: string
      priority: string
      lastModified: string
    } | null
    eventId?: string
    source?: string
    [key: string]: unknown
  }
}

// Type guards for SSE message validation
function isValidSSEMessage(data: unknown): data is SSEMessageData {
  return (
    data !== null
    && typeof data === 'object'
    && 'type' in data
    && typeof data.type === 'string'
    && 'data' in data
    && data.data !== null
    && typeof data.data === 'object'
  )
}

function _isValidFileChangeData(data: unknown): boolean {
  return (
    data !== null
    && typeof data === 'object'
    && 'eventType' in data
    && 'filename' in data
    && typeof data.eventType === 'string'
    && typeof data.filename === 'string'
  )
}

class SSEClient {
  private eventSource: EventSource | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private url: string = ''
  private isConnected = false

  // Event deduplication tracking
  private processedEventIds = new Set<string>()
  private readonly EVENT_ID_CACHE_SIZE = 100 // Keep last 100 event IDs
  private readonly EVENT_ID_CACHE_DURATION_MS = 5000 // 5 seconds
  private eventIdTimestamps = new Map<string, number>()

  /**
   * Connect to SSE endpoint
   *
   * @param url - SSE endpoint URL (default: /api/events)
   */
  connect(url: string = '/api/events'): void {
    // Close existing connection
    if (this.eventSource) {
      console.warn('[SSEClient] Closing existing connection')
      this.disconnect()
    }

    this.url = url
    const fullUrl = this.getFullUrl(url)

    if (import.meta.env.DEV) {
      console.warn('[SSEClient] 🔌 Connecting to:', fullUrl)
    }

    try {
      this.eventSource = new EventSource(fullUrl)

      // Connection opened
      this.eventSource.onopen = () => {
        console.warn('[SSEClient] ✅ Connection established')
        this.isConnected = true

        // Check if this was a reconnection (not initial connection)
        const wasReconnection = this.reconnectAttempts > 0
        this.reconnectAttempts = 0

        // Emit connection event
        eventBus.emit('sse:connected', { url: fullUrl }, 'sse')

        // Emit reconnection event if applicable
        if (wasReconnection) {
          console.warn('[SSEClient] 🔄 SSE reconnected, triggering sync')
          eventBus.emit('sse:reconnected', { timestamp: Date.now() }, 'sse')
        }
      }

      // Message received
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (!isValidSSEMessage(data)) {
            console.error('[SSEClient] ❌ Invalid SSE message format:', data)
            return
          }

          this.handleSSEMessage(data)
        }
        catch (error) {
          console.error('[SSEClient] ❌ Error parsing message:', error)
          eventBus.emit('sse:error', {
            error,
            message: 'Failed to parse SSE message',
          }, 'sse')
        }
      }

      // Connection error
      this.eventSource.onerror = (error) => {
        console.error('[SSEClient] ❌ Connection error:', error)
        this.isConnected = false

        eventBus.emit('sse:disconnected', { error }, 'sse')

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
        else {
          console.error('[SSEClient] 🛑 Max reconnection attempts reached')
          eventBus.emit('sse:error', {
            error,
            message: `Max reconnection attempts (${this.maxReconnectAttempts}) reached`,
          }, 'sse')
        }
      }
    }
    catch (error) {
      console.error('[SSEClient] ❌ Failed to create EventSource:', error)
      eventBus.emit('sse:error', {
        error,
        message: 'Failed to create SSE connection',
      }, 'sse')
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.eventSource) {
      console.warn('[SSEClient] 🔌 Disconnecting')
      this.eventSource.close()
      this.eventSource = null
      this.isConnected = false

      eventBus.emit('sse:disconnected', { reason: 'manual' }, 'sse')
    }
  }

  /**
   * Check if SSE is connected
   */
  isSSEConnected(): boolean {
    return this.isConnected && this.eventSource?.readyState === EventSource.OPEN
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    isConnected: boolean
    reconnectAttempts: number
    url: string
    readyState: number | null
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      url: this.url,
      readyState: this.eventSource?.readyState ?? null,
    }
  }

  /**
   * Handle incoming SSE messages and map to EventBus events
   */
  private handleSSEMessage(data: SSEMessageData): void {
    // Check for duplicate events using eventId if available
    if (data.data.eventId) {
      if (this.isDuplicateEvent(data.data.eventId)) {
        console.warn(`[SSEClient] 🔁 [DEDUPE] Skipping duplicate event: ${data.type} (ID: ${data.data.eventId})`)
        return
      }
      this.markEventProcessed(data.data.eventId)
    }

    switch (data.type) {
      case 'connection':
        console.warn('[SSEClient] Connection confirmed:', data.data.status)
        break

      case 'heartbeat':
        // Silent heartbeat - connection alive
        console.warn('[SSEClient] 💓 Heartbeat received')
        break

      case 'file-change':
        this.handleFileChange(data.data)
        break

      case 'project-created':
        if (!import.meta.env.VITE_DISABLE_EVENTBUS_LOGS) {
          console.warn('[SSEClient] 📁 Project created:', data.data)
        }
        eventBus.emit('project:created', {
          projectId: data.data.projectId || '',
          project: data.data,
        }, 'sse')
        break

      case 'project-deleted':
        if (!import.meta.env.VITE_DISABLE_EVENTBUS_LOGS) {
          console.warn(`[SSEClient] 🗑️ Project deleted: ${data.data.projectId} (eventId: ${data.data.eventId}, source: ${data.data.source})`)
        }
        eventBus.emit('project:deleted', {
          projectId: data.data.projectId || '',
          timestamp: data.data.timestamp,
        }, 'sse')
        break

      default:
        console.warn('[SSEClient] ⚠️ Unknown message type:', data.type)
    }
  }

  /**
   * Check if event has already been processed
   */
  private isDuplicateEvent(eventId: string): boolean {
    return this.processedEventIds.has(eventId)
  }

  /**
   * Mark event as processed and clean up old entries
   */
  private markEventProcessed(eventId: string): void {
    const now = Date.now()

    // Add to processed set
    this.processedEventIds.add(eventId)
    this.eventIdTimestamps.set(eventId, now)

    // Clean up old event IDs
    if (this.processedEventIds.size > this.EVENT_ID_CACHE_SIZE) {
      // Remove oldest entries
      const sortedByTime = Array.from(this.eventIdTimestamps.entries())
        .sort((a, b) => a[1] - b[1])

      const toRemove = sortedByTime.slice(0, this.processedEventIds.size - this.EVENT_ID_CACHE_SIZE)
      toRemove.forEach(([id]) => {
        this.processedEventIds.delete(id)
        this.eventIdTimestamps.delete(id)
      })
    }

    // Also clean up by time
    for (const [id, timestamp] of this.eventIdTimestamps.entries()) {
      if (now - timestamp > this.EVENT_ID_CACHE_DURATION_MS) {
        this.processedEventIds.delete(id)
        this.eventIdTimestamps.delete(id)
      }
    }
  }

  /**
   * Handle file change events and map to ticket events
   */
  private handleFileChange(data: SSEMessageData['data']): void {
    const { eventType, filename, projectId, ticketData } = data

    if (!filename || !eventType) {
      console.warn('[SSEClient] ⚠️ Invalid file change data:', data)
      return
    }

    // Extract ticket code from filename
    const ticketCode = filename.replace('.md', '')

    console.warn('[SSEClient] 📝 File change detected:', {
      eventType,
      ticketCode,
      projectId,
      hasTicketData: !!ticketData,
    })

    // Map file system events to business events with ticket data
    switch (eventType) {
      case 'add':
        eventBus.emit('ticket:created', {
          ticketCode,
          projectId: projectId || '',
          ticket: ticketData,
        }, 'sse')
        break

      case 'change':
        eventBus.emit('ticket:updated', {
          ticketCode,
          projectId: projectId || '',
          ticket: ticketData,
        }, 'sse')
        break

      case 'unlink':
        eventBus.emit('ticket:deleted', {
          ticketCode,
          projectId: projectId || '',
        }, 'sse')
        break

      default:
        console.warn('[SSEClient] ⚠️ Unknown file event type:', eventType)
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
    const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 30000)

    console.warn(
      `[SSEClient] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.url)
    }, delay)
  }

  /**
   * Get full URL for SSE endpoint
   */
  private getFullUrl(path: string): string {
    // Use backend URL from environment variable or fall back to same origin
    const backendUrl = import.meta.env.VITE_BACKEND_URL || ''

    if (typeof window === 'undefined') {
      // SSR context - use backend URL or fallback to localhost
      return backendUrl ? `${backendUrl}${path}` : `http://localhost:3001${path}`
    }

    // If backend URL is explicitly configured, use it
    if (backendUrl) {
      return `${backendUrl}${path}`
    }

    // Check if we're in Docker environment by looking at port
    const currentPort = window.location.port

    // In Docker environment (port 5174), use same origin to go through Vite proxy
    // In local development (port 5173), use same origin to go through Vite proxy
    // The Vite proxy will handle routing /api requests to the backend
    if (currentPort === '5173' || currentPort === '5174') {
      return `${window.location.origin}${path}`
    }

    // In development with same host but different port, use backend port
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://localhost:3001${path}`
    }

    // In production or other environments, use same origin (goes through Vite proxy)
    return `${window.location.origin}${path}`
  }
}

// Export singleton instance
const sseClient = new SSEClient()

// Auto-connect on module load (can be disabled if needed)
if (typeof window !== 'undefined') {
  sseClient.connect()
}
