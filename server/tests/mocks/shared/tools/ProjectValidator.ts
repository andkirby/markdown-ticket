export const ProjectValidator = {
  validateName: (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return { valid: false, error: 'Project name is required' }
    }
    return { valid: true, normalized: trimmed }
  },

  validateDescription: (description: string) => {
    const trimmed = description.trim()
    if (trimmed.length > 500) {
      return { valid: false, error: 'Description must be 500 characters or less' }
    }
    return { valid: true, normalized: trimmed }
  },

  validateRepository: (repository: string) => {
    const trimmed = repository.trim()
    if (!trimmed) {
      return { valid: true, normalized: '' }
    }

    try {
      const _url = new URL(trimmed)
      return { valid: true, normalized: trimmed }
    }
    catch {
      return { valid: false, error: 'Repository must be a valid URL' }
    }
  },
}
