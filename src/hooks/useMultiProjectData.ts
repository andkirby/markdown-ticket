import { useState, useEffect, useCallback } from 'react';
import { Ticket, Status } from '../types';
import { formatTicketAsMarkdown } from '../services/markdownParser';

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
  tickets?: {
    codePattern?: string;
  };
  autoDiscovered?: boolean;
}

interface ProjectConfig {
  project: {
    name: string;
    code: string;
    path: string;
    startNumber: number;
    counterFile: string;
    description?: string;
    repository?: string;
  };
}

// Helper function to generate ticket codes based on project configuration
function generateTicketCode(project: Project, projectConfig: ProjectConfig | null, existingTicketCount: number): string {
  const projectCode = projectConfig?.project?.code || project.id.toUpperCase();
  const nextNumber = existingTicketCount + 1;
  
  // If project has a specific code pattern that includes letters, use it
  if (project.tickets?.codePattern && project.tickets.codePattern.includes('[A-Z]')) {
    // For patterns like "^CR-[A-Z]\d{3}$", generate CR-A001, CR-A002, etc.
    const letterIndex = Math.floor((nextNumber - 1) / 999); // Every 999 tickets, increment letter
    const numberPart = ((nextNumber - 1) % 999) + 1;
    const letter = String.fromCharCode(65 + letterIndex); // A, B, C, etc.
    return `${projectCode}-${letter}${String(numberPart).padStart(3, '0')}`;
  }
  
  // Default format: PROJECT-001, PROJECT-002, etc.
  return `${projectCode}-${String(nextNumber).padStart(3, '0')}`;
}

interface UseMultiProjectDataOptions {
  autoSelectFirst?: boolean;
}

interface UseMultiProjectDataReturn {
  // Project management
  projects: Project[];
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  projectConfig: ProjectConfig | null;
  
  // Ticket data for selected project
  tickets: Ticket[];
  loading: boolean;
  error: Error | null;
  
  // Ticket operations (work on selected project)
  createTicket: (title: string, type: string) => Promise<Ticket>; // Removed ticketCode param - will be auto-generated
  updateTicket: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>;
  deleteTicket: (ticketCode: string) => Promise<void>;
  
  // Refresh operations
  refreshProjects: () => Promise<void>;
  refreshTickets: () => Promise<void>;
  
  // Helper functions
  generateNextTicketCode: () => string;
  
  // Error handling
  clearError: () => void;
}

