import React, { useState, useEffect } from 'react';
import { X, Folder, ChevronRight, Info, Check, Search, FolderOpen } from 'lucide-react';
import { Button } from './UI/index';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './UI/tooltip';
import { ScrollArea } from './UI/scroll-area';
import { ProjectValidator } from '../../shared/tools/ProjectValidator';

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
    repositoryUrl: '',
    useGlobalConfigOnly: false
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
  const [discoveryPaths, setDiscoveryPaths] = useState<string[]>([]);
  const [isPathInDiscovery, setIsPathInDiscovery] = useState(false);

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
          repositoryUrl: editProject.repositoryUrl,
          useGlobalConfigOnly: false
        });
      } else {
        setFormData({
          name: '',
          code: '',
          path: '',
          crsPath: 'docs/CRs',
          description: '',
          repositoryUrl: '',
          useGlobalConfigOnly: false
        });
      }
      setErrors({});
      setShowDirectoryPicker(false);
      setShowConfirmation(false);
      setShowSuccess(false);
      setCreatedFiles([]);
      loadDirectories(); // Load home directory initially
      loadDiscoveryPaths(); // Load discovery paths
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

  // Check if current path is within discovery paths
  useEffect(() => {
    checkPathInDiscovery(formData.path);
  }, [formData.path, discoveryPaths]);

  const loadDirectories = async (path?: string) => {
    setLoadingDirectories(true);
    try {
      const url = path
        ? `/api/directories?path=${encodeURIComponent(path)}`
        : '/api/directories';

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

    // Validate name using shared validator
    const nameValidation = ProjectValidator.validateName(formData.name);
    if (!nameValidation.valid) {
      newErrors.name = nameValidation.error || 'Project name is required';
    }

    // Validate code using shared validator
    const codeValidation = ProjectValidator.validateCode(formData.code);
    if (!codeValidation.valid) {
      newErrors.code = codeValidation.error || 'Project code is required';
    }

    // Validate path using shared validator (with tilde expansion)
    const pathValidation = ProjectValidator.validatePath(formData.path);
    if (!pathValidation.valid) {
      newErrors.path = pathValidation.error || 'Project path is required';
    }

    // Validate tickets path using shared validator
    const ticketsPathValidation = ProjectValidator.validateTicketsPath(formData.crsPath);
    if (!ticketsPathValidation.valid) {
      newErrors.crsPath = ticketsPathValidation.error || 'Tickets directory path is required';
    }

    // Validate description using shared validator (optional field)
    if (formData.description.trim()) {
      const descValidation = ProjectValidator.validateDescription(formData.description);
      if (!descValidation.valid) {
        newErrors.description = descValidation.error || 'Description validation failed';
      }
    }

    // Validate repository URL using shared validator (optional field)
    if (formData.repositoryUrl.trim()) {
      const repoValidation = ProjectValidator.validateRepository(formData.repositoryUrl);
      if (!repoValidation.valid) {
        newErrors.repositoryUrl = repoValidation.error || 'Repository URL validation failed';
      }
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
      // Use validated and normalized paths from shared validators
      const pathValidation = ProjectValidator.validatePath(formData.path);
      const ticketsPathValidation = ProjectValidator.validateTicketsPath(formData.crsPath);
      const codeValidation = ProjectValidator.validateCode(formData.code);
      const nameValidation = ProjectValidator.validateName(formData.name);

      const submissionData = {
        name: nameValidation.normalized || formData.name,
        code: codeValidation.normalized || formData.code,
        path: pathValidation.normalized || formData.path,
        crsPath: ticketsPathValidation.normalized || formData.crsPath,
        description: formData.description.trim(),
        repositoryUrl: formData.repositoryUrl.trim(),
        useGlobalConfigOnly: formData.useGlobalConfigOnly
      };

      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const result = await response.json();

      // Generate list of created files using normalized paths
      const files = [
        `${submissionData.path}/.mdt-config.toml`,
        `${submissionData.path}/.mdt-next`,
        `${submissionData.path}/${submissionData.crsPath}/`,
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

  // Load discovery paths from global config
  const loadDiscoveryPaths = async () => {
    try {
      const response = await fetch('/api/config/global');
      if (response.ok) {
        const config = await response.json();
        const paths = config.discovery?.searchPaths || [];
        setDiscoveryPaths(paths);
        console.log('Discovery paths loaded:', paths);
      }
    } catch (error) {
      console.error('Error loading discovery paths:', error);
    }
  };

  // Check if the selected path is within discovery paths
  const checkPathInDiscovery = (selectedPath: string) => {
    if (!selectedPath || discoveryPaths.length === 0) {
      setIsPathInDiscovery(false);
      return;
    }

    // Expand tilde in selected path for comparison
    const expandedSelectedPath = ProjectValidator.expandTildePath(selectedPath);

    const isInDiscovery = discoveryPaths.some(discoveryPath => {
      try {
        // Expand tilde in discovery path as well
        const expandedDiscoveryPath = ProjectValidator.expandTildePath(discoveryPath);

        // Normalize paths for comparison
        const normalizedSelected = expandedSelectedPath.replace(/\/+$/, '');
        const normalizedDiscovery = expandedDiscoveryPath.replace(/\/+$/, '');

        // Check if selected path is the same as or within a discovery path
        return normalizedSelected === normalizedDiscovery ||
               normalizedSelected.startsWith(normalizedDiscovery + '/');
      } catch (error) {
        console.error('Error checking paths:', error);
        return false;
      }
    });

    setIsPathInDiscovery(isInDiscovery);
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

  const tags = Array.from({ length: 50 }).map(
  (_, i, a) => `v1.2.0-beta.${a.length - i}`
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 pointer-events-auto" onClick={handleOverlayClick}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Fixed Header */}
        <div className="flex items-stretch border-b border-border flex-shrink-0">
          <div className="p-6 flex-1 flex items-center">
            <h2 className="text-xl font-semibold text-foreground">
              {editMode ? 'Edit Project' : 'Add New Project'}
            </h2>
          </div>
          <div className="p-6 flex items-center justify-center">
            <Button variant="ghost" size="sm" onClick={onClose} className="w-10 h-10">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <ScrollArea
          type="hover"
          scrollHideDelay={600}
          className="h-full"
          style={{ height: 'calc(80vh - 180px)' }}
        >
          <div className="p-6">
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

              <div className="border border-border rounded-md">
                <ScrollArea className="max-h-64">
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
                      <div className="flex-shrink-0 p-2 min-w-[80px]">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => handleDirectorySelect(dir)}
                          className="w-full"
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
                  <span className="flex items-center gap-2">
                    Project Path *
                    {isPathInDiscovery && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center text-green-600">
                              <Check className="h-4 w-4" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              This path is within configured discovery paths and will be auto-discovered
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </span>
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
                    placeholder="/path/to/project or ~/path/to/project"
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

              {/* Auto-Detection Strategy Display */}
              {formData.path && (
                <div className={`p-4 rounded-md border ${
                  isPathInDiscovery
                    ? 'bg-green-50 border-green-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 ${
                      isPathInDiscovery ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {isPathInDiscovery ? (
                        <Search className="h-5 w-5" />
                      ) : (
                        <FolderOpen className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium text-sm mb-1 ${
                        isPathInDiscovery ? 'text-green-800' : 'text-blue-800'
                      }`}>
                        {isPathInDiscovery ? 'Auto-Discovery Strategy' : 'Project-First Strategy'}
                      </div>
                      <div className={`text-xs mb-2 ${
                        isPathInDiscovery ? 'text-green-700' : 'text-blue-700'
                      }`}>
                        {isPathInDiscovery
                          ? 'This project will be automatically discovered and available in the project selector.'
                          : 'This project will need to be manually added to the global registry to be available.'
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <strong>How it works:</strong> {isPathInDiscovery
                          ? 'Projects within configured discovery paths are automatically detected and made available without manual registration.'
                          : 'Projects outside discovery paths require explicit registration in the global configuration to be accessible.'
                        }
                      </div>
                      {discoveryPaths.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <strong>Discovery paths:</strong> {discoveryPaths.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!editMode && (
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={formData.useGlobalConfigOnly}
                      onChange={(e) => setFormData(prev => ({ ...prev, useGlobalConfigOnly: e.target.checked }))}
                      className="rounded border-border text-primary focus:ring-primary focus:ring-2"
                    />
                    <span>Use Global Config Only</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Store project configuration only in global registry, no config files in project directory
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tickets Directory *
                </label>
                <input
                  type="text"
                  value={formData.crsPath}
                  onChange={(e) => setFormData(prev => ({ ...prev, crsPath: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.crsPath ? 'border-destructive' : 'border-border'
                  }`}
                  placeholder="docs/CRs"
                />
                {errors.crsPath && <p className="text-sm text-destructive mt-1">{errors.crsPath}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Relative path inside the project where tickets will be stored (e.g., "docs/CRs", "tickets", "bugs")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.description ? 'border-destructive' : 'border-border'
                  }`}
                  rows={3}
                  placeholder="Brief description of the project"
                />
                {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Repository URL
                </label>
                <input
                  type="url"
                  value={formData.repositoryUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, repositoryUrl: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.repositoryUrl ? 'border-destructive' : 'border-border'
                  }`}
                  placeholder="https://github.com/user/repo"
                />
                {errors.repositoryUrl && <p className="text-sm text-destructive mt-1">{errors.repositoryUrl}</p>}
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{errors.submit}</p>
                </div>
              )}
            </div>
          )}
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        {!showDirectoryPicker && (
          <div className="border-t border-border p-6 flex-shrink-0">
            <form onSubmit={handleSubmit}>
              <div className="flex justify-end space-x-3">
                <div className="min-w-[80px]">
                  <Button type="button" variant="outline" onClick={onClose} className="w-full">
                    Cancel
                  </Button>
                </div>
                <div className="min-w-[120px]">
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting
                      ? (editMode ? 'Saving...' : 'Creating...')
                      : (editMode ? 'Save' : 'Create Project')
                    }
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
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
              {formData.useGlobalConfigOnly && <div><strong>Config Mode:</strong> Global Config Only</div>}
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
