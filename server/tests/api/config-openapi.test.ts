/// <reference types="jest" />
import * as path from 'node:path'
import swaggerJsdoc from 'swagger-jsdoc'

/**
 * Config OpenAPI contract tests (MDT-168 C-9): the configuration endpoints are
 * documented with stable response shapes, including the field-level error
 * response. Covers TEST-config-openapi-contract.
 *
 * We generate the spec directly from the config route JSDoc via swagger-jsdoc
 * (the same tool the production openapi module uses) to avoid the ESM
 * import.meta.url friction of importing the production `swaggerSpec` under jest.
 */
function buildSpecFromRoute(): Record<string, unknown> {
  const options: swaggerJsdoc.Options = {
    definition: { openapi: '3.0.0', info: { title: 'test', version: '1.0.0' } },
    apis: [path.resolve(__dirname, '../../routes/config.ts')],
  }
  return swaggerJsdoc(options) as Record<string, unknown>
}

describe('config OpenAPI contract', () => {
  const spec = buildSpecFromRoute()
  const paths = spec.paths as Record<string, Record<string, unknown>>

  it('routes/config.ts has @openapi JSDoc that swagger-jsdoc can parse', () => {
    expect(Object.keys(paths).length).toBeGreaterThan(0)
  })

  it('documents GET /api/config/selectors with 200 and 403', () => {
    const op = paths['/api/config/selectors']?.get as { responses?: Record<string, unknown> } | undefined
    expect(op).toBeDefined()
    expect(op?.responses?.['200']).toBeDefined()
    expect(op?.responses?.['403']).toBeDefined()
  })

  it('documents PATCH /api/config with selector+value body and 400 field-error shape', () => {
    const op = paths['/api/config']?.patch as {
      requestBody?: { content?: { 'application/json'?: { schema?: { properties?: Record<string, unknown> } } } }
      responses?: Record<string, unknown>
    } | undefined
    expect(op).toBeDefined()
    const bodySchema = op?.requestBody?.content?.['application/json']?.schema
    expect(bodySchema?.properties?.selector).toBeDefined()
    expect(bodySchema?.properties?.value).toBeDefined()
    const badRequest = op?.responses?.['400'] as { content?: { 'application/json'?: { schema?: { properties?: Record<string, unknown> } } } } | undefined
    expect(badRequest).toBeDefined()
    const errProps = badRequest?.content?.['application/json']?.schema?.properties
    expect(errProps?.error).toBeDefined()
    expect(errProps?.selector).toBeDefined()
    expect(errProps?.field).toBeDefined()
    expect(errProps?.message).toBeDefined()
  })

  it('uses the Config tag for config endpoints', () => {
    const selectorsOp = paths['/api/config/selectors']?.get as { tags?: string[] } | undefined
    const patchOp = paths['/api/config']?.patch as { tags?: string[] } | undefined
    expect(selectorsOp?.tags).toContain('Config')
    expect(patchOp?.tags).toContain('Config')
  })

  it('selector exposure enum values are documented in the selectors response', () => {
    const op = paths['/api/config/selectors']?.get as {
      responses?: {
        200?: {
          content?: { 'application/json'?: { schema?: { properties?: { selectors?: { items?: { properties?: { exposure?: { enum?: string[] } } } } } } } }
        }
      }
    } | undefined
    const exposureEnum = op?.responses?.['200']?.content?.['application/json']?.schema?.properties?.selectors?.items?.properties?.exposure?.enum
    expect(exposureEnum).toEqual(expect.arrayContaining(['editable', 'guarded', 'readOnly', 'fileOnly']))
  })
})
