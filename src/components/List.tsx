import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import showdown from 'showdown';
import { Button } from './UI/index';
import { useEventBus } from '../services/eventBus';
import { SortControls } from './SortControls';
import { HamburgerMenu } from './HamburgerMenu';
import { AddProjectModal } from './AddProjectModal';
import { getSortPreferences, setSortPreferences, SortPreferences } from '../config/sorting';
import { sortTickets } from '../utils/sorting';
import { getProjectCode } from './ProjectSelector';
import { Ticket } from '../../shared/models/Ticket';
import { Project } from '../../shared/models/Project';

interface LocalCR {
  filename: string;
  path: string;
  title: string;
  code: string;
  status: string;
  priority: string;
  type: string;
  dateCreated: string | null;
  header: Record<string, string>;
  content: string;
}

interface ListProps {
  selectedProject?: Project | null;
}

const List: React.FC<ListProps> = ({ selectedProject: propSelectedProject }) => {
  const STORAGE_KEY = 'list.selectedProjectId';

  const [projects, setProjects] = useState<Project[]>([]);
  const [crs, setCrs] = useState<Ticket[]>([]);
  const [selectedCR, setSelectedCR] = useState<Ticket | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  
  // Use prop selectedProject if provided, otherwise use internal state
  const selectedProject = propSelectedProject || null;
  const [loading, setLoading] = useState(true);
  const [crLoading, setCrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [sortPreferences, setSortPreferencesState] = useState<SortPreferences>(getSortPreferences);

  // Use ref to prevent stale closure bug when switching projects
  const selectedProjectRef = useRef<Project | null>(selectedProject);

  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  // Form state for CR creation
  const [newCR, setNewCR] = useState({
    title: '',
    type: 'Feature Enhancement',
    priority: 'Medium',
    description: ''
  });

  // Save preferences when they change
  const handleSortPreferencesChange = (newPreferences: SortPreferences) => {
    setSortPreferencesState(newPreferences);
    setSortPreferences(newPreferences);
  };

  // Markdown converter for ticket content
  const converter = useMemo(() => {
    return new showdown.Converter({
      tables: true,
      tasklists: true,
      ghCodeBlocks: true,
      simpleLineBreaks: true,
      headerLevelStart: 3, // Start headers from h3 to avoid conflicts
    });
  }, []);

  // Convert selected CR content to HTML
  const selectedCRContentHtml = useMemo(() => {
    if (!selectedCR?.content) return '';
    return converter.makeHtml(selectedCR.content);
  }, [selectedCR?.content, converter]);

  // Fetch projects on component mount
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const projectsData = await response.json();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch CRs for selected project
  const fetchCRs = useCallback(async (project: Project) => {
    try {
      setCrLoading(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${project.id}/crs`);
      if (!response.ok) {
        throw new Error(`Failed to fetch CRs: ${response.statusText}`);
      }
      
      const crsData = await response.json();
      setCrs(crsData);
    } catch (error) {
      console.error('Error fetching CRs:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch CRs');
      setCrs([]);
    } finally {
      setCrLoading(false);
    }
  }, []);

  // Create new CR
  const handleCreateCR = useCallback(async () => {
    const currentProject = selectedProjectRef.current;
    if (!currentProject) return;

    try {
      setError(null);

      const response = await fetch(`/api/projects/${currentProject.id}/crs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCR),
      });

      if (!response.ok) {
        throw new Error(`Failed to create CR: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('CR created:', result);
      
      // Reset form
      setNewCR({
        title: '',
        type: 'Feature Enhancement',
        priority: 'Medium',
        description: ''
      });

      // Refresh CRs and go back to list
      await fetchCRs(currentProject);
      setView('list');
    } catch (error) {
      console.error('Error creating CR:', error);
      setError(error instanceof Error ? error.message : 'Failed to create CR');
    }
  }, [newCR, fetchCRs]); // Removed selectedProject - using ref instead

  // Convert LocalCR to Ticket for API calls
  const convertToTicket = (localCR: LocalCR): Ticket => ({
    code: localCR.code,
    title: localCR.title,
    status: localCR.status,
    type: localCR.type,
    priority: localCR.priority,
    dateCreated: localCR.dateCreated ? new Date(localCR.dateCreated) : null,
    lastModified: null,
    content: localCR.content,
    filePath: localCR.path,
    relatedTickets: [],
    dependsOn: [],
    blocks: []
  });

  // Delete CR
  const handleDeleteCR = useCallback(async (ticket: Ticket) => {
    const currentProject = selectedProjectRef.current;
    if (!currentProject || !confirm(`Are you sure you want to delete ${ticket.code}?`)) return;

    try {
      setError(null);

      const response = await fetch(`/api/projects/${currentProject.id}/crs/${ticket.code}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete CR: ${response.statusText}`);
      }

      // Refresh CRs
      await fetchCRs(currentProject);

      // Clear selection if deleted CR was selected
      if (selectedCR && selectedCR.code === ticket.code) {
        setSelectedCR(null);
        setView('list');
      }
    } catch (error) {
      console.error('Error deleting CR:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete CR');
    }
  }, [selectedCR, fetchCRs]); // Removed selectedProject - using ref instead

  // Initialize dashboard
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch CRs when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchCRs(selectedProject);
    }
  }, [selectedProject, fetchCRs]);

  // Set up event listeners for real-time updates
  useEventBus('ticket:created', () => {
    if (selectedProject) {
      fetchCRs(selectedProject).catch(err => {
        console.error('❌ Failed to refresh CRs after creation:', err);
      });
    }
    fetchProjects().catch(err => {
      console.error('❌ Failed to refresh projects after creation:', err);
    });
  });

  useEventBus('ticket:updated', () => {
    if (selectedProject) {
      fetchCRs(selectedProject).catch(err => {
        console.error('❌ Failed to refresh CRs after update:', err);
      });
    }
  });

  useEventBus('ticket:deleted', () => {
    if (selectedProject) {
      fetchCRs(selectedProject).catch(err => {
        console.error('❌ Failed to refresh CRs after deletion:', err);
      });
    }
  });

  useEventBus('project:created', () => {
    fetchProjects().catch(err => {
      console.error('❌ Failed to refresh projects after creation:', err);
    });
  });

  useEventBus('error:api', (event) => {
    console.error('❌ API Error:', event.payload.message);
    setError(event.payload.message);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Proposed': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Approved': return 'bg-green-50 text-green-700 border border-green-200';
      case 'In Progress': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'Implemented': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'On Hold': return 'bg-gray-50 text-gray-700 border border-gray-200';
      case 'Rejected': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-destructive';
      case 'High': return 'text-orange-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-lg text-muted-foreground">Loading projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 border-b border-border">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            {selectedProject?.project.name || 'List View'}
          </h1>
          <div className="flex items-center space-x-4">
            {selectedProject && view === 'list' && (
              <SortControls
                preferences={sortPreferences}
                onPreferencesChange={handleSortPreferencesChange}
              />
            )}
            <Button
              onClick={fetchProjects}
              variant="secondary"
            >
              Refresh
            </Button>
            <HamburgerMenu
              onAddProject={() => setShowAddProjectModal(true)}
              onEditProject={() => setShowEditProjectModal(true)}
              onCounterAPI={() => console.log('Counter API clicked from List')}
              hasActiveProject={!!selectedProject}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 py-3 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 text-md font-medium mb-2">Error</div>
          <div className="text-red-600">{error}</div>
          <Button 
            onClick={() => setError(null)}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Content */}
      {selectedProject && (
        <div className="bg-card rounded-lg shadow-sm border border-border">
          {/* Content Area */}
          <div className="p-6">
            {view === 'list' && (
              <div>
                {crLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-muted-foreground">Loading CRs...</span>
                  </div>
                ) : crs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="text-lg mb-2">No Change Requests found</div>
                    <div className="text-sm">Create your first CR to get started</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-4 font-medium text-muted-foreground">Code</th>
                          <th className="text-left py-2 px-4 font-medium text-muted-foreground">Title</th>
                          <th className="text-left py-2 px-4 font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-2 px-4 font-medium text-muted-foreground">Priority</th>
                          <th className="text-left py-2 px-4 font-medium text-muted-foreground">Type</th>
                          <th className="text-left py-2 px-4 font-medium text-muted-foreground">Created</th>
                          <th className="text-left py-2 px-4 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crs
                          .map(cr => ({
                            ...cr,
                            dateCreated: cr.dateCreated ? (typeof cr.dateCreated === 'string' ? new Date(cr.dateCreated) : cr.dateCreated) : new Date(),
                            lastModified: cr.lastModified ? (typeof cr.lastModified === 'string' ? new Date(cr.lastModified) : cr.lastModified) : new Date()
                          }))
                          .sort((a, b) => {
                            // Simple sorting by code for now
                            return b.code.localeCompare(a.code);
                          })
                          .map((ticket) => (
                          <tr key={ticket.code} className="border-b border-border hover:bg-accent/50">
                            <td className="py-3 px-4 font-medium text-primary">{ticket.code}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-card-foreground">{ticket.title}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                {ticket.status}
                              </span>
                            </td>
                            <td className={`py-3 px-4 font-medium ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{ticket.type}</td>
                            <td className="py-3 px-4 text-muted-foreground text-sm">
                              {ticket.dateCreated ? (ticket.dateCreated instanceof Date ? ticket.dateCreated.toLocaleDateString() : new Date(ticket.dateCreated).toLocaleDateString()) : 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => {
                                    setSelectedCR(ticket);
                                    setView('detail');
                                  }}
                                  className="btn btn-primary px-2 py-1 text-xs"
                                >
                                  View
                                </Button>
                                <Button
                                  onClick={() => handleDeleteCR(ticket)}
                                  className="btn btn-destructive px-2 py-1 text-xs"
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {view === 'detail' && selectedCR && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-card-foreground">{selectedCR.title}</h3>
                  <Button
                    onClick={() => setView('list')}
                    variant="secondary"
                  >
                    Back to List
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* CR Header */}
                  <div className="bg-accent rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Code</div>
                        <div className="text-lg font-bold text-primary">{selectedCR.code}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Status</div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedCR.status)}`}>
                          {selectedCR.status}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Priority</div>
                        <div className={`font-medium ${getPriorityColor(selectedCR.priority)}`}>
                          {selectedCR.priority}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Type</div>
                        <div className="text-card-foreground">{selectedCR.type}</div>
                      </div>
                    </div>
                  </div>

                  {/* CR Content */}
                  <div className="prose prose-sm max-w-none prose-headings:text-card-foreground dark:prose-headings:text-white prose-p:text-card-foreground/80 dark:prose-p:text-gray-300 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-strong:text-card-foreground dark:prose-strong:text-gray-100 prose-code:bg-gray-100 dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-gray-900 dark:prose-code:text-gray-100 prose-pre:bg-gray-100 dark:prose-pre:bg-slate-800 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-slate-700 prose-blockquote:text-card-foreground/70 dark:prose-blockquote:text-gray-300 prose-li:text-card-foreground/80 dark:prose-li:text-gray-300 prose-ol:text-card-foreground/80 dark:prose-ol:text-gray-300 prose-ul:text-card-foreground/80 dark:prose-ul:text-gray-300 bg-card border border-border rounded-lg p-4">
                    <div className="text-sm" dangerouslySetInnerHTML={{ __html: selectedCRContentHtml }} />
                  </div>
                </div>
              </div>
            )}

            {view === 'create' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-card-foreground">Create New Change Request</h3>
                  <Button
                    onClick={() => setView('list')}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={newCR.title}
                      onChange={(e) => setNewCR({ ...newCR, title: e.target.value })}
                      className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      placeholder="Enter CR title"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-1">
                        Type *
                      </label>
                      <select
                        value={newCR.type}
                        onChange={(e) => setNewCR({ ...newCR, type: e.target.value })}
                        className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                        required
                      >
                        <option value="Feature Enhancement">Feature Enhancement</option>
                        <option value="Bug Fix">Bug Fix</option>
                        <option value="Technical Debt">Technical Debt</option>
                        <option value="Architecture">Architecture</option>
                        <option value="Documentation">Documentation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-1">
                        Priority
                      </label>
                      <select
                        value={newCR.priority}
                        onChange={(e) => setNewCR({ ...newCR, priority: e.target.value })}
                        className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      value={newCR.description}
                      onChange={(e) => setNewCR({ ...newCR, description: e.target.value })}
                      rows={4}
                      className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      placeholder="Describe the problem statement and requirements"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      onClick={() => setView('list')}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateCR}
                      disabled={!newCR.title || !newCR.type}
                      variant="default"
                    >
                      Create CR
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {projects.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg mb-2">No projects found</div>
          <div className="text-sm">Register a project to get started</div>
        </div>
      )}
      </div>

      <AddProjectModal
        isOpen={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        onProjectCreated={() => {
          fetchProjects();
          setShowAddProjectModal(false);
        }}
      />

      {selectedProject && (
        <AddProjectModal
          isOpen={showEditProjectModal}
          onClose={() => setShowEditProjectModal(false)}
          onProjectCreated={() => {
            fetchProjects();
            setShowEditProjectModal(false);
          }}
          editMode={true}
          editProject={{
            name: selectedProject.project.name,
            code: getProjectCode(selectedProject),
            path: selectedProject.project.path,
            crsPath: 'docs/CRs',
            description: selectedProject.project.description || '',
            repositoryUrl: ''
          }}
        />
      )}
    </div>
  );
};

export default List;