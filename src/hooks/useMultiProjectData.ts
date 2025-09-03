import { useState, useEffect, useCallback } from 'react';
import { Ticket, Status } from '../types';

interface Project {
  id: string;
  project: {
    name: string;
    path: string;
    configFile: string;
    active: boolean;
    description: string;
  };
  metadata: {
    dateRegistered: string;
    lastAccessed: string;
    version: string;
  };
  autoDiscovered?: boolean;
}

interface UseMultiProjectDataOptions {
  autoSelectFirst?: boolean;
}

interface UseMultiProjectDataReturn {
  // Project management
  projects: Project[];
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  
  // Ticket data for selected project
  tickets: Ticket[];
  loading: boolean;
  error: Error | null;
  
  // Ticket operations (work on selected project)
  createTicket: (ticketCode: string, title: string, type: string) => Promise<Ticket>;
  updateTicket: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>;
  deleteTicket: (ticketCode: string) => Promise<void>;
  
  // Refresh operations
  refreshProjects: () => Promise<void>;
  refreshTickets: () => Promise<void>;
  
  // Error handling
  clearError: () => void;
}

export function useMultiProjectData(options: UseMultiProjectDataOptions = {}): UseMultiProjectDataReturn {
  const { autoSelectFirst = true } = options;
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      
      const projectsData = await response.json();
      setProjects(projectsData);
      
      // Auto-select first project if none selected and autoSelectFirst is true
      if (autoSelectFirst && projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0]);
      }
      
      return projectsData;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, [autoSelectFirst, selectedProject]);

  // Fetch tickets for a specific project
  const fetchTicketsForProject = useCallback(async (project: Project) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch(`/api/projects/${project.id}/crs`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tickets for project ${project.project.name}: ${response.statusText}`);
      }
      
      const crsData = await response.json();
      
      // Convert CR data to Ticket format
      const convertedTickets: Ticket[] = crsData.map((cr: any) => ({
        code: cr.code || 'Unknown',
        title: cr.title || 'Untitled',
        status: cr.status || 'Pending',
        priority: cr.priority || 'Medium',
        type: cr.type || 'Feature Enhancement',
        dateCreated: cr.dateCreated ? new Date(cr.dateCreated) : new Date(),
        content: cr.content || '',
        filePath: cr.path || '',
        lastModified: new Date(),
        ...cr.header // Include any additional header fields
      }));
      
      setTickets(convertedTickets);
      setLoading(false);
      
      return convertedTickets;
    } catch (err) {
      const error = err as Error;
      setError(error);
      setLoading(false);
      setTickets([]);
      throw error;
    }
  }, []);

  // Load initial projects
  useEffect(() => {
    fetchProjects().catch(err => {
      console.error('Failed to load initial projects:', err);
      setLoading(false);
    });
  }, [fetchProjects]);

  // Load tickets when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchTicketsForProject(selectedProject).catch(err => {
        console.error('Failed to load tickets for project:', selectedProject.project.name, err);
      });
    } else {
      setTickets([]);
      setLoading(false);
    }
  }, [selectedProject, fetchTicketsForProject]);

  // Create a new ticket in the selected project
  const createTicket = useCallback(async (ticketCode: string, title: string, type: string): Promise<Ticket> => {
    if (!selectedProject) {
      throw new Error('No project selected');
    }
    
    try {
      setError(null);
      
      const response = await fetch(`/api/projects/${selectedProject.id}/crs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: ticketCode,
          title,
          type,
          status: 'Pending',
          priority: 'Medium'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create ticket: ${response.statusText}`);
      }
      
      const newTicketData = await response.json();
      
      // Convert to Ticket format
      const newTicket: Ticket = {
        code: newTicketData.code,
        title: newTicketData.title,
        status: newTicketData.status as Status,
        priority: newTicketData.priority,
        type: newTicketData.type,
        dateCreated: new Date(),
        content: newTicketData.content || '',
        filePath: newTicketData.path || '',
        lastModified: new Date(),
        phaseEpic: 'Phase A'
      };
      
      // Update local state
      setTickets(prev => [newTicket, ...prev]);
      
      return newTicket;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, [selectedProject]);

  // Update a ticket in the selected project
  const updateTicket = useCallback(async (ticketCode: string, updates: Partial<Ticket>): Promise<Ticket> => {
    if (!selectedProject) {
      throw new Error('No project selected');
    }
    
    try {
      setError(null);
      
      const response = await fetch(`/api/projects/${selectedProject.id}/crs/${ticketCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update ticket: ${response.statusText}`);
      }
      
      const updatedTicketData = await response.json();
      
      // Convert to Ticket format
      const updatedTicket: Ticket = {
        code: updatedTicketData.code,
        title: updatedTicketData.title,
        status: updatedTicketData.status as Status,
        priority: updatedTicketData.priority,
        type: updatedTicketData.type,
        dateCreated: updatedTicketData.dateCreated ? new Date(updatedTicketData.dateCreated) : new Date(),
        content: updatedTicketData.content || '',
        filePath: updatedTicketData.path || '',
        lastModified: new Date(),
        phaseEpic: updatedTicketData.phaseEpic || 'Phase A',
        ...updates // Apply the updates
      };
      
      // Update local state
      setTickets(prev => prev.map(ticket =>
        ticket.code === ticketCode ? updatedTicket : ticket
      ));
      
      return updatedTicket;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, [selectedProject]);

  // Delete a ticket from the selected project
  const deleteTicket = useCallback(async (ticketCode: string): Promise<void> => {
    if (!selectedProject) {
      throw new Error('No project selected');
    }
    
    try {
      setError(null);
      
      const response = await fetch(`/api/projects/${selectedProject.id}/crs/${ticketCode}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete ticket: ${response.statusText}`);
      }
      
      // Update local state
      setTickets(prev => prev.filter(ticket => ticket.code !== ticketCode));
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, [selectedProject]);

  // Refresh projects
  const refreshProjects = useCallback(async (): Promise<void> => {
    await fetchProjects();
  }, [fetchProjects]);

  // Refresh tickets for current project
  const refreshTickets = useCallback(async (): Promise<void> => {
    if (selectedProject) {
      await fetchTicketsForProject(selectedProject);
    }
  }, [selectedProject, fetchTicketsForProject]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Project management
    projects,
    selectedProject,
    setSelectedProject,
    
    // Ticket data
    tickets,
    loading,
    error,
    
    // Ticket operations
    createTicket,
    updateTicket,
    deleteTicket,
    
    // Refresh operations
    refreshProjects,
    refreshTickets,
    
    // Error handling
    clearError
  };
}