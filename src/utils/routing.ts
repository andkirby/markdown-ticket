import { Project } from '../../shared/models/Project';
import { Ticket } from '../types';

export const normalizeTicketKey = (key: string): string => {
  // Validate input
  if (!key || typeof key !== 'string') return '';
  
  // Sanitize: only allow alphanumeric, dash, underscore
  const sanitized = key.replace(/[^a-zA-Z0-9-_]/g, '');
  
  const match = sanitized.match(/^([A-Z]+)-(\d+)$/);
  if (!match) return sanitized;
  return `${match[1]}-${match[2].padStart(3, '0')}`;
};

export const validateProjectCode = (code: string): boolean => {
  if (!code || typeof code !== 'string') return false;
  // Only allow alphanumeric and dash, 2-10 chars
  return /^[A-Z0-9-]{2,10}$/.test(code);
};

export const findProjectByTicketKey = async (ticketKey: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/projects');
    const projects: Project[] = await response.json();
    
    // Fetch all project tickets in parallel
    const ticketPromises = projects.map(async (project) => {
      const ticketsResponse = await fetch(`/api/projects/${project.id}/tickets`);
      const tickets: Ticket[] = await ticketsResponse.json();
      return { project, tickets };
    });
    
    const projectTickets = await Promise.all(ticketPromises);
    
    const normalizedKey = normalizeTicketKey(ticketKey);
    
    // Find project containing the ticket
    for (const { project, tickets } of projectTickets) {
      if (tickets.some((ticket: Ticket) => ticket.code === normalizedKey)) {
        return project.project.code || project.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding project by ticket key:', error);
    return null;
  }
};

export const getCurrentProject = (): string | null => {
  return localStorage.getItem('selectedProject');
};

export const setCurrentProject = (projectCode: string): void => {
  localStorage.setItem('selectedProject', projectCode);
};
