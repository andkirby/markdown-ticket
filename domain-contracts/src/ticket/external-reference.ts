import { z } from 'zod'

export const TrackerKind = { JIRA: 'jira', GITHUB: 'github', GITLAB: 'gitlab' } as const
export const TrackerKinds = [TrackerKind.JIRA, TrackerKind.GITHUB, TrackerKind.GITLAB] as const
export type TrackerKindValue = typeof TrackerKinds[number]

export const JiraProjectDisplay = { AUTO: 'auto', ALWAYS: 'always' } as const
export const JiraProjectDisplays = [JiraProjectDisplay.AUTO, JiraProjectDisplay.ALWAYS] as const
export const RepositoryDisplay = { NAME: 'name', NONE: 'none' } as const
export const RepositoryDisplays = [RepositoryDisplay.NAME, RepositoryDisplay.NONE] as const

/** File boundaries preserve raw entries; interpretation validates each instance separately. */
export const TrackerConfigSchema = z.looseObject({
  kind: z.enum(TrackerKinds),
  baseUrl: z.string().min(1),
  defaultRepo: z.string().optional(),
  projectKeys: z.array(z.string()).optional(),
  urlTemplate: z.string().optional(),
  display: z.looseObject({
    projectCode: z.enum(JiraProjectDisplays).optional(),
    repository: z.enum(RepositoryDisplays).optional(),
  }).optional(),
})
export type TrackerConfig = z.infer<typeof TrackerConfigSchema>

export const ExternalReferencesSchema = z.array(z.string())

/** Derived read model, never persisted as the ticket's external identity. */
export const ExternalReferenceSchema = z.object({
  ref: z.string(),
  instance: z.string(),
  kind: z.enum(TrackerKinds).optional(),
  key: z.string(),
  displayKey: z.string(),
  instanceLabel: z.string().optional(),
  url: z.url().refine(value => /^https?:\/\//i.test(value), 'Only HTTP(S) reference URLs are supported').optional(),
  unavailableReason: z.string().optional(),
})
export type ExternalReference = z.infer<typeof ExternalReferenceSchema>
