import { useState, useEffect, useCallback, useRef } from 'react';
import { Ticket, Status } from '../types';
import { formatTicketAsMarkdown } from '../services/markdownParser';
import { defaultRealtimeFileWatcher } from '../services/realtimeFileWatcher';

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
  const selectedProjectRef = useRef<Project | null>(null);
  
  // Update ref when selectedProject changes
  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);
  
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

      // Convert CR data to Ticket format with inline normalization
      const convertedTickets: Ticket[] = crsData.map((cr: any) => {
        // Inline normalization function
        const normalizeArray = (value: any): string[] => {
          if (Array.isArray(value)) return value.filter(Boolean);
          if (typeof value === 'string' && value.trim()) {
            return value.split(',').map(s => s.trim()).filter(Boolean);
          }
          return [];
        };

        const parseDate = (dateValue: any): Date | null => {
          if (!dateValue) return null;
          if (dateValue instanceof Date) return dateValue;
          if (typeof dateValue === 'string') {
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? null : parsed;
          }
          return null;
        };

        const normalized: Ticket = {
          // Map core fields
          code: cr.code || cr.key || '',
          title: cr.title || '',
          status: cr.status || 'Proposed',
          type: cr.type || 'Feature Enhancement',
          priority: cr.priority || 'Medium',
          content: cr.content || '',
          filePath: cr.filePath || cr.path || '',
          
          // Handle dates
          dateCreated: parseDate(cr.dateCreated),
          lastModified: parseDate(cr.lastModified),
          implementationDate: parseDate(cr.implementationDate),
          
          // Map optional fields
          phaseEpic: cr.phaseEpic || '',
          description: cr.description || '',
          rationale: cr.rationale || '',
          assignee: cr.assignee || '',
          implementationNotes: cr.implementationNotes || '',
          
          // Normalize relationship fields to arrays
          relatedTickets: normalizeArray(cr.relatedTickets),
          dependsOn: normalizeArray(cr.dependsOn),
          blocks: normalizeArray(cr.blocks)
        };

        // Debug logging for DEB-894
        if (normalized.code === 'DEB-894') {
          // Debug logging removed
        }
        
        return normalized;
      });

      // Remove duplicates by code to prevent React key conflicts
      const uniqueTickets = convertedTickets.reduce((acc, ticket) => {
        acc.set(ticket.code, ticket);
        return acc;
      }, new Map<string, Ticket>());

      const finalTickets = Array.from(uniqueTickets.values());
      
      setTickets([...finalTickets]);
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
    console.log('setSelectedProjectWithPersistence called with:', project ? { id: project.id, name: project.project.name } : null);
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

  // Update selectedProject when projects array changes (after refresh)
  useEffect(() => {
    if (selectedProject && projects.length > 0) {
      const updatedProject = projects.find(p => p.id === selectedProject.id);
      if (updatedProject && updatedProject !== selectedProject) {
        console.log('Updating selectedProject after refresh:', updatedProject.project.name);
        setSelectedProject(updatedProject);
        selectedProjectRef.current = updatedProject;
      }
    }
  }, [projects, selectedProject]);

  // Set up realtime file watcher (once only)
  useEffect(() => {
    const handleTicketsChange = (data: Ticket[] | Error) => {
      if (data instanceof Error) {
        console.error('❌ Realtime watcher error:', data);
        setError(data);
        return;
      }
      
      const currentProject = selectedProjectRef.current;
      if (currentProject) {
        fetchTicketsForProject(currentProject).catch(err => {
          console.error('❌ Failed to refresh tickets after file change:', err);
        });
      }
    };

    const handleError = (data: Ticket[] | Error) => {
      if (data instanceof Error) {
        console.error('❌ Realtime watcher error:', data);
        setError(data);
      }
    };

    // Configure and start the watcher (only once)
    defaultRealtimeFileWatcher.on('change', handleTicketsChange);
    defaultRealtimeFileWatcher.on('error', handleError);
    
    // Start the watcher if not already started
    const stats = defaultRealtimeFileWatcher.getStats();
    
    if (!stats.isRunning && !stats.isSSEConnected) {
      defaultRealtimeFileWatcher.start().catch(err => {
        console.error('❌ Failed to start realtime file watcher:', err);
      });
    }

    // Cleanup function
    return () => {
      defaultRealtimeFileWatcher.off();
    };
  }, []); // Empty dependency array - run only once

  // Separate effect to handle project changes
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
        phaseEpic: 'Phase A',
        relatedTickets: [],
        dependsOn: [],
        blocks: []
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
    const currentProject = selectedProjectRef.current;
    if (!currentProject) {
      throw new Error('No project selected');
    }

    try {
      setError(null);

      // Create optimistic ticket for return value
      const optimisticTicket: Ticket = {
        code: ticketCode,
        title: '', // Will be filled by backend response
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

      // Determine if we should use PATCH (for small updates) or PUT (for large updates)
      const shouldUsePatch = Object.keys(updates).length <= 3 && 
                           !updates.content && 
                           (updates.status || updates.priority || updates.implementationDate || updates.implementationNotes);

      let response;
      const apiUrl = `/api/projects/${currentProject.id}/crs/${ticketCode}`;
      console.log('updateTicket: Using selectedProject.id =', currentProject.id, 'for ticket', ticketCode);
      console.log('updateTicket: API URL =', apiUrl);
      
      if (shouldUsePatch) {
        // Using PATCH for efficient update
        
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
        
        // Find the current ticket to get its existing data
        const existingTicket = tickets.find(t => t.code === ticketCode);
        if (!existingTicket) {
          throw new Error(`Ticket ${ticketCode} not found`);
        }
        
        // Generate full markdown content from the updated ticket
        const updatedTicketWithContent: Ticket = {
          ...existingTicket,
          ...updates,
          lastModified: new Date(),
          content: existingTicket.content || '',
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
  }, [tickets]);

  // Optimistic update for immediate UI feedback
  const updateTicketOptimistic = useCallback(async (ticketCode: string, updates: Partial<Ticket>): Promise<Ticket> => {
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
    setTickets(prevTickets => 
      prevTickets.map(ticket => 
        ticket.code === ticketCode 
          ? { ...ticket, ...updates, lastModified: new Date() }
          : ticket
      )
    );

    // Fire-and-forget API call - don't await it
    updateTicket(ticketCode, updates).catch(error => {
      console.error('Optimistic update failed, reverting:', error);
      // Revert optimistic update on error
      fetchTicketsForProject(selectedProjectRef.current!);
    });

    // Return immediately with optimistic data
    return optimisticTicket;
  }, [updateTicket]);

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
    console.log('refreshProjects called, fetching projects...');
    await fetchProjects();
    console.log('refreshProjects completed, projects updated');
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
    updateTicketOptimistic,
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