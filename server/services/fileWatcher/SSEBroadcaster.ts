import type { Ticket } from '@mdt/domain-contracts'
import { EventEmitter } from 'node:events'

/** SSE event type for client communication. */
export interface SSEEvent {
  type: string
  data: unknown
}

/** Ticket metadata extracted from frontmatter. */
export type TicketData = Partial<Pick<Ticket, 'code' | 'title' | 'status' | 'type' | 'priority'>> & {
  lastModified?: string
}

/** File change event data structure. */
export interface FileChangeEvent {
  type: 'file-change'
  data: {
    eventType: string
    filename: string
    projectId: string
    timestamp: number
    ticketData?: TicketData
    /** MDT-142: Subdocument metadata for targeted UI updates */
    subdocument?: {
      code: string
      filePath: string
    } | null
    /** MDT-142: Source attribution for main vs worktree events */
    source?: 'main' | 'worktree'
  }
}

/** Response-like object for SSE client connections. */
export interface ResponseLike {
  write: (data: string) => void
  on: (event: string, callback: (...args: unknown[]) => void) => void
  headersSent: boolean
  destroyed?: boolean
  closed?: boolean
  end?: () => void
  mdtSseScope?: {
    canWrite: boolean
    projectRefs: string[]
  }
}

/**
 * SSEBroadcaster manages Server-Sent Events client lifecycle and broadcasting.
 * Constraints: Max 150 lines (C-2.3), Debounce: 100ms (C-2.5), Heartbeat: 30s (C-2.6)
 */
export class SSEBroadcaster extends EventEmitter {
  private clients: Set<ResponseLike> = new Set()
  private eventQueue: SSEEvent[] = []
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()

  addClient(response: ResponseLike): void {
    this.clients.add(response)
    response.on('close', () => this.removeClient(response))
    response.on('error', () => this.removeClient(response))
  }

  removeClient(response: ResponseLike): void {
    this.clients.delete(response)
  }

  disconnectReadOnlyClients(): void {
    this.clients.forEach((client) => {
      if (!client.mdtSseScope || client.mdtSseScope.canWrite) {
        return
      }

      try {
        client.end?.()
      }
      catch {
        // Ignore disconnect cleanup errors.
      }
      this.removeClient(client)
    })
  }

  sendSSEEvent(response: ResponseLike, event: SSEEvent): void {
    response.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  broadcast(event: SSEEvent): void {
    this.eventQueue.push(event)
    if (this.eventQueue.length > 50)
      this.eventQueue = this.eventQueue.slice(-50)

    const staleClients: ResponseLike[] = []
    this.clients.forEach((client) => {
      try {
        if (client.destroyed || client.closed)
          staleClients.push(client)
        else if (canClientReceiveEvent(client, event))
          this.sendSSEEvent(client, event)
      }
      catch {
        staleClients.push(client)
      }
    })

    staleClients.forEach(client => this.removeClient(client))
    this.emit('broadcast', event)
  }

  debouncedBroadcast(key: string, fn: () => void, delay = 100): void {
    if (this.debounceTimers.has(key))
      clearTimeout(this.debounceTimers.get(key)!)
    const timer = setTimeout(() => {
      this.debounceTimers.delete(key)
      fn()
    }, delay)
    this.debounceTimers.set(key, timer)
  }

  startHeartbeat(intervalMs = 30000): void {
    setInterval(() => {
      const heartbeatEvent: SSEEvent = { type: 'heartbeat', data: { timestamp: Date.now() } }
      this.clients.forEach((client) => {
        try {
          if (client.destroyed || client.closed) {
            this.removeClient(client)
            return
          }
          if (!client.headersSent)
            this.sendSSEEvent(client, heartbeatEvent)
        }
        catch {
          this.removeClient(client)
        }
      })
    }, intervalMs)
  }

  getClientCount(): number {
    return this.clients.size
  }

  getEventQueue(): SSEEvent[] {
    return [...this.eventQueue]
  }

  stop(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
    this.clients.forEach((client) => {
      try {
        if (!client.headersSent && client.end)
          client.end()
      }
      catch {
        // Ignore cleanup errors
      }
    })
    this.clients.clear()
    this.eventQueue = []
  }
}

function canClientReceiveEvent(client: ResponseLike, event: SSEEvent): boolean {
  const scope = client.mdtSseScope
  if (!scope || scope.canWrite) {
    return true
  }

  const projectId = extractProjectId(event)
  if (!projectId) {
    return true
  }

  return scope.projectRefs.includes(projectId)
}

function extractProjectId(event: SSEEvent): string | null {
  if (!event.data || typeof event.data !== 'object') {
    return null
  }

  const projectId = (event.data as { projectId?: unknown }).projectId
  return typeof projectId === 'string' ? projectId : null
}
