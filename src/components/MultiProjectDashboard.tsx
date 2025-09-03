import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './UI/index';

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

interface CR {
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

const MultiProjectDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [crs, setCrs] = useState<CR[]>([]);
  const [selectedCR, setSelectedCR] = useState<CR | null>(null);
  const [loading, setLoading] = useState(true);
  const [crLoading, setCrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');

  // Form state for CR creation
  const [newCR, setNewCR] = useState({
    title: '',
    type: 'Feature Enhancement',
    priority: 'Medium',
    description: ''
  });

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
      
      // Auto-select first project if none selected
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

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

  // Handle project selection
  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
    setSelectedCR(null);
    setView('list');
    fetchCRs(project);
  }, [fetchCRs]);

  // Create new CR
  const handleCreateCR = useCallback(async () => {
    if (!selectedProject) return;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/projects/${selectedProject.id}/crs`, {
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
      await fetchCRs(selectedProject);
      setView('list');
    } catch (error) {
      console.error('Error creating CR:', error);
      setError(error instanceof Error ? error.message : 'Failed to create CR');
    }
  }, [selectedProject, newCR, fetchCRs]);

  // Delete CR
  const handleDeleteCR = useCallback(async (cr: CR) => {
    if (!selectedProject || !confirm(`Are you sure you want to delete ${cr.code}?`)) return;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/projects/${selectedProject.id}/crs/${cr.code}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete CR: ${response.statusText}`);
      }

      // Refresh CRs
      await fetchCRs(selectedProject);
      
      // Clear selection if deleted CR was selected
      if (selectedCR && selectedCR.code === cr.code) {
        setSelectedCR(null);
        setView('list');
      }
    } catch (error) {
      console.error('Error deleting CR:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete CR');
    }
  }, [selectedProject, selectedCR, fetchCRs]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Proposed': return 'bg-blue-100 text-blue-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Implemented': return 'bg-purple-100 text-purple-800';
      case 'On Hold': return 'bg-gray-100 text-gray-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-600';
      case 'High': return 'text-orange-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-lg text-gray-600">Loading projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Multi-Project CR Dashboard</h1>
          <p className="text-sm text-gray-600">Manage Change Requests across multiple projects</p>
        </div>
        <div className="flex space-x-4">
          <Button 
            onClick={fetchProjects}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
          >
            Refresh Projects
          </Button>
          {selectedProject && view === 'list' && (
            <Button 
              onClick={() => setView('create')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Create CR
            </Button>
          )}
        </div>
      </div>

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

      {/* Project Selector */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-3">Select Project</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedProject?.id === project.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleProjectSelect(project)}
            >
              <div className="font-medium text-gray-800">{project.project.name}</div>
              <div className="text-sm text-gray-600 mt-1">{project.project.description}</div>
              <div className="text-xs text-gray-500 mt-2">
                <div>Path: {project.project.path}</div>
                <div>Registered: {project.metadata.dateRegistered}</div>
                {project.autoDiscovered && (
                  <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs mt-1">
                    Auto-discovered
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {selectedProject && (
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Navigation */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-medium text-gray-800">
                {selectedProject.project.name}
              </h2>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setView('list')}
                  className={`px-3 py-1 rounded text-sm ${
                    view === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  CR List
                </Button>
                {selectedCR && (
                  <Button
                    onClick={() => setView('detail')}
                    className={`px-3 py-1 rounded text-sm ${
                      view === 'detail' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    CR Detail
                  </Button>
                )}
                <Button
                  onClick={() => setView('create')}
                  className={`px-3 py-1 rounded text-sm ${
                    view === 'create' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Create CR
                </Button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {view === 'list' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Change Requests</h3>
                  {selectedProject && (
                    <Button
                      onClick={() => fetchCRs(selectedProject)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Refresh
                    </Button>
                  )}
                </div>

                {crLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600">Loading CRs...</span>
                  </div>
                ) : crs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-lg mb-2">No Change Requests found</div>
                    <div className="text-sm">Create your first CR to get started</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4 font-medium text-gray-700">Code</th>
                          <th className="text-left py-2 px-4 font-medium text-gray-700">Title</th>
                          <th className="text-left py-2 px-4 font-medium text-gray-700">Status</th>
                          <th className="text-left py-2 px-4 font-medium text-gray-700">Priority</th>
                          <th className="text-left py-2 px-4 font-medium text-gray-700">Type</th>
                          <th className="text-left py-2 px-4 font-medium text-gray-700">Created</th>
                          <th className="text-left py-2 px-4 font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crs.map((cr) => (
                          <tr key={cr.code} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-blue-600">{cr.code}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-800">{cr.title}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cr.status)}`}>
                                {cr.status}
                              </span>
                            </td>
                            <td className={`py-3 px-4 font-medium ${getPriorityColor(cr.priority)}`}>
                              {cr.priority}
                            </td>
                            <td className="py-3 px-4 text-gray-600">{cr.type}</td>
                            <td className="py-3 px-4 text-gray-600 text-sm">
                              {cr.dateCreated || 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => {
                                    setSelectedCR(cr);
                                    setView('detail');
                                  }}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                                >
                                  View
                                </Button>
                                <Button
                                  onClick={() => handleDeleteCR(cr)}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
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
                  <h3 className="text-lg font-medium text-gray-800">{selectedCR.title}</h3>
                  <Button
                    onClick={() => setView('list')}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Back to List
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* CR Header */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-600">Code</div>
                        <div className="text-lg font-bold text-blue-600">{selectedCR.code}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Status</div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedCR.status)}`}>
                          {selectedCR.status}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Priority</div>
                        <div className={`font-medium ${getPriorityColor(selectedCR.priority)}`}>
                          {selectedCR.priority}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Type</div>
                        <div className="text-gray-800">{selectedCR.type}</div>
                      </div>
                    </div>
                  </div>

                  {/* CR Content */}
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap bg-white border rounded-lg p-4 text-sm text-gray-700">
                      {selectedCR.content}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {view === 'create' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Create New Change Request</h3>
                  <Button
                    onClick={() => setView('list')}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={newCR.title}
                      onChange={(e) => setNewCR({ ...newCR, title: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter CR title"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type *
                      </label>
                      <select
                        value={newCR.type}
                        onChange={(e) => setNewCR({ ...newCR, type: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={newCR.priority}
                        onChange={(e) => setNewCR({ ...newCR, priority: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newCR.description}
                      onChange={(e) => setNewCR({ ...newCR, description: e.target.value })}
                      rows={4}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe the problem statement and requirements"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      onClick={() => setView('list')}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateCR}
                      disabled={!newCR.title || !newCR.type}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md"
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
  );
};

export default MultiProjectDashboard;