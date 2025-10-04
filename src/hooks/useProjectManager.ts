import { useState, useEffect, useCallback, useRef } from 'react';
import { Ticket } from '../types';
import { Project, ProjectConfig } from '../../shared/models/Project';
import { useSSEEvents } from './useSSEEvents';
import { useTicketOperations } from './useTicketOperations';

interface UseProjectManagerOptions {
  autoSelectFirst?: boolean;
  handleSSEEvents?: boolean;
}

interface UseProjectManagerReturn {
  // Project management
  projects: Project[];
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  refreshProjects: () => Promise<void>;
  
  // Ticket management
  tickets: Ticket[];
  refreshTickets: () => Promise<void>;
  
  // Ticket operations
  createTicket: (title: string, type: string) => Promise<Ticket>;
  updateTicket: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>;
  updateTicketOptimistic: (ticketCode: string, updates: Partial<Ticket>, trackingKey?: string) => Promise<Ticket>;
  deleteTicket: (ticketCode: string) => Promise<void>;
  
  // State
  loading: boolean;
  error: Error | null;
  clearError: () => void;
  
  // Project configuration
  projectConfig: ProjectConfig | null;
}

export function useProjectManager(options: UseProjectManagerOptions = {}): UseProjectManagerReturn {
  const { autoSelectFirst = true, handleSSEEvents = false } = options;
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const selectedProjectRef = useRef<Project | null>(null);

  // Fetch tickets for a specific project
  const fetchTicketsForProject = useCallback(async (project: Project): Promise<void> => {
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${project.id}/crs`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const projectTickets = await response.json();
      setTickets(projectTickets);
    } catch (error) {
      console.error('Failed to fetch tickets for project:', project.project.name, error);
      throw error;
    }
  }, []);

  // Set up SSE events if this instance should handle them
  const updateTicketInState = useCallback((ticketData: Ticket) => {
    setTickets(prev => prev.map(ticket =>
      ticket.code === ticketData.code ? { ...ticket, ...ticketData } : ticket
    ));
  }, []);

  const sseEvents = handleSSEEvents ? useSSEEvents(fetchTicketsForProject, updateTicketInState) : null;
  
  // Set up ticket operations
  const ticketOps = useTicketOperations(
    selectedProject,
    tickets,
    setTickets,
    fetchTicketsForProject,
    sseEvents?.trackUserUpdate || (() => {})
  );

  // Update refs when selectedProject changes
  useEffect(() => {
    selectedProjectRef.current = selectedProject;
    if (sseEvents) {
      sseEvents.selectedProjectRef.current = selectedProject;
    }
  }, [selectedProject, sseEvents]);

  // Fetch all projects
  const fetchProjects = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const allProjects = await response.json();
      setProjects(allProjects);
      
      // Auto-select first project if none selected and autoSelectFirst is enabled
      if (autoSelectFirst && allProjects.length > 0 && !selectedProjectRef.current) {
        setSelectedProjectState(allProjects[0]);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }
  }, [autoSelectFirst]); // Removed selectedProject and ticketOps dependencies

  // Fetch project configuration
  const fetchProjectConfig = useCallback(async (project: Project): Promise<void> => {
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${project.id}/config`);
      if (!response.ok) {
        if (response.status === 404) {
          setProjectConfig(null);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const config = await response.json();
      setProjectConfig(config);
    } catch (error) {
      console.error('Failed to fetch project config:', error);
      setProjectConfig(null);
    }
  }, []);

  // Initialize projects on mount
  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, [fetchProjects]);

  // Handle project selection changes
  useEffect(() => {
    if (selectedProject) {
      // Clear tickets immediately to prevent showing wrong project's tickets
      setTickets([]);

      // Load tickets immediately for fast UI response
      fetchTicketsForProject(selectedProject).catch(err => {
        console.error('Failed to load tickets:', selectedProject.project.name, err);
      });

      // Load config in parallel (non-blocking)
      fetchProjectConfig(selectedProject).catch(err => {
        console.error('Failed to load project config:', selectedProject.project.name, err);
      });
    } else {
      // No project selected - clear tickets
      setTickets([]);
      setProjectConfig(null);
    }
  }, [selectedProject, fetchProjectConfig, fetchTicketsForProject]);

  const setSelectedProject = useCallback((project: Project | null) => {
    setSelectedProjectState(project);
  }, []);

  const refreshProjects = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);

  const refreshTickets = useCallback(async () => {
    if (selectedProject) {
      await fetchTicketsForProject(selectedProject);
    }
  }, [selectedProject, fetchTicketsForProject]);

  return {
    projects,
    selectedProject,
    setSelectedProject,
    refreshProjects,
    tickets,
    refreshTickets,
    createTicket: ticketOps.createTicket,
    updateTicket: ticketOps.updateTicket,
    updateTicketOptimistic: ticketOps.updateTicketOptimistic,
    deleteTicket: ticketOps.deleteTicket,
    loading,
    error: ticketOps.error,
    clearError: ticketOps.clearError,
    projectConfig
  };
}
