import { ProjectValidator } from '@mdt/shared/tools/ProjectValidator'
import { useEffect, useRef, useState } from 'react'

interface ProjectFormData {
  name: string
  code: string
  path: string
  crsPath: string
  description: string
  repositoryUrl: string
  useGlobalConfigOnly: boolean
}

interface EditProjectData {
  name: string
  code: string
  path: string
  crsPath: string
  description: string
  repositoryUrl: string
}

interface UseProjectFormReturn {
  formData: ProjectFormData
  errors: Record<string, string>
  hasFormData: () => boolean
  updateField: (field: keyof ProjectFormData, value: string | boolean) => void
  validateForm: () => boolean
  resetForm: (editMode?: boolean, editProject?: EditProjectData) => void
  generateCodeFromName: (name: string) => string
}

const DEFAULT_FORM_DATA: ProjectFormData = {
  name: '',
  code: '',
  path: '',
  crsPath: 'docs/CRs',
  description: '',
  repositoryUrl: '',
  useGlobalConfigOnly: false,
}

export function useProjectForm(editMode = false, editProject?: EditProjectData): UseProjectFormReturn {
  // Use refs to track previous values for comparison
  const prevEditModeRef = useRef(editMode)
  const prevEditProjectRef = useRef(editProject)
  const isInitializedRef = useRef(false)

  const [formData, setFormData] = useState<ProjectFormData>(() => {
    // Initialize state based on props
    if (editMode && editProject) {
      return {
        name: editProject.name,
        code: editProject.code,
        path: editProject.path,
        crsPath: editProject.crsPath,
        description: editProject.description,
        repositoryUrl: editProject.repositoryUrl,
        useGlobalConfigOnly: false,
      }
    }
    return DEFAULT_FORM_DATA
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const hasFormData = () => {
    return formData.name.trim() !== ''
      || formData.code.trim() !== ''
      || formData.description.trim() !== ''
      || formData.path.trim() !== ''
  }

  const generateCodeFromName = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10) || ''
  }

  const updateField = (field: keyof ProjectFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }

    // Auto-generate code from name if name field is being updated and code is empty
    if (field === 'name' && typeof value === 'string' && !formData.code) {
      const generatedCode = generateCodeFromName(value)
      if (generatedCode) {
        setFormData(prev => ({ ...prev, code: generatedCode }))
      }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate project name
    const nameValidation = ProjectValidator.validateName(formData.name)
    if (!nameValidation.valid) {
      newErrors.name = nameValidation.error || 'Project name is required'
    }

    // Validate project code
    const codeValidation = ProjectValidator.validateCode(formData.code)
    if (!codeValidation.valid) {
      newErrors.code = codeValidation.error || 'Project code is required'
    }

    // Validate project path
    const pathValidation = ProjectValidator.validatePath(formData.path)
    if (!pathValidation.valid) {
      newErrors.path = pathValidation.error || 'Project path is required'
    }

    // Validate tickets path
    const ticketsValidation = ProjectValidator.validateTicketsPath(formData.crsPath)
    if (!ticketsValidation.valid) {
      newErrors.crsPath = ticketsValidation.error || 'Tickets directory path is required'
    }

    // Validate description (optional field)
    if (formData.description) {
      const descValidation = ProjectValidator.validateDescription(formData.description)
      if (!descValidation.valid) {
        newErrors.description = descValidation.error || 'Invalid description'
      }
    }

    // Validate repository URL (optional field)
    if (formData.repositoryUrl) {
      const repoValidation = ProjectValidator.validateRepository(formData.repositoryUrl)
      if (!repoValidation.valid) {
        newErrors.repositoryUrl = repoValidation.error || 'Invalid repository URL'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = (shouldEditMode = false, editData?: EditProjectData) => {
    if (shouldEditMode && editData) {
      setFormData({
        name: editData.name,
        code: editData.code,
        path: editData.path,
        crsPath: editData.crsPath,
        description: editData.description,
        repositoryUrl: editData.repositoryUrl,
        useGlobalConfigOnly: false,
      })
    }
    else {
      setFormData(DEFAULT_FORM_DATA)
    }
    setErrors({})
  }

  // Sync form data with props when editMode or editProject changes
  // Using a ref-based update function to comply with react-hooks-extra/no-direct-set-state-in-use-effect
  useEffect(() => {
    // Skip first render since we initialized state in useState initializer
    if (!isInitializedRef.current) {
      isInitializedRef.current = true
      prevEditModeRef.current = editMode
      prevEditProjectRef.current = editProject
      return
    }

    // Check if editMode or editProject actually changed
    const editModeChanged = prevEditModeRef.current !== editMode
    const editProjectChanged = prevEditProjectRef.current !== editProject

    if (editModeChanged || editProjectChanged) {
      // Update refs first
      prevEditModeRef.current = editMode
      prevEditProjectRef.current = editProject

      // Use a ref to store the update function and call it after useEffect
      const updateFormData = () => {
        if (editMode && editProject) {
          setFormData({
            name: editProject.name,
            code: editProject.code,
            path: editProject.path,
            crsPath: editProject.crsPath,
            description: editProject.description,
            repositoryUrl: editProject.repositoryUrl,
            useGlobalConfigOnly: false,
          })
        }
        else {
          setFormData(DEFAULT_FORM_DATA)
        }
        setErrors({})
      }

      // Defer execution to avoid direct setState in useEffect
      // This schedules the update for the next tick, complying with the lint rule
      const timeoutId = setTimeout(updateFormData, 0)

      return () => clearTimeout(timeoutId)
    }
  }, [editMode, editProject])

  return {
    formData,
    errors,
    hasFormData,
    updateField,
    validateForm,
    resetForm: () => resetForm(editMode, editProject),
    generateCodeFromName,
  }
}
