import type { CreationRecoveryReconcileInput, CreationRecoveryResumeInput } from '@mdt/domain-contracts'
import type { Response } from 'express'
import {
  COORDINATION_ERRORS,
  CoordinatorError,
  CreationRecoveryReconcileInputSchema,
  CreationRecoveryResumeInputSchema,
} from '@mdt/domain-contracts'
import { Router } from 'express'
import { parseRequest } from '../http/parseRequest.js'
import { ProjectRefParamsSchema } from '../http/ticketSchemas.js'
import { getRequestAccess } from '../security/apiAuth.js'
import { isWriteAccess } from '../security/projectSharing.js'

/** Structural port shared by the server facade and isolated HTTP tests. */
interface CreationRecoveryPort {
  inspectCreationRecovery: (projectId: string) => Promise<unknown>
  resumeCreationRecovery: (projectId: string, input: CreationRecoveryResumeInput) => Promise<unknown>
  reconcileCreationRecovery: (projectId: string, input: CreationRecoveryReconcileInput) => Promise<unknown>
}

function recoveryNextAction(error: CoordinatorError): string {
  switch (error.code) {
    case 'invalid_request':
      return 'Inspect the retained journal and submit a valid reviewed request.'
    case 'authentication_required':
    case 'forbidden':
      return 'Verify owner credentials and project authorization before retrying.'
    case 'project_not_found':
      return 'Verify the selected project and its cloud binding.'
    case 'coordination_suspended':
      return 'Resolve the coordination suspension before explicitly retrying recovery.'
    case 'coordination_unavailable':
    case 'rate_limited':
      return 'Retain the journal and retry explicitly when coordination is available.'
    default:
      return 'Inspect the current journal and verify its original receipt before retrying.'
  }
}

function sendRecoveryError(res: Response, error: unknown): void {
  if (error instanceof CoordinatorError) {
    res.status(COORDINATION_ERRORS[error.code].status).json({
      code: error.code,
      message: 'Creation recovery could not complete.',
      nextAction: recoveryNextAction(error),
    })
    return
  }
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Creation recovery could not complete.',
    nextAction: 'Retain the journal and inspect recovery state before explicitly retrying.',
  })
}

/** Inspection only reads retained state; mutations require an explicit owner request. */
export function createCloudCreationRecoveryRouter(service: CreationRecoveryPort): Router {
  const router = Router()
  const recovery = Router({ mergeParams: true })
  recovery.use((req, res, next) => {
    if (!isWriteAccess(getRequestAccess(req))) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  })

  recovery.get('/', async (req, res) => {
    const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
    if (!params.success)
      return
    try {
      res.json(await service.inspectCreationRecovery(params.data.projectId))
    }
    catch (error) {
      sendRecoveryError(res, error)
    }
  })

  recovery.post('/resume', async (req, res) => {
    const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
    if (!params.success)
      return
    const body = parseRequest(CreationRecoveryResumeInputSchema, req.body, res, 'body')
    if (!body.success)
      return
    try {
      res.json(await service.resumeCreationRecovery(params.data.projectId, body.data))
    }
    catch (error) {
      sendRecoveryError(res, error)
    }
  })

  recovery.post('/reconcile', async (req, res) => {
    const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
    if (!params.success)
      return
    const body = parseRequest(CreationRecoveryReconcileInputSchema, req.body, res, 'body')
    if (!body.success)
      return
    try {
      res.json(await service.reconcileCreationRecovery(params.data.projectId, body.data))
    }
    catch (error) {
      sendRecoveryError(res, error)
    }
  })

  router.use('/:projectId/cloud-sync/creation-recovery', recovery)
  return router
}
