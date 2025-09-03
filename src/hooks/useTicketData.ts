import { useState, useEffect, useCallback, useRef } from 'react';
import { Ticket, Status } from '../types';
import { defaultFileService } from '../services/fileService';
import { defaultRealtimeFileWatcher } from '../services/realtimeFileWatcher';
import { createTicketTemplate } from '../services/markdownParser';

interface UseTicketDataOptions {
  autoRefresh?: boolean;
  pollingInterval?: number;
  enableFileWatcher?: boolean;
}

interface UseTicketDataReturn {
  tickets: Ticket[];
  loading: boolean;
  error: Error | null;
  
  // Ticket operations
  createTicket: (ticketCode: string, title: string, type: string) => Promise<Ticket>;
  updateTicket: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>;
  deleteTicket: (ticketCode: string) => Promise<void>;
  loadTicket: (ticketCode: string) => Promise<Ticket | null>;
  
  // Bulk operations
  refreshTickets: () => Promise<Ticket[]>;
  exportTickets: () => Promise<void>;
  importTickets: (file: File) => Promise<void>;
  clearAllTickets: () => Promise<void>;
  
  // File operations
  saveTicket: (ticket: Ticket) => Promise<void>;
  
  // Statistics
  getStats: () => {
    totalTickets: number;
    loadingTickets: boolean;
    lastUpdated: Date | null;
    fileWatcherStats: any;
  };
  
  // Error handling
  clearError: () => void;
}

