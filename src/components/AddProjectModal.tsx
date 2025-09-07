import React, { useState, useEffect } from 'react';
import { X, Folder, ChevronRight, Home } from 'lucide-react';
import { Button } from './UI/index';

interface Directory {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface DirectoryResponse {
  currentPath: string;
  parentPath: string;
  directories: Directory[];
}

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    path: '',
    description: '',
    repositoryUrl: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [loadingDirectories, setLoadingDirectories] = useState(false);
  const [directoryFilter, setDirectoryFilter] = useState('');
  const [filterBasePath, setFilterBasePath] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        code: '',
        path: '',
        description: '',
        repositoryUrl: ''
      });
      setErrors({});
      setShowDirectoryPicker(false);
      loadDirectories(); // Load home directory initially
    }
  }, [isOpen]);

  // Auto-generate project code from name
  useEffect(() => {
    if (formData.name && !formData.code) {
      const generatedCode = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 6);
      setFormData(prev => ({ ...prev, code: generatedCode }));
    }
  }, [formData.name, formData.code]);

  const loadDirectories = async (path?: string) => {
    setLoadingDirectories(true);
    try {
      const url = path 
        ? `/api/system/directories?path=${encodeURIComponent(path)}`
        : '/api/system/directories';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load directories');
      
      const data: DirectoryResponse = await response.json();
      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setDirectories(data.directories);
      
      // Set filter base path on initial load or reset filter when navigating
      if (!filterBasePath || path) {
        setFilterBasePath(data.currentPath);
        setDirectoryFilter('');
      }
    } catch (error) {
      console.error('Error loading directories:', error);
    } finally {
      setLoadingDirectories(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Project code is required';
    } else if (!/^[A-Z0-9]{2,6}$/.test(formData.code)) {
      newErrors.code = 'Project code must be 2-6 uppercase letters/numbers';
    }

    if (!formData.path.trim()) {
      newErrors.path = 'Project path is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      onProjectCreated();
      onClose();
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create project' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectorySelect = (directory: Directory) => {
    setFormData(prev => ({ ...prev, path: directory.path }));
    setShowDirectoryPicker(false);
  };

  const navigateToDirectory = (path: string) => {
    loadDirectories(path);
  };

  // Filter directories based on current filter (only when in filter base path)
  const filteredDirectories = React.useMemo(() => {
    if (!directoryFilter || currentPath !== filterBasePath) {
      return directories;
    }
    
    return directories.filter(dir => 
      dir.name.toLowerCase().includes(directoryFilter.toLowerCase())
    );
  }, [directories, directoryFilter, currentPath, filterBasePath]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 pointer-events-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-stretch border-b border-border" style={{ padding: '0' }}>
          <div style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center' }}>
            <h2 className="text-xl font-semibold text-foreground">Add New Project</h2>
          </div>
          <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Button variant="ghost" size="sm" onClick={onClose} style={{ width: '40px', height: '40px' }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {showDirectoryPicker ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Select Project Directory</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDirectoryPicker(false)}
                >
                  Cancel
                </Button>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">
                  Current: {currentPath}
                </div>
                {currentPath === filterBasePath && (
                  <input
                    type="text"
                    value={directoryFilter}
                    onChange={(e) => setDirectoryFilter(e.target.value)}
                    placeholder="Filter"
                    className="px-2 py-1 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-24"
                  />
                )}
              </div>

              <div className="border border-border rounded-md max-h-64 overflow-y-auto">
                {parentPath && (
                  <button
                    onClick={() => navigateToDirectory(parentPath)}
                    className="flex items-center w-full p-3 text-left hover:bg-muted transition-colors border-b border-border"
                  >
                    <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>.. (Parent Directory)</span>
                  </button>
                )}

                {loadingDirectories ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading directories...
                  </div>
                ) : (
                  filteredDirectories.map((dir) => (
                    <div key={dir.path} className="flex items-center border-b border-border last:border-b-0">
                      <button
                        onClick={() => navigateToDirectory(dir.path)}
                        className="flex items-center flex-1 p-3 text-left hover:bg-muted transition-colors min-w-0"
                      >
                        <Folder className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{dir.name}</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground flex-shrink-0" />
                      </button>
                      <div className="flex-shrink-0" style={{ padding: '8px', minWidth: '80px' }}>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => handleDirectorySelect(dir)}
                          style={{ width: '100%' }}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="My Awesome Project"
                />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Project Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="MYPROJ"
                  maxLength={6}
                />
                {errors.code && <p className="text-sm text-destructive mt-1">{errors.code}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  2-6 uppercase letters/numbers (auto-generated from name)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Project Path *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.path}
                    onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="/path/to/project"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDirectoryPicker(true)}
                  >
                    <Folder className="h-4 w-4 mr-1" />
                    Browse
                  </Button>
                </div>
                {errors.path && <p className="text-sm text-destructive mt-1">{errors.path}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Brief description of the project"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Repository URL
                </label>
                <input
                  type="url"
                  value={formData.repositoryUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, repositoryUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://github.com/user/repo"
                />
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{errors.submit}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3" style={{ padding: '16px 0 0 0' }}>
                <div style={{ minWidth: '80px' }}>
                  <Button
                    onClick={() => console.log('Refresh clicked')}
                    variant="secondary"
                    style={{ width: '100%' }}
                  >
                    Refresh
                  </Button>
                </div>
                <div style={{ minWidth: '80px' }}>
                  <Button type="button" variant="outline" onClick={onClose} style={{ width: '100%' }}>
                    Cancel
                  </Button>
                </div>
                <div style={{ minWidth: '120px' }}>
                  <Button type="submit" disabled={isSubmitting} style={{ width: '100%' }}>
                    {isSubmitting ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
