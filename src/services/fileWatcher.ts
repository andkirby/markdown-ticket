import { Ticket } from '../types';
import { defaultFileService } from './fileService';

interface FileWatcherOptions {
  pollingInterval?: number;
  enableAutoRefresh?: boolean;
  onChange?: (tickets: Ticket[]) => void;
  onError?: (error: Error) => void;
}

interface WatcherEvent {
  type: 'created' | 'modified' | 'deleted';
  ticketCode: string;
  timestamp: number;
}

export class FileWatcher {
  private pollingInterval: number;
  private enableAutoRefresh: boolean;
  private onChange?: (tickets: Ticket[]) => void;
  private onError?: (error: Error) => void;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastUpdateTime: number = 0;
  private eventQueue: WatcherEvent[] = [];
  private isProcessing: boolean = false;

  constructor(options: FileWatcherOptions = {}) {
    this.pollingInterval = options.pollingInterval || 1000; // 1 second for faster updates
    this.enableAutoRefresh = options.enableAutoRefresh ?? true;
    this.onChange = options.onChange;
    this.onError = options.onError;
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    if (this.intervalId) {
      console.warn('File watcher is already running');
      return;
    }

    try {
      // Initialize file service
      await defaultFileService.initialize();
      
      // Start polling
      this.intervalId = setInterval(() => {
        this.checkForChanges();
      }, this.pollingInterval);

      console.log(`File watcher started with ${this.pollingInterval}ms interval`);
    } catch (error) {
      console.error('Failed to start file watcher:', error);
      if (this.onError) {
        this.onError(error as Error);
      }
    }
  }

  /**
   * Stop watching for file changes
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('File watcher stopped');
    }
  }

  /**
   * Check for file changes
   */
  private async checkForChanges(): Promise<void> {
    if (!this.enableAutoRefresh || this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;
      
      // Get current tickets directly from server
      const currentTickets = await defaultFileService.loadAllTickets();
      const currentTime = Date.now();
      
      // Check for changes since last update
      if (this.lastUpdateTime === 0) {
        // First run - initialize
        this.lastUpdateTime = currentTime;
        if (this.onChange) {
          this.onChange(currentTickets);
        }
        return;
      }

      // Process changes
      const changes = await this.detectChanges(currentTickets);
      
      if (changes.length > 0) {
        console.log(`Detected ${changes.length} file changes`);
        
        // Add to event queue
        changes.forEach(change => {
          this.eventQueue.push({
            type: change.type,
            ticketCode: change.ticketCode,
            timestamp: currentTime
          });
        });

        // Process event queue
        await this.processEventQueue();
        
        // Update last update time
        this.lastUpdateTime = currentTime;
        
        // Immediately notify callback with fresh data
        if (this.onChange) {
          const freshTickets = await defaultFileService.loadAllTickets();
          this.onChange(freshTickets);
        }
      } else {
        // Even if no changes detected, refresh the data to ensure consistency
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
   * Detect changes in tickets
   */
  private async detectChanges(currentTickets: Ticket[]): Promise<Array<{ type: 'created' | 'modified' | 'deleted'; ticketCode: string }>> {
    const changes: Array<{ type: 'created' | 'modified' | 'deleted'; ticketCode: string }> = [];
    
    try {
      // Get previously stored tickets from localStorage
      const storedTickets = this.getStoredTickets();
      
      // Check for new tickets
      for (const currentTicket of currentTickets) {
        const existingTicket = storedTickets.find(t => t.code === currentTicket.code);
        
        if (!existingTicket) {
          changes.push({
            type: 'created',
            ticketCode: currentTicket.code
          });
        } else {
          // Check if ticket was modified by comparing lastModified timestamps
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
      
      // Check for deleted tickets
      for (const storedTicket of storedTickets) {
        const currentTicket = currentTickets.find(t => t.code === storedTicket.code);
        
        if (!currentTicket) {
          changes.push({
            type: 'deleted',
            ticketCode: storedTicket.code
          });
        }
      }
      
      // Update stored tickets with current state
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
      // Process events in order
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
    pollingInterval: number;
    lastUpdateTime: number;
    eventQueueLength: number;
    isProcessing: boolean;
  } {
    return {
      isRunning: this.intervalId !== null,
      pollingInterval: this.pollingInterval,
      lastUpdateTime: this.lastUpdateTime,
      eventQueueLength: this.eventQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Set polling interval
   */
  setPollingInterval(interval: number): void {
    this.pollingInterval = Math.max(1000, interval); // Minimum 1 second
    
    if (this.intervalId) {
      // Restart watcher with new interval
      this.stop();
      this.start();
    }
  }

  /**
   * Enable or disable auto refresh
   */
  setAutoRefresh(enabled: boolean): void {
    this.enableAutoRefresh = enabled;
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

// Default file watcher instance
export const defaultFileWatcher = new FileWatcher({
  pollingInterval: 1000, // 1 second for faster updates
  enableAutoRefresh: true
});

// Utility function to create a watcher with custom options
export function createFileWatcher(options: FileWatcherOptions = {}): FileWatcher {
  return new FileWatcher(options);
}