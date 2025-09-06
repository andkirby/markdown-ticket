import { Ticket } from '../types';
import { defaultFileService } from './fileService';

interface RealtimeFileWatcherOptions {
  pollingInterval?: number;
  enableAutoRefresh?: boolean;
  onChange?: (tickets: Ticket[]) => void;
  onError?: (error: Error) => void;
  sseEndpoint?: string;
  enableSSE?: boolean;
  maxReconnectAttempts?: number;
}

interface SSEEvent {
  type: string;
  data: {
    eventType?: 'add' | 'change' | 'unlink';
    filename?: string;
    timestamp?: number;
    status?: string;
  };
}

interface WatcherEvent {
  type: 'created' | 'modified' | 'deleted';
  ticketCode: string;
  timestamp: number;
}

export class RealtimeFileWatcher {
  private pollingInterval: number;
  private enableAutoRefresh: boolean;
  private onChange?: (tickets: Ticket[]) => void;
  private onError?: (error: Error) => void;
  
  // SSE-related properties
  private eventSource: EventSource | null = null;
  private sseEndpoint: string;
  private enableSSE: boolean;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isSSEConnected: boolean = false;
  
  // Polling fallback properties
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastUpdateTime: number = 0;
  private eventQueue: WatcherEvent[] = [];
  private isProcessing: boolean = false;

