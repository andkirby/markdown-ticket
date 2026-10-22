import { ProjectRefParamsSchema } from './ticketSchemas.js'

export const ProjectCodeParamsSchema = ProjectRefParamsSchema.omit({ projectId: true }).extend({
  code: ProjectRefParamsSchema.shape.projectId,
})
