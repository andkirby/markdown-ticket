import { CreateTicketInputSchema, PatchTicketInputSchema } from '@mdt/domain-contracts'

// Only these fields are consumed by the REST create adapter. In particular,
// content, assignee and implementationNotes must not gain new write behavior.
export const RestCreateTicketInputSchema = CreateTicketInputSchema.pick({
  title: true,
  type: true,
  priority: true,
  level: true,
  description: true,
})
export const RestPatchTicketInputSchema = PatchTicketInputSchema

// Path identifiers remain opaque strings. Ticket normalization and project
// discovery are existing service responsibilities, not persisted-ID policy.
export const ProjectRefParamsSchema = CreateTicketInputSchema.pick({}).extend({
  projectId: CreateTicketInputSchema.shape.title,
})
export const TicketRefParamsSchema = ProjectRefParamsSchema.extend({
  crId: CreateTicketInputSchema.shape.title,
})
