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
  editMode?: boolean;
  editProject?: {
    name: string;
    code: string;
    path: string;
    crsPath: string;
    description: string;
    repositoryUrl: string;
  };
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
  editMode = false,
  editProject
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    path: '',
    crsPath: 'docs/CRs',
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
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const hasFormData = () => {
    return formData.name.trim() !== '' || 
           formData.code.trim() !== '' || 
           formData.description.trim() !== '' || 
           formData.path.trim() !== '';
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (hasFormData()) {
        setShowConfirmClose(true);
      } else {
        onClose();
      }
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editMode && editProject) {
        setFormData({
          name: editProject.name,
          code: editProject.code,
          path: editProject.path,
          crsPath: editProject.crsPath,
          description: editProject.description,
          repositoryUrl: editProject.repositoryUrl
        });
      } else {
        setFormData({
          name: '',
          code: '',
          path: '',
          crsPath: 'docs/CRs',
          description: '',
          repositoryUrl: ''
        });
      }
      setErrors({});
      setShowDirectoryPicker(false);
      setShowConfirmation(false);
      setShowSuccess(false);
      setCreatedFiles([]);
      loadDirectories(); // Load home directory initially
    }
  }, [isOpen]);

  // Auto-generate project code from name (only in add mode)
  useEffect(() => {
    if (!editMode && formData.name && !formData.code) {
      const generatedCode = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 6);
      setFormData(prev => ({ ...prev, code: generatedCode }));
    }
  }, [formData.name, formData.code, editMode]);

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

    if (editMode) {
      // Skip confirmation for edit mode and save directly
      await handleSave();
    } else {
      // Show confirmation for create mode
      setShowConfirmation(true);
    }
  };

  const handleConfirmCreate = async () => {
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

      const result = await response.json();
      
      // Generate list of created files
      const files = [
        `${formData.path}/.mdt-config.toml`,
        `${formData.path}/.mdt-next`,
        `${formData.path}/${formData.crsPath}/`,
        result.configPath
      ];
      
      setCreatedFiles(files);
      setShowConfirmation(false);
      setShowSuccess(true);
      
      // Notify parent component to refresh projects list
      onProjectCreated();
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create project' });
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // For edit mode, we only update the editable fields
      const updateData = {
        name: formData.name,
        crsPath: formData.crsPath,
        description: formData.description,
        repositoryUrl: formData.repositoryUrl
      };

      const response = await fetch(`/api/projects/${formData.code}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project');
      }

      console.log('Project update successful, calling onProjectCreated...');
      // Close modal and trigger refresh
      onProjectCreated();
      onClose();
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to update project' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onProjectCreated();
    onClose();
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
    <div className="fixed inset-0 bg-black/50 z-50 pointer-events-auto" onClick={handleOverlayClick}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-stretch border-b border-border" style={{ padding: '0' }}>
          <div style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center' }}>
            <h2 className="text-xl font-semibold text-foreground">
              {editMode ? 'Edit Project' : 'Add New Project'}
            </h2>
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
                  className={`w-full px-3 py-2 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    editMode 
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : 'bg-background'
                  }`}
                  placeholder="MYPROJ"
                  maxLength={6}
                  readOnly={editMode}
                  disabled={editMode}
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
                    className={`flex-1 px-3 py-2 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      editMode 
                        ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                        : 'bg-background'
                    }`}
                    placeholder="/path/to/project"
                    readOnly={editMode}
                    disabled={editMode}
                  />
                  {!editMode && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDirectoryPicker(true)}
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      Browse
                    </Button>
                  )}
                </div>
                {errors.path && <p className="text-sm text-destructive mt-1">{errors.path}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tickets Directory
                </label>
                <input
                  type="text"
                  value={formData.crsPath}
                  onChange={(e) => setFormData(prev => ({ ...prev, crsPath: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="docs/CRs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Relative path inside the project where tickets will be stored
                </p>
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
                  <Button type="button" variant="outline" onClick={onClose} style={{ width: '100%' }}>
                    Cancel
                  </Button>
                </div>
                <div style={{ minWidth: '120px' }}>
                  <Button type="submit" disabled={isSubmitting} style={{ width: '100%' }}>
                    {isSubmitting 
                      ? (editMode ? 'Saving...' : 'Creating...') 
                      : (editMode ? 'Save' : 'Create Project')
                    }
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmClose && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
          <div className="bg-background border border-border rounded-lg shadow-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Discard Changes?</h3>
            <p className="text-muted-foreground mb-6">
              You have unsaved changes. Are you sure you want to close without saving?
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowConfirmClose(false)}>
                Keep Editing
              </Button>
              <Button variant="destructive" onClick={handleConfirmClose}>
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Project Creation Confirmation */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
          <div className="bg-background border border-border rounded-lg shadow-lg p-6 max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Confirm Project Creation</h3>
            <div className="space-y-3 mb-6">
              <div><strong>Name:</strong> {formData.name}</div>
              <div><strong>Code:</strong> {formData.code}</div>
              <div><strong>Path:</strong> {formData.path}</div>
              <div><strong>Tickets Directory:</strong> {formData.crsPath}</div>
              {formData.description && <div><strong>Description:</strong> {formData.description}</div>}
              {formData.repositoryUrl && <div><strong>Repository:</strong> {formData.repositoryUrl}</div>}
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will create the project configuration files and directory structure.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmCreate} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Confirm Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
          <div className="bg-background border border-border rounded-lg shadow-lg p-6 max-w-lg">
            <h3 className="text-lg font-semibold mb-4 text-green-600">Project Created Successfully!</h3>
            <p className="mb-4">The following files have been created:</p>
            <div className="bg-muted p-3 rounded-md mb-6 max-h-48 overflow-y-auto">
              {createdFiles.map((file, index) => (
                <div key={index} className="text-sm font-mono py-1">
                  {file}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSuccessClose}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
