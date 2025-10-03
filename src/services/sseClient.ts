/**
 * SSEClient - Server-Sent Events Connection Manager
 *
 * Responsibilities:
 * - Maintain SSE connection to backend
 * - Map SSE events to EventBus events
 * - Handle reconnection with exponential backoff
 * - Clean separation: ONLY handles SSE, no business logic
 */

import { eventBus } from './eventBus';

interface SSEMessageData {
  type: string;
  data: {
    eventType?: 'add' | 'change' | 'unlink';
    filename?: string;
    projectId?: string;
    timestamp?: number;
    status?: string;
    [key: string]: any;
  };
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string = '';
  private isConnected = false;

  /**
   * Connect to SSE endpoint
   *
   * @param url - SSE endpoint URL (default: /api/events)
   */
  connect(url: string = '/api/events'): void {
    // Close existing connection
    if (this.eventSource) {
      console.log('[SSEClient] Closing existing connection');
      this.disconnect();
    }

    this.url = url;
    const fullUrl = this.getFullUrl(url);

    console.log('[SSEClient] 🔌 Connecting to:', fullUrl);

    try {
      this.eventSource = new EventSource(fullUrl);

      // Connection opened
      this.eventSource.onopen = () => {
        console.log('[SSEClient] ✅ Connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Emit connection event
        eventBus.emit('sse:connected', { url: fullUrl }, 'sse');
      };

      // Message received
      this.eventSource.onmessage = (event) => {
        try {
          const data: SSEMessageData = JSON.parse(event.data);
          console.log('[SSEClient] 📨 Message received:', data);

          this.handleSSEMessage(data);
        } catch (error) {
          console.error('[SSEClient] ❌ Error parsing message:', error);
          eventBus.emit('sse:error', {
            error,
            message: 'Failed to parse SSE message'
          }, 'sse');
        }
      };

      // Connection error
      this.eventSource.onerror = (error) => {
        console.error('[SSEClient] ❌ Connection error:', error);
        this.isConnected = false;

        eventBus.emit('sse:disconnected', { error }, 'sse');

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          console.error('[SSEClient] 🛑 Max reconnection attempts reached');
          eventBus.emit('sse:error', {
            error,
            message: `Max reconnection attempts (${this.maxReconnectAttempts}) reached`
          }, 'sse');
        }
      };

    } catch (error) {
      console.error('[SSEClient] ❌ Failed to create EventSource:', error);
      eventBus.emit('sse:error', {
        error,
        message: 'Failed to create SSE connection'
      }, 'sse');
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      console.log('[SSEClient] 🔌 Disconnecting');
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;

      eventBus.emit('sse:disconnected', { reason: 'manual' }, 'sse');
    }
  }

  /**
   * Check if SSE is connected
   */
  isSSEConnected(): boolean {
    return this.isConnected && this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    isConnected: boolean;
    reconnectAttempts: number;
    url: string;
    readyState: number | null;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      url: this.url,
      readyState: this.eventSource?.readyState ?? null
    };
  }

  /**
   * Handle incoming SSE messages and map to EventBus events
   */
  private handleSSEMessage(data: SSEMessageData): void {
    switch (data.type) {
      case 'connection':
        console.log('[SSEClient] Connection confirmed:', data.data.status);
        break;

      case 'heartbeat':
        // Silent heartbeat - connection alive
        console.debug('[SSEClient] 💓 Heartbeat received');
        break;

      case 'file-change':
        this.handleFileChange(data.data);
        break;

      case 'project-created':
        console.log('[SSEClient] 📁 Project created:', data.data);
        eventBus.emit('project:created', {
          projectId: data.data.projectId || '',
          project: data.data
        }, 'sse');
        break;

      default:
        console.warn('[SSEClient] ⚠️ Unknown message type:', data.type);
    }
  }

  /**
   * Handle file change events and map to ticket events
   */
  private handleFileChange(data: SSEMessageData['data']): void {
    const { eventType, filename, projectId } = data;

    if (!filename || !eventType) {
      console.warn('[SSEClient] ⚠️ Invalid file change data:', data);
      return;
    }

    // Extract ticket code from filename
    const ticketCode = filename.replace('.md', '');

    console.log('[SSEClient] 📝 File change detected:', {
      eventType,
      ticketCode,
      projectId
    });

    // Map file system events to business events
    switch (eventType) {
      case 'add':
        eventBus.emit('ticket:created', {
          ticketCode,
          projectId: projectId || ''
        }, 'sse');
        break;

      case 'change':
        eventBus.emit('ticket:updated', {
          ticketCode,
          projectId: projectId || ''
        }, 'sse');
        break;

      case 'unlink':
        eventBus.emit('ticket:deleted', {
          ticketCode,
          projectId: projectId || ''
        }, 'sse');
        break;

      default:
        console.warn('[SSEClient] ⚠️ Unknown file event type:', eventType);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(
      `[SSEClient] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.url);
    }, delay);
  }

  /**
   * Get full URL for SSE endpoint
   */
  private getFullUrl(path: string): string {
    if (typeof window === 'undefined') {
      return `http://localhost:3001${path}`;
    }

    // In development, use backend port
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://localhost:3001${path}`;
    }

    // In production, use same origin
    return `${window.location.origin}${path}`;
  }
}

// Export singleton instance
export const sseClient = new SSEClient();

// Auto-connect on module load (can be disabled if needed)
if (typeof window !== 'undefined') {
  sseClient.connect();
}
