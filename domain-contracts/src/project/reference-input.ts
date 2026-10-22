import { z } from 'zod'

export const ProjectReferenceInputSchema = z.string()
  .refine(value => value === '' || /^[A-Z0-9]{2,5}$/.test(value.trim().toUpperCase()), 'Invalid project reference')
