import React, { useState, useEffect } from 'react';
import { X, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProjectForm } from './hooks/useProjectForm';
import { FormField } from './components/FormField';
import { StrategyIndicator } from './components/StrategyIndicator';
import { ProjectValidator } from '@mdt/shared/tools/ProjectValidator';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [discoveryPaths, setDiscoveryPaths] = useState<string[]>([]);
  const [isPathInDiscovery, setIsPathInDiscovery] = useState(false);

  // Use the extracted form hook
  const {
    formData,
    errors,
    hasFormData,
    updateField,
    validateForm
  } = useProjectForm(editMode, editProject);

  // Load discovery paths when component mounts
  useEffect(() => {
    if (isOpen) {
      loadDiscoveryPaths();
    }
  }, [isOpen]);

  // Check if path is in discovery when form data changes
  useEffect(() => {
    if (formData.path && discoveryPaths.length > 0) {
      checkPathInDiscovery(formData.path);
    }
  }, [formData.path, discoveryPaths]);

  const loadDiscoveryPaths = async () => {
    try {
      const response = await fetch('/api/config/global');
      if (response.ok) {
        const data = await response.json();
        const paths = data.config?.discovery?.searchPaths || [];
        setDiscoveryPaths(paths);
      }
    } catch (error) {
      console.error('Failed to load discovery paths:', error);
    }
  };

  const checkPathInDiscovery = (path: string) => {
    const expandedPath = ProjectValidator.expandTildePath(path);
    const inDiscovery = discoveryPaths.some(discoveryPath => {
      const expandedDiscoveryPath = ProjectValidator.expandTildePath(discoveryPath);
      return expandedPath.startsWith(expandedDiscoveryPath);
    });
    setIsPathInDiscovery(inDiscovery);
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

  const handleConfirmCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const projectData = {
        name: formData.name,
        code: formData.code,
        path: formData.path,
        crsPath: formData.crsPath,
        description: formData.description,
        repositoryUrl: formData.repositoryUrl,
        useGlobalConfigOnly: formData.useGlobalConfigOnly
      };

      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedFiles(data.createdFiles || []);
        setShowConfirmation(true);
      } else {
        const error = await response.text();
        alert(`Failed to create project: ${error}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onProjectCreated();
      onClose();
    }, 3000);
  };

  const handleCreateAnother = () => {
    setShowSuccess(false);
    // Reset form and continue
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          onClick={handleOverlayClick}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900">
              {editMode ? 'Edit Project' : 'Add New Project'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (hasFormData()) {
                  setShowConfirmClose(true);
                } else {
                  onClose();
                }
              }}
              className="p-2 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Project Name */}
                <FormField
                  label="Project Name"
                  value={formData.name}
                  onChange={(value) => updateField('name', value)}
                  placeholder="Enter project name"
                  error={errors.name}
                  required
                  readOnly={editMode}
                />

                {/* Project Code */}
                <FormField
                  label="Project Code"
                  value={formData.code}
                  onChange={(value) => updateField('code', value)}
                  placeholder="Auto-generated from name"
                  error={errors.code}
                  required
                  readOnly={editMode}
                />

                {/* Project Path with Discovery Indicator */}
                <div>
                  <div className="flex items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Project Path
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    {isPathInDiscovery && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Check className="w-4 h-4 ml-1 text-green-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This path is within configured discovery paths and will be auto-discovered</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <FormField
                    label=""
                    value={formData.path}
                    onChange={(value) => updateField('path', value)}
                    placeholder="/path/to/project or ~/path/to/project"
                    error={errors.path}
                    required
                    readOnly={editMode}
                    className="mt-0"
                  />
                </div>

                {/* Strategy Indicator */}
                {formData.path && !editMode && (
                  <StrategyIndicator
                    path={formData.path}
                    isPathInDiscovery={isPathInDiscovery}
                    discoveryPaths={discoveryPaths}
                  />
                )}

                {/* Global Config Only Checkbox */}
                {!editMode && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="globalConfigOnly"
                      checked={formData.useGlobalConfigOnly}
                      onChange={(e) => updateField('useGlobalConfigOnly', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="globalConfigOnly" className="text-sm font-medium text-gray-700">
                      Use Global Config Only
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Store project configuration only in global registry, no config files in project directory</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {/* Tickets Path */}
                <FormField
                  label="Tickets Directory"
                  value={formData.crsPath}
                  onChange={(value) => updateField('crsPath', value)}
                  placeholder="docs/CRs"
                  error={errors.crsPath}
                  required
                  tooltip="Relative path from project root where tickets will be stored"
                />

                {/* Description */}
                <FormField
                  label="Description"
                  value={formData.description}
                  onChange={(value) => updateField('description', value)}
                  placeholder="Enter project description (optional)"
                  error={errors.description}
                  type="textarea"
                />

                {/* Repository URL */}
                <FormField
                  label="Repository URL"
                  value={formData.repositoryUrl}
                  onChange={(value) => updateField('repositoryUrl', value)}
                  placeholder="https://github.com/username/repo (optional)"
                  error={errors.repositoryUrl}
                  type="url"
                />
              </div>
            </ScrollArea>
          </div>

          {/* Footer */}
          <div className="border-t p-6 flex-shrink-0">
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (hasFormData()) {
                    setShowConfirmClose(true);
                  } else {
                    onClose();
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCreate}
                disabled={isSubmitting || !formData.name || !formData.code || !formData.path}
              >
                {isSubmitting ? 'Creating...' : (editMode ? 'Update Project' : 'Create Project')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Close Dialog */}
      {showConfirmClose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-2">Discard Changes?</h3>
            <p className="text-gray-600 mb-4">
              You have unsaved changes. Are you sure you want to close this dialog?
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowConfirmClose(false)}>
                Keep Editing
              </Button>
              <Button onClick={handleConfirmClose}>
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-2">Confirm Project Creation</h3>
            <div className="mb-4 space-y-2">
              <p><strong>Project Name:</strong> {formData.name}</p>
              <p><strong>Project Code:</strong> {formData.code}</p>
              <p><strong>Project Path:</strong> {formData.path}</p>
              <p><strong>Tickets Path:</strong> {formData.crsPath}</p>
              {formData.useGlobalConfigOnly && (
                <p><strong>Config Mode:</strong> Global Config Only</p>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmSubmit}>
                Create Project
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Project Created Successfully!</h3>
            {createdFiles.length > 0 && (
              <div className="mb-4 text-left">
                <p className="text-sm text-gray-600 mb-2">Created files:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {createdFiles.map((file, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="w-4 h-4 text-green-600 mr-2" />
                      {file}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-center space-x-3">
              <Button variant="outline" onClick={handleCreateAnother}>
                Create Another
              </Button>
              <Button onClick={() => {
                setShowSuccess(false);
                onClose();
              }}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};