export function useTicketData(options: UseTicketDataOptions = {}): UseTicketDataReturn {
  const {
    autoRefresh = true,
    pollingInterval = 5000,
    enableFileWatcher = true
  } = options;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fileWatcherRef = useRef(defaultRealtimeFileWatcher);
  const isMounted = useRef(true);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize file service
        await defaultFileService.initialize();

        // Load initial tickets
        const initialTickets = await defaultFileService.loadAllTickets();
        setTickets(initialTickets);
        setLastUpdated(new Date());

        // Setup file watcher if enabled
        if (enableFileWatcher && autoRefresh) {
          fileWatcherRef.current = new (defaultRealtimeFileWatcher.constructor as any)({
            pollingInterval,
            enableAutoRefresh: true,
            enableSSE: true,
            onChange: (updatedTickets: Ticket[]) => {
              if (isMounted.current) {
                setTickets(updatedTickets);
                setLastUpdated(new Date());
              }
            },
            onError: (watcherError: Error) => {
              if (isMounted.current) {
                setError(watcherError);
              }
            }
          });

          await fileWatcherRef.current.start();
        }

        setLoading(false);
      } catch (err) {
        if (isMounted.current) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    initializeServices();

    // Cleanup function
    return () => {
      isMounted.current = false;
      if (fileWatcherRef.current) {
        fileWatcherRef.current.stop();
      }
    };
  }, [autoRefresh, pollingInterval, enableFileWatcher]);

  // Create a new ticket
  const createTicket = useCallback(async (ticketCode: string, title: string, type: string): Promise<Ticket> => {
    try {
      setError(null);
      
      const newTicket = await defaultFileService.createTicket(ticketCode, title, type);
      
      // Update local state
      setTickets(prev => [newTicket, ...prev]);
      setLastUpdated(new Date());
      
      return newTicket;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  // Update an existing ticket
  const updateTicket = useCallback(async (ticketCode: string, updates: Partial<Ticket>): Promise<Ticket> => {
    console.log('useTicketData: updateTicket called with:', { ticketCode, updates });
    try {
      setError(null);
      
      const updatedTicket = await defaultFileService.updateTicket(ticketCode, updates);
      console.log('useTicketData: Ticket updated successfully:', updatedTicket);
      
      // Update local state
      setTickets(prev => prev.map(ticket =>
        ticket.code === ticketCode ? updatedTicket : ticket
      ));
      setLastUpdated(new Date());
      
      return updatedTicket;
    } catch (err) {
      const error = err as Error;
      console.error('useTicketData: Failed to update ticket:', error);
      setError(error);
      throw error;
    }
  }, []);

  // Delete a ticket
  const deleteTicket = useCallback(async (ticketCode: string): Promise<void> => {
    try {
      setError(null);
      
      await defaultFileService.deleteTicket(ticketCode);
      
      // Update local state
      setTickets(prev => prev.filter(ticket => ticket.code !== ticketCode));
      setLastUpdated(new Date());
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  // Load a specific ticket
  const loadTicket = useCallback(async (ticketCode: string): Promise<Ticket | null> => {
    try {
      setError(null);
      return await defaultFileService.loadTicket(ticketCode);
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  // Refresh all tickets
  const refreshTickets = useCallback(async (): Promise<Ticket[]> => {
    try {
      setError(null);
      setLoading(true);
      
      const refreshedTickets = await defaultFileService.loadAllTickets();
      setTickets(refreshedTickets);
      setLastUpdated(new Date());
      
      setLoading(false);
      return refreshedTickets;
    } catch (err) {
      const error = err as Error;
      setError(error);
      setLoading(false);
      throw error;
    }
  }, []);

  // Export tickets to JSON
  const exportTickets = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await defaultFileService.exportTickets();
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  // Import tickets from JSON
  const importTickets = useCallback(async (file: File): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      
      await defaultFileService.importTickets(file);
      
      // Refresh tickets after import
      const refreshedTickets = await defaultFileService.loadAllTickets();
      setTickets(refreshedTickets);
      setLastUpdated(new Date());
      
      setLoading(false);
    } catch (err) {
      const error = err as Error;
      setError(error);
      setLoading(false);
      throw error;
    }
  }, []);

  // Clear all tickets
  const clearAllTickets = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      
      await defaultFileService.clearAllTickets();
      
      setTickets([]);
      setLastUpdated(new Date());
      
      setLoading(false);
    } catch (err) {
      const error = err as Error;
      setError(error);
      setLoading(false);
      throw error;
    }
  }, []);

  // Save a ticket (for manual save operations)
  const saveTicket = useCallback(async (ticket: Ticket): Promise<void> => {
    try {
      setError(null);
      
      await defaultFileService.saveTicket(ticket);
      
      // Update local state
      setTickets(prev => prev.map(t => 
        t.code === ticket.code ? ticket : t
      ));
      setLastUpdated(new Date());
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  // Get statistics
  const getStats = useCallback(() => {
    return {
      totalTickets: tickets.length,
      loadingTickets: loading,
      lastUpdated,
      fileWatcherStats: fileWatcherRef.current?.getStats() || null
    };
  }, [tickets, loading, lastUpdated]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    tickets,
    loading,
    error,
    
    // Ticket operations
    createTicket,
    updateTicket,
    deleteTicket,
    loadTicket,
    
    // Bulk operations
    refreshTickets,
    exportTickets,
    importTickets,
    clearAllTickets,
    
    // File operations
    saveTicket,
    
    // Statistics
    getStats,
    
    // Error handling
    clearError
  };
}

// Hook for managing ticket status changes with automation
export function useTicketStatusAutomation() {
  const { updateTicket } = useTicketData();
  
  const moveTicket = useCallback(async (ticketCode: string, newStatus: Status): Promise<void> => {
    console.log('useTicketStatusAutomation: moveTicket called with:', { ticketCode, newStatus });
    try {
      await updateTicket(ticketCode, { status: newStatus });
      console.log('useTicketStatusAutomation: Ticket status updated successfully');
      
      // Auto-set implementation date when status changes to "Implemented"
      if (newStatus === 'Implemented' || newStatus === 'Partially Implemented') {
        await updateTicket(ticketCode, {
          implementationDate: new Date(),
          implementationNotes: `Status changed to ${newStatus} on ${new Date().toLocaleDateString()}`
        });
        console.log('useTicketStatusAutomation: Implementation date set');
      }
      
      // Auto-set status to "On Hold" if ticket has been in progress for too long
      // This could be enhanced with more sophisticated logic
    } catch (error) {
      console.error('useTicketStatusAutomation: Failed to move ticket:', error);
      throw error;
    }
  }, [updateTicket]);
  
  return {
    moveTicket
  };
}

// Hook for ticket filtering and sorting
export function useTicketFilters(tickets: Ticket[], initialFilters?: {
  status?: Status[];
  priority?: string[];
  type?: string[];
  searchTerm?: string;
}) {
  const [filters, setFilters] = useState(initialFilters || {});
  
  const filteredTickets = tickets.filter(ticket => {
    // Status filter
    if (filters.status && filters.status.length > 0 && !filters.status.includes(ticket.status as Status)) {
      return false;
    }
    
    // Priority filter
    if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(ticket.priority)) {
      return false;
    }
    
    // Type filter
    if (filters.type && filters.type.length > 0 && !filters.type.includes(ticket.type)) {
      return false;
    }
    
    // Search filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const searchableText = `${ticket.title} ${ticket.code} ${ticket.content || ''}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });
  
  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);
  
  return {
    filteredTickets,
    filters,
    updateFilter,
    clearFilters
  };
}