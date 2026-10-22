import { z } from 'zod'

// Browser transport contract only. Unknown future discriminators are ignored;
// malformed known events never reach event dispatch or deduplication state.
const eventType = z.enum(['add', 'change', 'unlink'])
const payload = z.looseObject({
  eventType: eventType.optional(),
  filename: z.string().optional(),
  filePath: z.string().optional(),
  projectId: z.string().optional(),
  timestamp: z.number().optional(),
  status: z.string().optional(),
  eventId: z.string().optional(),
  source: z.enum(['main', 'worktree']).optional(),
  ticketData: z.looseObject({
    code: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    priority: z.string().optional(),
    lastModified: z.string().optional(),
  }).nullish(),
  subdocument: z.object({ code: z.string(), filePath: z.string() }).nullish(),
})
export const SSEMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('connection'), data: payload }),
  z.object({ type: z.literal('heartbeat'), data: payload }),
  z.object({ type: z.literal('file-change'), data: payload.extend({ eventType, filename: z.string().min(1) }) }),
  z.object({ type: z.literal('document-change'), data: payload.extend({ eventType, filePath: z.string().min(1) }) }),
  z.object({ type: z.literal('project-created'), data: payload }),
  z.object({ type: z.literal('project-deleted'), data: payload }),
])
export type SSEMessageData = z.output<typeof SSEMessageSchema>
