import { z } from 'zod'

export interface SubDocument {
  name: string
  kind: 'file' | 'folder'
  children: SubDocument[]
  isVirtual?: boolean
  filePath?: string
}

export const DEFAULT_SUBDOCUMENT_ORDER: readonly string[] = [
  'requirements',
  'architecture',
  'bdd',
  'tests',
  'tasks',
  'design',
  'notes',
]

export const SubDocumentSchema: z.ZodType<SubDocument> = z.lazy(() => z.object({
  name: z.string(),
  kind: z.enum(['file', 'folder']),
  children: z.array(SubDocumentSchema),
  isVirtual: z.boolean().optional(),
  filePath: z.string().optional(),
}))
