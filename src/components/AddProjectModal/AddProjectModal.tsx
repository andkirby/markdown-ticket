import { Check, Info, X } from 'lucide-react'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { usePathResolution } from '@/hooks/usePathResolution'
import { eventBus } from '@/services/eventBus'
import { FormField } from './components/FormField'
import { useProjectForm } from './hooks/useProjectForm'

interface AddProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: () => void
  editMode?: boolean
  editProject?: {
    name: string
    code: string
    path: string
    crsPath: string
    description: string
    repositoryUrl: string
  }
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
  editMode = false,
  editProject,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 🔐 Simplified path resolution hook - uses enhanced API
  const { checkPath } = usePathResolution()
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [createdFiles, setCreatedFiles] = useState<string[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [_discoveryPaths, setDiscoveryPaths] = useState<string[]>([])
  const [isPathInDiscovery, setIsPathInDiscovery] = useState(false)
  const [pathExists, setPathExists] = useState(false)

  // Use the extracted form hook
  const {
    formData,
    errors,
    hasFormData,
    updateField,
    validateForm,
  } = useProjectForm(editMode, editProject)

  const loadDiscoveryPaths = async () => {
    try {
      const response = await fetch('/api/config/global')
      if (response.ok) {
        const data = await response.json()
        const paths = data.discovery?.searchPaths || []
        setDiscoveryPaths(paths)
      }
    }
    catch (error) {
      console.error('Failed to load discovery paths:', error)
    }
  }

  // Load discovery paths when component mounts
  useEffect(() => {
    if (isOpen) {
      loadDiscoveryPaths()
    }
  }, [isOpen])

  // Check path when form data changes using simplified hook
  useEffect(() => {
    const timerRef = { id: undefined as ReturnType<typeof setTimeout> | undefined }

    const updateState = (exists: boolean, inDiscovery: boolean) => {
      timerRef.id = setTimeout(() => {
        setPathExists(exists)
        setIsPathInDiscovery(inDiscovery)
      }, 0)
    }

    if (formData.path) {
      checkPath(formData.path).then((result) => {
        updateState(result.exists, result.isInDiscovery)
      }).catch(console.error)
    }
    else {
      updateState(false, false)
    }

    return () => {
      if (timerRef.id) {
        clearTimeout(timerRef.id)
      }
    }
  }, [formData.path, checkPath])

  const handleSmartClose = () => {
    if (hasFormData()) {
      setShowConfirmClose(true)
    }
    else {
      onClose()
    }
  }

  const handleConfirmClose = () => {
    setShowConfirmClose(false)
    onClose()
  }

  const handleConfirmCreate = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      if (editMode) {
        const response = await fetch(`/api/projects/${encodeURIComponent(formData.code)}/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            repository: formData.repositoryUrl,
          }),
        })

        if (response.ok) {
          const project = await response.json()
          setCreatedFiles([])
          eventBus.emit('project:changed', {
            projectId: formData.code,
            project,
            timestamp: Date.now(),
          }, 'ui')
          setShowSuccess(true)
        }
        else {
          const error = await response.text()
          // eslint-disable-next-line no-alert
          alert(`Failed to update project: ${error}`)
        }

        return
      }

      const projectData = {
        name: formData.name,
        code: formData.code,
        path: formData.path,
        ticketsPath: formData.crsPath,
        description: formData.description,
        repository: formData.repositoryUrl,
        createProjectPath: true, // Always auto-create project path
        globalOnly: formData.useGlobalConfigOnly,
      }

      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      })

      if (response.ok) {
        const data = await response.json()
        setCreatedFiles(data.createdFiles || [])
        setShowConfirmation(true)
      }
      else {
        const error = await response.text()
        // eslint-disable-next-line no-alert
        alert(`Failed to create project: ${error}`)
      }
    }
    catch (error) {
      console.error('Error creating project:', error)
      // eslint-disable-next-line no-alert
      alert('Failed to create project. Please try again.')
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false)
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      onProjectCreated()
      onClose()
    }, 3000)
  }

  const handleCreateAnother = () => {
    setShowSuccess(false)
    // Reset form and continue
  }

  if (!isOpen)
    return null

  return (
    <>
      {/* Main form modal */}
      <Modal
        isOpen={isOpen && !showConfirmClose && !showConfirmation && !showSuccess}
        onClose={handleSmartClose}
        closeOnOverlayClick={false}
        size="lg"
        data-testid={editMode ? 'edit-project-modal' : 'add-project-modal'}
      >
        <ModalHeader
          title={editMode ? 'Edit Project' : 'Add New Project'}
          onClose={handleSmartClose}
        />

        {/* Scrollable Content */}
        <ScrollArea
          type="hover"
          scrollHideDelay={600}
          className="h-full"
          style={{ height: 'calc(100vh - 300px)' }}
        >
          <div className="p-6 space-y-6">
            {/* Project Name */}
            {/**
              * @testid project-name-input — Input for project name
              */}
            <FormField
              label="Project Name"
              value={formData.name}
              onChange={value => updateField('name', value)}
              placeholder="Enter project name"
              error={errors.name}
              required
              testId="project-name-input"
            />

            {/* Project Code */}
            {/**
              * @testid project-code-input — Input for project code
              */}
            <FormField
              label="Project Code"
              value={formData.code}
              onChange={value => updateField('code', value)}
              placeholder="Auto-generated from name"
              error={errors.code}
              required
              readOnly={editMode}
              testId="project-code-input"
            />

            {/* Project Path with Discovery Indicator */}
            <div className="w-full">
              <div className="flex items-center mb-1">
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project Path
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className={`w-4 h-4 ml-2 cursor-help transition-all duration-300 ${
                          isPathInDiscovery && !editMode
                            ? 'text-green-600 dark:text-green-400 drop-shadow-lg animate-pulse'
                            : 'text-gray-400'
                        }`}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-2">Project Path & Configuration</p>
                        <p className="text-sm mb-2">
                          <strong>Path Validation:</strong>
                          {' '}
                          ✓ indicates a valid path format, ✗ indicates an invalid path.
                        </p>
                        <p className="text-sm mb-2">
                          <strong>Global Config:</strong>
                          {' '}
                          Store project configuration only in global registry
                          (~/.config/markdown-ticket), with no local config files in project directory.
                        </p>
                        <p className="text-sm">
                          <strong>Auto-Discovery:</strong>
                          {' '}
                          When path is within configured discovery search paths
                          (shown as glowing green info icon), project will be automatically discovered.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {!editMode && (
                  <div className="flex items-center ml-6">
                    <div className="border-l border-gray-300 mx-3 h-4" />
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="globalConfigOnly"
                        checked={formData.useGlobalConfigOnly}
                        onChange={e => updateField('useGlobalConfigOnly', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="globalConfigOnly" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Global Config Only
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <FormField
                label=""
                value={formData.path}
                onChange={value => updateField('path', value)}
                placeholder="/path/to/project or ~/path/to/project"
                error={errors.path}
                required
                readOnly={editMode}
                className="mt-0 w-full"
                showFolderBrowser={!editMode}
                showPathStatus={true}
                pathExists={pathExists}
                containerClassName="w-full"
                testId="project-path-input"
                folderBrowseTestId="project-path-browse-button"
              />
            </div>

            {/* Tickets Path */}
            <FormField
              label="Tickets Directory"
              value={formData.crsPath}
              onChange={value => updateField('crsPath', value)}
              placeholder="docs/CRs"
              error={errors.crsPath}
              required
              readOnly={editMode}
              tooltip="Relative path from project root where tickets will be stored"
            />

            {/* Description */}
            <FormField
              label="Description"
              value={formData.description}
              onChange={value => updateField('description', value)}
              placeholder="Enter project description (optional)"
              error={errors.description}
              type="textarea"
            />

            {/* Repository URL */}
            <FormField
              label="Repository URL"
              value={formData.repositoryUrl}
              onChange={value => updateField('repositoryUrl', value)}
              placeholder="https://github.com/username/repo (optional)"
              error={errors.repositoryUrl}
              type="url"
            />
          </div>
        </ScrollArea>

        {/* Footer */}
        <ModalFooter>
          {/**
            * @testid project-cancel-button — Cancel button in project modal
            */}
          <Button
            variant="outline"
            onClick={handleSmartClose}
            data-testid="project-cancel-button"
          >
            Cancel
          </Button>
          {/**
            * @testid project-submit-button — Submit button in project modal
            */}
          <Button
            onClick={handleConfirmCreate}
            disabled={isSubmitting || !formData.name || !formData.code || !formData.path}
            data-testid="project-submit-button"
          >
            {isSubmitting ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Project' : 'Create Project')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Close Dialog — Pattern C */}
      <Modal isOpen={showConfirmClose} onClose={() => setShowConfirmClose(false)} size="sm">
        <ModalBody>
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Discard Changes?</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You have unsaved changes. Are you sure you want to close this dialog?
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowConfirmClose(false)}>
              Keep Editing
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClose}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
            >
              Discard Changes
            </Button>
          </ModalFooter>
        </ModalBody>
      </Modal>

      {/* Confirmation Dialog — Pattern C */}
      <Modal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)} size="sm" data-testid="confirm-creation-dialog">
        <ModalBody>
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Confirm Project Creation</h3>
          <div className="mb-4 space-y-2">
            <p>
              <strong>Project Name:</strong>
              {' '}
              {formData.name}
            </p>
            <p>
              <strong>Project Code:</strong>
              {' '}
              {formData.code}
            </p>
            <p>
              <strong>Project Path:</strong>
              {' '}
              {formData.path}
            </p>
            <p>
              <strong>Tickets Path:</strong>
              {' '}
              {formData.crsPath}
            </p>
            {formData.useGlobalConfigOnly && (
              <p>
                <strong>Config Mode:</strong>
                {' '}
                Global Config Only
              </p>
            )}
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
            {/**
              * @testid confirm-creation-button — Confirm button to create project
              */}
            <Button data-testid="confirm-creation-button" onClick={handleConfirmSubmit}>
              Create Project
            </Button>
          </ModalFooter>
        </ModalBody>
      </Modal>

      {/* Success Dialog — Pattern C */}
      <Modal isOpen={showSuccess} onClose={() => setShowSuccess(false)} size="sm" data-testid="success-dialog">
        <ModalBody>
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white text-center">
            {editMode ? 'Project Updated Successfully!' : 'Project Created Successfully!'}
          </h3>
          {createdFiles.length > 0 && (
            <div className="mb-4 text-left">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Created files:</p>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                {createdFiles.map(file => (
                  <li key={file} className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ModalFooter justify="center">
            <Button variant="outline" onClick={handleCreateAnother}>
              Create Another
            </Button>
            {/**
              * @testid success-done-button — Done button to close success dialog
              */}
            <Button
              data-testid="success-done-button"
              onClick={() => {
                setShowSuccess(false)
                if (editMode) {
                  onProjectCreated()
                }
                else {
                  onClose()
                }
              }}
            >
              Done
            </Button>
          </ModalFooter>
        </ModalBody>
      </Modal>
    </>
  )
}
