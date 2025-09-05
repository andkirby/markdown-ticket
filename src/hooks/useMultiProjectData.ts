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
  
  // localStorage keys for persistence
  const SELECTED_PROJECT_KEY = 'markdown-ticket-selected-project';
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
      
      return projectsData;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

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

  // Load stored project selection from localStorage
  const loadStoredProjectSelection = useCallback((availableProjects: Project[]) => {
    try {
      const storedProjectId = localStorage.getItem(SELECTED_PROJECT_KEY);
      if (storedProjectId) {
        const storedProject = availableProjects.find(project => project.id === storedProjectId);
        if (storedProject) {
          setSelectedProject(storedProject);
          return storedProject;
        } else {
          // Stored project no longer exists, clear from localStorage
          localStorage.removeItem(SELECTED_PROJECT_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load project selection from localStorage:', error);
      // Clear potentially corrupted data
      localStorage.removeItem(SELECTED_PROJECT_KEY);
    }
    return null;
  }, []);

  // Save project selection to localStorage
  const saveProjectSelection = useCallback((project: Project | null) => {
    try {
      if (project) {
        localStorage.setItem(SELECTED_PROJECT_KEY, project.id);
      } else {
        localStorage.removeItem(SELECTED_PROJECT_KEY);
      }
    } catch (error) {
      console.warn('Failed to save project selection to localStorage:', error);
    }
  }, []);

  // Enhanced setSelectedProject with localStorage persistence
  const setSelectedProjectWithPersistence = useCallback((project: Project | null) => {
    setSelectedProject(project);
    saveProjectSelection(project);
  }, [saveProjectSelection]);

  // Load initial projects
  useEffect(() => {
    fetchProjects().then((projectsData) => {
      // Try to restore previous selection first
      const restoredProject = loadStoredProjectSelection(projectsData);
      
      // If no stored selection and autoSelectFirst is true, select first project
      if (!restoredProject && autoSelectFirst && projectsData.length > 0) {
        setSelectedProjectWithPersistence(projectsData[0]);
      }
    }).catch(err => {
      console.error('Failed to load initial projects:', err);
      setLoading(false);
    });
  }, [fetchProjects, loadStoredProjectSelection, autoSelectFirst, setSelectedProjectWithPersistence]);

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

      console.log('updateTicket: Current ticket:', currentTicket);
      console.log('updateTicket: Updates:', updates);

      // Create updated ticket with intended changes (optimistic update)
      const optimisticTicket: Ticket = {
        ...currentTicket,
        ...updates,
        lastModified: new Date(),
      };

      console.log('updateTicket: Optimistic ticket:', optimisticTicket);

      // Update local state immediately for UI synchronization
      setTickets(prev => prev.map(ticket => 
        ticket.code === ticketCode ? optimisticTicket : ticket
      ));

      // Determine if we should use PATCH (for small updates) or PUT (for large updates)
      const shouldUsePatch = Object.keys(updates).length <= 3 && 
                           !updates.content && 
                           (updates.status || updates.priority || updates.implementationDate || updates.implementationNotes);

      let response;
      const apiUrl = `/api/projects/${selectedProject.id}/crs/${ticketCode}`;
      
      if (shouldUsePatch) {
        console.log('updateTicket: Using PATCH for efficient update');
        
        // Prepare minimal update data for PATCH
        const patchData: Record<string, any> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (value instanceof Date) {
            patchData[key] = value.toISOString();
          } else if (value !== undefined) {
            patchData[key] = value;
          }
        }

        console.log('updateTicket: PATCH data:', patchData);

        response = await fetch(apiUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(patchData),
        });
      } else {
        console.log('updateTicket: Using PUT for full content update');
        
        // Generate full markdown content from the updated ticket
        const updatedTicketWithContent: Ticket = {
          ...currentTicket,
          ...updates,
          lastModified: new Date(),
          content: currentTicket.content || '',
        };

        const markdownContent = formatTicketAsMarkdown(updatedTicketWithContent);
        console.log('updateTicket: Generated markdown content:', markdownContent.substring(0, 200) + '...');

        response = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: markdownContent }),
        });
      }

      console.log('updateTicket: API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('updateTicket: API error response:', errorText);
        throw new Error(`Failed to update ticket: ${response.statusText} - ${errorText}`);
      }

      const backendResponse = await response.json();
      console.log('updateTicket: Backend response:', backendResponse);

      // The API call was successful, the file has been updated
      // Let the file watcher/SSE handle synchronization with fresh data
      // Return the optimistic ticket for immediate feedback
      return optimisticTicket;
    } catch (err) {
      const error = err as Error;
      console.error('updateTicket: Error occurred:', error);

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
    setSelectedProject: setSelectedProjectWithPersistence,
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