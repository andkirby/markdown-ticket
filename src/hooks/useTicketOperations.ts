import { useState, useCallback } from 'react';
import { Ticket, Status } from '../types';
import { Project } from '../../shared/models/Project';
import { formatTicketAsMarkdown } from '../services/markdownParser';

export function useTicketOperations(
  selectedProject: Project | null,
  tickets: Ticket[],
  setTickets: (tickets: Ticket[] | ((prev: Ticket[]) => Ticket[])) => void,
  fetchTicketsForProject: (project: Project) => Promise<void>,
  trackUserUpdate: (key: string) => void
) {
  const [error, setError] = useState<Error | null>(null);

  // Create a new ticket in the selected project
  const createTicket = useCallback(async (title: string, type: string): Promise<Ticket> => {
    if (!selectedProject) {
      throw new Error('No project selected');
    }

    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/crs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          status: 'Proposed',
          priority: 'Medium'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const newTicket = await response.json();
      
      // Add to local state immediately
      setTickets((prev: Ticket[]) => [...prev, newTicket]);
      
      return newTicket;
    } catch (error) {
      console.error('Failed to create ticket:', error);
      setError(error as Error);
      throw error;
    }
  }, [selectedProject, setTickets]);

  // Update a ticket
  const updateTicket = useCallback(async (ticketCode: string, updates: Partial<Ticket>): Promise<Ticket> => {
    if (!selectedProject) {
      throw new Error('No project selected');
    }

    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/crs/${ticketCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const updatedTicket = await response.json();
      
      // Update local state
      setTickets((prev: Ticket[]) => prev.map((t: Ticket) => t.code === ticketCode ? updatedTicket : t));
      
      return updatedTicket;
    } catch (error) {
      console.error('Failed to update ticket:', error);
      setError(error as Error);
      throw error;
    }
  }, [selectedProject, setTickets]);

  // Optimistic update for immediate UI feedback
  const updateTicketOptimistic = useCallback(async (ticketCode: string, updates: Partial<Ticket>, trackingKey?: string): Promise<Ticket> => {
    // Use provided tracking key or derive from ticket
    const finalTrackingKey = trackingKey || (() => {
      const ticket = tickets.find(t => t.code === ticketCode);
      return ticket?.filePath ? 
        ticket.filePath.split('/').pop()?.replace('.md', '') || ticketCode : 
        ticketCode;
    })();
    
    // Track this as a user-initiated update to prevent unnecessary refresh
    trackUserUpdate(finalTrackingKey);
    
    // Create optimistic ticket for immediate return
    const optimisticTicket: Ticket = {
      code: ticketCode,
      title: '',
      status: 'Proposed',
      type: 'Feature Enhancement', 
      priority: 'Medium',
      content: '',
      filePath: '',
      dateCreated: new Date(),
      lastModified: new Date(),
      implementationDate: null,
      phaseEpic: '',
      description: '',
      rationale: '',
      assignee: '',
      implementationNotes: '',
      relatedTickets: [],
      dependsOn: [],
      blocks: [],
      ...updates,
    };

    // Immediately update local state for instant UI feedback
    setTickets((prevTickets: Ticket[]) =>
      prevTickets.map((ticket: Ticket) =>
        ticket.code === ticketCode
          ? { ...ticket, ...updates, lastModified: new Date() }
          : ticket
      )
    );

    // Fire-and-forget API call - don't await it
    updateTicket(ticketCode, updates).catch(error => {
      console.error('Optimistic update failed, reverting:', error);
      // Revert optimistic update on error
      if (selectedProject) {
        fetchTicketsForProject(selectedProject);
      }
    });

    // Return immediately with optimistic data
    return optimisticTicket;
  }, [tickets, trackUserUpdate, updateTicket, setTickets, selectedProject, fetchTicketsForProject]);

  // Delete a ticket from the selected project
  const deleteTicket = useCallback(async (ticketCode: string): Promise<void> => {
    if (!selectedProject) {
      throw new Error('No project selected');
    }

    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/crs/${ticketCode}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Remove from local state
      setTickets((prev: Ticket[]) => prev.filter((t: Ticket) => t.code !== ticketCode));
    } catch (error) {
      console.error('Failed to delete ticket:', error);
      setError(error as Error);
      throw error;
    }
  }, [selectedProject, setTickets]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createTicket,
    updateTicket,
    updateTicketOptimistic,
    deleteTicket,
    error,
    clearError
  };
}
