import type { Response } from 'express'
import { CreateTicketInputSchema } from '@mdt/domain-contracts'
import { parseRequest } from '../../http/parseRequest.js'
import { createMockReqRes } from '../utils/setupTests.js'

describe('parseRequest', () => {
  it.each([null, undefined, [], 42, 'secret-raw-input'].map(raw => ({ raw })))('returns structured issues for $raw', ({ raw }) => {
    const { res } = createMockReqRes()
    const result = parseRequest(CreateTicketInputSchema, raw, res as Response, 'body')
    expect(result.success).toBe(false)
    expect(res.status).toHaveBeenCalledWith(400)
    const response = (res.json as jest.Mock).mock.calls[0][0]
    expect(response.code).toBe('VALIDATION_ERROR')
    for (const issue of response.issues) expect(Object.keys(issue).sort()).toEqual(['code', 'message', 'path'])
    expect(JSON.stringify(response)).not.toContain('secret-raw-input')
  })
  it('preserves nested issue paths and never includes input objects', () => {
    const schema = CreateTicketInputSchema.pick({ impactAreas: true })
    const { res } = createMockReqRes()
    parseRequest(schema, { impactAreas: ['ok', { secret: 'sensitive' }] }, res as Response, 'query')
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ source: 'query', issues: [expect.objectContaining({ path: ['impactAreas', 1] })] }))
    expect(JSON.stringify((res.json as jest.Mock).mock.calls)).not.toContain('sensitive')
  })
  it('narrows to inferred parsed data', () => {
    const { res } = createMockReqRes()
    const result = parseRequest(CreateTicketInputSchema, { title: '  title  ', type: 'Research' }, res as Response, 'body')
    if (!result.success)
      throw new Error('Expected success')
    const title: string = result.data.title
    expect(title).toBe('  title  ')
    expect(res.status).not.toHaveBeenCalled()
  })
})
