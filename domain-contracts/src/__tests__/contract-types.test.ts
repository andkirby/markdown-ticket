import type { z } from 'zod'
import type { GlobalConfig, GlobalConfigSchema, SelectorState, SelectorStateSchema } from '../app-config/schema'
import type { ProjectConfig, ProjectConfigSchema } from '../project/schema'
import type { Ticket, TicketSchema } from '../ticket/entity'
import type { CreateTicketInput, CreateTicketInputSchema } from '../ticket/input'

type Expect<T extends true> = T
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends
(<T>() => T extends Y ? 1 : 2) ? true : false

// Checked by strict tsc during build and by ts-jest with the same tsconfig.
// Do not annotate schemas or cast these checks just to make equality pass.
type TicketMatches = Expect<Equal<Ticket, z.infer<typeof TicketSchema>>>
type CreateTicketInputMatches = Expect<Equal<CreateTicketInput, z.infer<typeof CreateTicketInputSchema>>>
type ProjectConfigMatches = Expect<Equal<ProjectConfig, z.infer<typeof ProjectConfigSchema>>>
type GlobalConfigMatches = Expect<Equal<GlobalConfig, z.infer<typeof GlobalConfigSchema>>>
type SelectorStateMatches = Expect<Equal<SelectorState, z.infer<typeof SelectorStateSchema>>>

// Independent shapes make derived aliases useful upgrade gates too.
type SelectorStateOutputMatches = Expect<Equal<SelectorState, Record<string, {
  favorite: boolean
  lastUsedAt: string | null
  count: number
  accent?: string | undefined
}>>>
type SelectorStateInputMatches = Expect<Equal<z.input<typeof SelectorStateSchema>, Record<string, {
  favorite?: boolean | undefined
  lastUsedAt?: string | null | undefined
  count?: number | undefined
  accent?: string | undefined
}> | undefined>>

// Snapshot independently authored output shapes, not just aliases of the schema.
interface ExpectedCreateTicketInput {
  title: string
  type: 'Architecture' | 'Feature Enhancement' | 'Bug Fix' | 'Technical Debt' | 'Documentation' | 'Research'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  level?: 'ticket' | 'epic'
  phaseEpic?: string
  impactAreas?: string[]
  assignee?: string
  content?: string
  relatedTickets?: string | string[]
  dependsOn?: string | string[]
  blocks?: string | string[]
  description?: string
  rationale?: string
}
interface ExpectedGlobalConfig {
  discovery: { autoDiscover: boolean, searchPaths: string[], maxDepth: number }
  links: { enableAutoLinking: boolean, enableTicketLinks: boolean, enableDocumentLinks: boolean, enableHoverPreviews: boolean, linkValidation: boolean }
  system: { logLevel: 'error' | 'warn' | 'info' | 'debug', cacheTimeout: number }
  cloudSync: { allowedOrigins: string[] }
}
interface ExpectedDocumentSettings {
  paths?: string[]
  excludeFolders?: string[]
  maxDepth?: number
  preview?: { allowedExternalDomains: string[], allowUnsafeEval: boolean }
}
interface ExpectedProjectConfig {
  project: {
    code: string
    name: string
    id?: string
    ticketsPath?: string
    active?: boolean
    description?: string
    repository?: string
    path?: string
    startNumber?: number | string
    counterFile?: string
    document?: ExpectedDocumentSettings
    [key: string]: unknown
  }
  document?: ExpectedDocumentSettings
  document_paths?: string[]
  exclude_folders?: string[]
  worktree?: { enabled: boolean }
  [key: string]: unknown
}
type CreateTicketOutputMatches = Expect<Equal<CreateTicketInput, ExpectedCreateTicketInput>>
type GlobalConfigOutputMatches = Expect<Equal<GlobalConfig, ExpectedGlobalConfig>>
type ProjectConfigOutputMatches = Expect<Equal<ProjectConfig, ExpectedProjectConfig>>

describe('contract type equality', () => {
  it('keeps entity, input, configuration and selector types aligned', () => {
    const checks: [TicketMatches, CreateTicketInputMatches, ProjectConfigMatches, GlobalConfigMatches, SelectorStateMatches, SelectorStateOutputMatches, SelectorStateInputMatches, CreateTicketOutputMatches, GlobalConfigOutputMatches, ProjectConfigOutputMatches] = [true, true, true, true, true, true, true, true, true, true]
    expect(checks.every(Boolean)).toBe(true)
  })
})
