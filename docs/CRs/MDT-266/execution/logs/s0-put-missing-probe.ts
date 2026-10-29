// Original adapter snapshot against the unchanged missing-ticket rule and original PUT catch.
import express from 'express'
import request from 'supertest'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TicketController } from '../../../../../server/modules/tickets/TicketController.js'
import { TicketService } from './s0-rest-ticket-adapter.js'
const env = new TestEnvironment()
await env.setup()
const factory = new ProjectFactory(env)
try {
  await factory.createProject('empty', { code: 'TEST' })
  const projects = new ProjectService(true)
  const original = new TicketService(projects)
  const controller = new TicketController(projects as never, original as never)
  const app = express()
  app.use(express.json())
  app.put('/:projectId/:crId', (req, res) => controller.updateCR(req, res))
  const result = await request(app).put('/TEST/TEST-999').send({ status: 'In Progress' })
  console.log(JSON.stringify({ status: result.status, body: result.body }))
}
finally {
  await factory.cleanup()
  await env.cleanup()
}
