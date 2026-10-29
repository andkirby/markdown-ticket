// Temporary observation seam; calls the real resolver and records no ticket contents or credentials.
import process from 'node:process'
import { TicketLocationResolver } from '../../../../../shared/services/ticket/TicketLocationResolver.js'
const resolve = TicketLocationResolver.prototype.resolve
jest.spyOn(TicketLocationResolver.prototype, 'resolve').mockImplementation(async function (project, key) {
  const result = await resolve.call(this, project, key)
  process.stderr.write(`${JSON.stringify({ project: project.id, key, ...result })}\n`)
  return result
})
import express from 'express'
import { TicketController } from '../../../../../server/modules/tickets/TicketController.js'
const json = express.response.json
jest.spyOn(express.response, 'json').mockImplementation(function (body) {
  process.stderr.write(`${JSON.stringify({ status: this.statusCode, route: this.req.originalUrl, error: body?.error, message: body?.message })}\n`)
  return json.call(this, body)
})
const getSubDocument = TicketController.prototype.getSubDocument
jest.spyOn(TicketController.prototype, 'getSubDocument').mockImplementation(function (...args) {
  process.stderr.write('ticket-controller-called\n')
  return getSubDocument.call(this, ...args)
})
