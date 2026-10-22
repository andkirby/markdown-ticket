import { crPatchProperties, schemas } from '../../openapi/schemas.js'

describe('REST ticket OpenAPI variants', () => {
  it('create advertises only the consumed projection and optional priority', () => {
    expect(schemas.CRInput.required).toEqual(['title', 'type'])
    expect(Object.keys(schemas.CRInput.properties).sort()).toEqual(['description', 'level', 'priority', 'title', 'type'])
    expect(schemas.CRInput.properties.level).toEqual({ type: 'string', enum: ['ticket', 'epic'] })
    expect(schemas.CRInput.properties.title).toMatchObject({ type: 'string' })
    expect(schemas.CRInput.properties.title).not.toHaveProperty('maxLength')
  })
  it('PUT shares the partial write schema', () => {
    expect(schemas.CRPatchInput).not.toHaveProperty('required')
    expect(schemas.CRPatchInput.properties).toEqual(crPatchProperties)
  })
  it('PATCH includes status and string/array relationships without ignored write fields', () => {
    expect(crPatchProperties).toHaveProperty('status')
    expect(crPatchProperties).not.toHaveProperty('implementationNotes')
    expect(crPatchProperties.assignee).not.toHaveProperty('format')
    expect(crPatchProperties.blocks).toMatchObject({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  })
})