export function useMultiProjectData(options: UseMultiProjectDataOptions = {}): UseMultiProjectDataReturn {
  const { autoSelectFirst = true } = options;
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
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

  // Fetch project configuration
  const fetchProjectConfig = useCallback(async (project: Project) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/projects/${project.id}/config`);
      if (!response.ok) {
        throw new Error(`Failed to fetch project config: ${response.statusText}`);
      }
      
      const configData = await response.json();
      setProjectConfig(configData.config);
      
      return configData.config;
    } catch (err) {
      const error = err as Error;
      console.warn('Failed to fetch project config:', error.message);
      setProjectConfig(null);
      return null;
    }
  }, []);

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
      
      // Helper function to safely convert date strings to Date objects
      const parseDate = (dateValue: any): Date => {
        if (!dateValue) return new Date();
        if (dateValue instanceof Date) return dateValue;
        if (typeof dateValue === 'string') {
          const parsed = new Date(dateValue);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
        return new Date();
      };

      // Convert CR data to Ticket format
      const convertedTickets: Ticket[] = crsData.map((cr: any) => ({
        code: cr.code || 'Unknown',
        title: cr.title || 'Untitled',
        status: cr.status || 'Pending',
        priority: cr.priority || 'Medium',
        type: cr.type || 'Feature Enhancement',
        dateCreated: parseDate(cr.dateCreated),
        content: cr.content || '',
        filePath: cr.path || '',
        lastModified: parseDate(cr.lastModified),
        // Convert additional header fields with proper date handling
        phaseEpic: cr.header?.phaseEpic || cr.phaseEpic || '',
        source: cr.header?.source || cr.source || '',
        impact: cr.header?.impact || cr.impact || '',
        effort: cr.header?.effort || cr.effort || '',
        implementationDate: cr.header?.implementationDate ? parseDate(cr.header.implementationDate) : undefined,
        implementationNotes: cr.header?.implementationNotes || cr.implementationNotes || '',
        relatedTickets: [],
        supersedes: cr.header?.supersedes || '',
        dependsOn: [],
        blocks: [],
        relatedDocuments: []
      }));

      // Remove duplicates by code to prevent React key conflicts
      const uniqueTickets = convertedTickets.reduce((acc, ticket) => {
        acc.set(ticket.code, ticket);
        return acc;
      }, new Map<string, Ticket>());

      setTickets(Array.from(uniqueTickets.values()));
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

  // Load project config and tickets when project changes
  useEffect(() => {
    if (selectedProject) {
      Promise.all([
        fetchProjectConfig(selectedProject),
        fetchTicketsForProject(selectedProject)
      ]).catch(err => {
        console.error('Failed to load project data:', selectedProject.project.name, err);
      });
    } else {
      setTickets([]);
      setProjectConfig(null);
      setLoading(false);
    }
  }, [selectedProject, fetchTicketsForProject, fetchProjectConfig]);

  // Generate next ticket code based on project configuration
  const generateNextTicketCode = useCallback((): string => {
    if (!selectedProject) {
      return 'UNKNOWN-001';
    }
    
    return generateTicketCode(selectedProject, projectConfig, tickets.length);
  }, [selectedProject, projectConfig, tickets.length]);

  // Create a new ticket in the selected project
  const createTicket = useCallback(async (title: string, type: string): Promise<Ticket> => {
    if (!selectedProject) {
      throw new Error('No project selected');
    }
    
    const ticketCode = generateNextTicketCode();
    
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
  }, [selectedProject, generateNextTicketCode]);

  // Update a ticket in the selected project
  const updateTicket = useCallback(async (ticketCode: string, updates: Partial<Ticket>): Promise<Ticket> => {
    if (!selectedProject) {
      throw new Error('No project selected');
    }

    try {
      setError(null);

      // Find current ticket for optimistic update
      const currentTicket = tickets.find(ticket => ticket.code === ticketCode);
      if (!currentTicket) {
        throw new Error(`Ticket ${ticketCode} not found`);
      }

      // Ensure the current ticket has content for markdown formatting
      const ticketWithContent = {
        ...currentTicket,
        content: currentTicket.content || '',
      };

      // Create updated ticket with intended changes (optimistic update)
      const optimisticTicket: Ticket = {
        ...currentTicket,
        ...updates,
        lastModified: new Date(),
        content: currentTicket.content || '',
      };

      // Update local state immediately for UI synchronization
      // Preserve the ticket's position in the array to avoid visual jumping
      setTickets(prev => prev.map(ticket => 
        ticket.code === ticketCode ? optimisticTicket : ticket
      ));

      // Generate full markdown content from the updated ticket
      const updatedTicketWithContent: Ticket = {
        ...ticketWithContent,
        ...updates,
        lastModified: new Date(),
      };

      const markdownContent = formatTicketAsMarkdown(updatedTicketWithContent);

      // Make API call to update backend with full content
      const response = await fetch(`/api/projects/${selectedProject.id}/crs/${ticketCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: markdownContent }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ticket: ${response.statusText}`);
      }

      const backendResponse = await response.json();

      // The API call was successful, the file has been updated
      // Let the file watcher/SSE handle synchronization with fresh data
      // Return the optimistic ticket for immediate feedback
      return optimisticTicket;
    } catch (err) {
      const error = err as Error;

      // On error, rollback the optimistic update
      await refreshTickets(); // This will revert to backend state

      setError(error);
      throw error;
    }
  }, [selectedProject, tickets]);

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
    projectConfig,
    
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
    
    // Helper functions
    generateNextTicketCode,
    
    // Error handling
    clearError
  };
}