  constructor(options: RealtimeFileWatcherOptions = {}) {
    this.pollingInterval = options.pollingInterval || 5000; // 5 seconds as fallback
    this.enableAutoRefresh = options.enableAutoRefresh ?? true;
    this.onChange = options.onChange;
    this.onError = options.onError;
    this.sseEndpoint = options.sseEndpoint || '/api/events';
    this.enableSSE = options.enableSSE ?? true;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting realtime file watcher...');
      
      // Initialize file service
      await defaultFileService.initialize();
      
      if (this.enableSSE) {
        console.log('📡 SSE enabled, starting SSE connection...');
        await this.startSSE();
      } else {
        console.log('📊 SSE disabled, starting polling fallback...');
        this.startPolling();
      }
      
      console.log('✅ Realtime file watcher started');
    } catch (error) {
      console.error('❌ Failed to start realtime file watcher:', error);
      if (this.onError) {
        this.onError(error as Error);
      }
    }
  }

  /**
   * Stop watching for file changes
   */
  stop(): void {
    this.stopSSE();
    this.stopPolling();
    console.log('Realtime file watcher stopped');
  }

  /**
   * Start Server-Sent Events connection
   */
  private async startSSE(): Promise<void> {
    if (this.eventSource) {
      console.warn('⚠️ SSE connection already exists, closing old one first');
      this.stopSSE();
    }

    try {
      const baseUrl = this.getBaseUrl();
      const sseUrl = `${baseUrl}${this.sseEndpoint}`;
      
      console.log(`🔌 Connecting to SSE endpoint: ${sseUrl}`);
      
      this.eventSource = new EventSource(sseUrl);
      
      this.eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        console.log('📊 SSE readyState:', this.eventSource?.readyState);
        this.isSSEConnected = true;
        this.reconnectAttempts = 0;
        
        // Stop polling fallback if it was running
        this.stopPolling();
        
        // Load initial data
        this.loadAndNotifyTickets();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data);
          console.log('📨 Received SSE event:', sseEvent);
          console.log('📊 SSE readyState after message:', this.eventSource?.readyState);
          this.handleSSEEvent(sseEvent);
        } catch (error) {
          console.error('❌ Error parsing SSE event:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        console.log('📊 SSE readyState on error:', this.eventSource?.readyState);
        this.isSSEConnected = false;
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          console.log('🔄 SSE connection closed, attempting to reconnect...');
          this.handleSSEReconnect();
        } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
          console.log('🔄 SSE still connecting, will retry...');
        }
      };

    } catch (error) {
      console.error('❌ Failed to start SSE connection:', error);
      this.handleSSEReconnect();
    }
  }

  /**
   * Stop SSE connection
   */
  private stopSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isSSEConnected = false;
      console.log('SSE connection closed');
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Handle SSE reconnection with exponential backoff
   */
  private handleSSEReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Max SSE reconnection attempts (${this.maxReconnectAttempts}) reached, falling back to polling`);
      this.stopSSE();
      this.startPolling();
      return;
    }

    const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Max 30 seconds
    this.reconnectAttempts++;
    
    console.log(`SSE reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${backoffDelay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.stopSSE();
      this.startSSE();
    }, backoffDelay);
  }

  /**
   * Handle incoming SSE events
   */
  private handleSSEEvent(event: SSEEvent): void {
    console.log('Received SSE event:', event);

    switch (event.type) {
      case 'connection':
        console.log('SSE connection confirmed');
        break;
        
      case 'heartbeat':
        // Heartbeat received, connection is alive
        break;
        
      case 'file-change':
        if (event.data.eventType && event.data.filename) {
          this.handleFileChangeEvent(event.data.eventType, event.data.filename);
        }
        break;
        
      default:
        console.log('Unknown SSE event type:', event.type);
    }
  }

  /**
   * Handle file change events from SSE
   */
  private handleFileChangeEvent(eventType: 'add' | 'change' | 'unlink', filename: string): void {
    // Extract ticket code from filename
    const ticketCode = filename.replace('.md', '');
    
    let changeType: 'created' | 'modified' | 'deleted';
    switch (eventType) {
      case 'add':
        changeType = 'created';
        break;
      case 'change':
        changeType = 'modified';
        break;
      case 'unlink':
        changeType = 'deleted';
        break;
    }

    console.log(`📝 File ${changeType}: ${ticketCode}`);

    // Add to event queue
    this.eventQueue.push({
      type: changeType,
      ticketCode,
      timestamp: Date.now()
    });

    // Process the event and refresh tickets with a small delay
    // This prevents race conditions where SSE events triggered by user actions
    // reload stale data before the API changes have propagated
    this.processEventQueue().then(() => {
      setTimeout(() => {
        console.log('🔄 Refreshing tickets after file change...');
        this.loadAndNotifyTickets();
      }, 500); // 500ms delay to allow API/backend to propagate changes
    });
  }

  /**
   * Start polling fallback
   */
  private startPolling(): void {
    if (this.intervalId) {
      console.warn('Polling is already running');
      return;
    }

    console.log(`Starting polling fallback with ${this.pollingInterval}ms interval`);
    this.intervalId = setInterval(() => {
      this.checkForChanges();
    }, this.pollingInterval);

    // Initial load
    this.loadAndNotifyTickets();
  }

  /**
   * Stop polling fallback
   */
  private stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Polling stopped');
    }
  }

  /**
   * Load tickets and notify onChange callback
   */
  private async loadAndNotifyTickets(): Promise<void> {
    try {
      const tickets = await defaultFileService.loadAllTickets();
      this.updateStoredTickets(tickets);
      
      if (this.onChange) {
        this.onChange(tickets);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      if (this.onError) {
        this.onError(error as Error);
      }
    }
  }

  /**
   * Check for file changes (polling fallback)
   */
  private async checkForChanges(): Promise<void> {
    if (!this.enableAutoRefresh || this.isProcessing || this.isSSEConnected) {
      return;
    }

    try {
      this.isProcessing = true;
      
      const currentTickets = await defaultFileService.loadAllTickets();
      const currentTime = Date.now();
      
      if (this.lastUpdateTime === 0) {
        this.lastUpdateTime = currentTime;
        if (this.onChange) {
          this.onChange(currentTickets);
        }
        return;
      }

      const changes = await this.detectChanges(currentTickets);
      
      if (changes.length > 0) {
        console.log(`Detected ${changes.length} file changes (polling)`);
        
        changes.forEach(change => {
          this.eventQueue.push({
            type: change.type,
            ticketCode: change.ticketCode,
            timestamp: currentTime
          });
        });

        await this.processEventQueue();
        this.lastUpdateTime = currentTime;
        
        if (this.onChange) {
          const freshTickets = await defaultFileService.loadAllTickets();
          this.onChange(freshTickets);
        }
      }
    } catch (error) {
      console.error('Error checking for file changes:', error);
      if (this.onError) {
        this.onError(error as Error);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Detect changes in tickets (polling fallback)
   */
  private async detectChanges(currentTickets: Ticket[]): Promise<Array<{ type: 'created' | 'modified' | 'deleted'; ticketCode: string }>> {
    const changes: Array<{ type: 'created' | 'modified' | 'deleted'; ticketCode: string }> = [];
    
    try {
      const storedTickets = this.getStoredTickets();
      
      for (const currentTicket of currentTickets) {
        const existingTicket = storedTickets.find(t => t.code === currentTicket.code);
        
        if (!existingTicket) {
          changes.push({
            type: 'created',
            ticketCode: currentTicket.code
          });
        } else {
          const currentModified = currentTicket.lastModified.getTime();
          const existingModified = existingTicket.lastModified.getTime();
          
          if (currentModified > existingModified) {
            changes.push({
              type: 'modified',
              ticketCode: currentTicket.code
            });
          }
        }
      }
      
      for (const storedTicket of storedTickets) {
        const currentTicket = currentTickets.find(t => t.code === storedTicket.code);
        
        if (!currentTicket) {
          changes.push({
            type: 'deleted',
            ticketCode: storedTicket.code
          });
        }
      }
      
      this.updateStoredTickets(currentTickets);
      return changes;
    } catch (error) {
      console.error('Error detecting changes:', error);
      return [];
    }
  }

  /**
   * Process event queue
   */
  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (event) {
          await this.handleEvent(event);
        }
      }
    } catch (error) {
      console.error('Error processing event queue:', error);
    }
  }

  /**
   * Handle a single event
   */
  private async handleEvent(event: WatcherEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'created':
          console.log(`Ticket ${event.ticketCode} was created`);
          break;
        case 'modified':
          console.log(`Ticket ${event.ticketCode} was modified`);
          break;
        case 'deleted':
          console.log(`Ticket ${event.ticketCode} was deleted`);
          break;
      }
    } catch (error) {
      console.error(`Error handling event for ${event.ticketCode}:`, error);
    }
  }

  /**
   * Get stored tickets from localStorage
   */
  private getStoredTickets(): Ticket[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return [];
      }

      const stored = localStorage.getItem('md-tickets');
      if (!stored) {
        return [];
      }

      const data = JSON.parse(stored);
      return data.map((item: any) => ({
        ...item.ticket,
        dateCreated: new Date(item.ticket.dateCreated),
        implementationDate: item.ticket.implementationDate ? new Date(item.ticket.implementationDate) : undefined,
        lastModified: new Date(item.ticket.lastModified)
      }));
    } catch (error) {
      console.error('Error getting stored tickets:', error);
      return [];
    }
  }

  /**
   * Update stored tickets
   */
  private updateStoredTickets(tickets: Ticket[]): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      const data = tickets.map(ticket => ({
        ticket,
        timestamp: Date.now()
      }));
      
      localStorage.setItem('md-tickets', JSON.stringify(data));
    } catch (error) {
      console.error('Error updating stored tickets:', error);
    }
  }

  /**
   * Get base URL for API calls
   */
  private getBaseUrl(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:3001';
    }
    
    // In development, use the backend port
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // In production, use same origin
    return window.location.origin;
  }

  /**
   * Manually trigger a refresh
   */
  async refresh(): Promise<Ticket[]> {
    try {
      const tickets = await defaultFileService.loadAllTickets();
      this.updateStoredTickets(tickets);
      this.lastUpdateTime = Date.now();
      
      if (this.onChange) {
        this.onChange(tickets);
      }
      
      return tickets;
    } catch (error) {
      console.error('Error refreshing tickets:', error);
      if (this.onError) {
        this.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Get watcher statistics
   */
  getStats(): {
    isRunning: boolean;
    isSSEConnected: boolean;
    pollingInterval: number;
    lastUpdateTime: number;
    eventQueueLength: number;
    isProcessing: boolean;
    reconnectAttempts: number;
  } {
    return {
      isRunning: this.intervalId !== null || this.isSSEConnected,
      isSSEConnected: this.isSSEConnected,
      pollingInterval: this.pollingInterval,
      lastUpdateTime: this.lastUpdateTime,
      eventQueueLength: this.eventQueue.length,
      isProcessing: this.isProcessing,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Set polling interval
   */
  setPollingInterval(interval: number): void {
    this.pollingInterval = Math.max(1000, interval);
    
    if (this.intervalId && !this.isSSEConnected) {
      this.stopPolling();
      this.startPolling();
    }
  }

  /**
   * Enable or disable auto refresh
   */
  setAutoRefresh(enabled: boolean): void {
    this.enableAutoRefresh = enabled;
  }

  /**
   * Enable or disable SSE
   */
  setSSE(enabled: boolean): void {
    if (this.enableSSE === enabled) {
      return;
    }
    
    this.enableSSE = enabled;
    
    if (enabled) {
      this.stopPolling();
      this.startSSE();
    } else {
      this.stopSSE();
      this.startPolling();
    }
  }

  /**
   * Add event listener
   */
  on(event: 'change' | 'error', callback: (data: Ticket[] | Error) => void): void {
    if (event === 'change') {
      this.onChange = callback as (tickets: Ticket[]) => void;
    } else if (event === 'error') {
      this.onError = callback as (error: Error) => void;
    }
  }

  /**
   * Remove event listeners
   */
  off(): void {
    this.onChange = undefined;
    this.onError = undefined;
  }
}

// Default realtime file watcher instance
export const defaultRealtimeFileWatcher = new RealtimeFileWatcher({
  pollingInterval: 5000, // 5 seconds as fallback
  enableAutoRefresh: true,
  enableSSE: true
});