import { describe, expect, it } from 'bun:test'
import { checkRegistry, compareManifest, scanSources } from './check-boundary-validation'

const file = 'server/controllers/Fixture.ts'
const helper = 'import { parseRequest } from \'../http/parseRequest.js\';'
const scan = (body: string) => scanSources({ [file]: `${helper} function write(request: Request, res: Response) { ${body} }` })

describe('boundary convention fixtures', () => {
  it.each([
    'const input = request.body as T',
    'const alias = request.body; save(alias)',
    'const {body: input} = request; save(input)',
    'save(request[\'body\'])',
    'save(request?.body)',
    'const other = request; save(other.body)',
    'let other; other = request; save(other.body)',
    'const { ...other } = request; save(other.body)',
    'parseRequest(schema, request.body, res, \'body\'); save(request.body)',
    'parseRequest(schema, request.body as T, res, \'body\')',
    'arbitraryService(request)',
    'function parseRequest() {}; parseRequest(schema, request.body, res, \'body\')',
  ])('rejects bypass: %s', body => expect(scan(body).length).toBeGreaterThan(0))
  it('accepts direct imported helper parsing', () => expect(scan('const parsed = parseRequest(schema, request.body, res, \'body\'); if (!parsed.success) return; save(parsed.data)')).toEqual([]))
  it('accepts aliased canonical import', () => {
    expect(scanSources({ [file]: 'import {parseRequest as parse} from \'../http/parseRequest.js\'; function f(input: Request) { const p = parse(s, input[\'body\'], res, \'body\') }' })).toEqual([])
  })
  it('rejects an unrelated same-name helper', () => {
    expect(scanSources({ [file]: 'import {parseRequest} from \'./fake.js\'; function f(input: Request) { parseRequest(s,input.body,res,\'body\') }' })).toHaveLength(1)
  })
  it('distinguishes shadowed identifiers', () => {
    expect(scan('[{}].map(request => request.body)')).toEqual([])
  })
  it('discovers renamed route bindings and parameter destructuring', () => {
    expect(scanSources({ 'server/routes/fixture.ts': 'router.post(\'/x\', (input, response) => save(input.body))' })).toHaveLength(1)
    expect(scanSources({ [file]: 'function f({body}: Request) { save(body) }' })).toHaveLength(1)
  })
  it('discovers imported Request aliases and named route callbacks', () => {
    expect(scanSources({ [file]: 'import type { Request as Input } from \'express\'; function f(payload: Input) { save(payload.body) }' })).toHaveLength(1)
    expect(scanSources({ 'server/routes/fixture.ts': 'const handler = (payload, response) => save(payload.body); router.post(\'/x\', handler)' })).toHaveLength(1)
    expect(scanSources({ 'server/routes/fixture.ts': 'router.post(\'/x\', ({body}, response) => save(body))' })).toHaveLength(1)
  })
  it('binds Request delegations to their imported owner', () => {
    const source = 'import { guard } from \'./security.js\'; function f(input: Request) { guard(input) }'
    const sites = scanSources({ [file]: source })
    const legacy = sites.map(site => ({ ...site, reason: 'Existing security guard', phase: 3 }))
    expect(compareManifest(scanSources({ [file]: source.replace('./security.js', './arbitrary.js') }), legacy)).not.toEqual([])
  })
  it('permits exact approved guards and rejects duplicate, moved and stale sites', () => {
    const sites = scan('existingGuard(request.body)')
    const legacy = sites.map(site => ({ ...site, reason: 'Phase 2 guard migration', phase: 2 }))
    expect(compareManifest(sites, legacy)).toEqual([])
    expect(compareManifest(scan('existingGuard(request.body); existingGuard(request.body)'), legacy)).not.toEqual([])
    expect(compareManifest(scanSources({ [file]: 'function other(request: Request) {existingGuard(request.body)}' }), legacy)).not.toEqual([])
    expect(compareManifest(scan('newService(request.body)'), legacy)).not.toEqual([])
    expect(compareManifest([], legacy)[0]).toContain('Stale')
  })
  it.each(['JSON.parse(text) as Config', 'parseToml(text) as Config', '(JSON.parse(text) as unknown) as Config'])('rejects new typed decoder: %s', (expression) => {
    expect(scanSources({ 'shared/new-loader.ts': `function load() {return ${expression}}` }).length).toBeGreaterThan(0)
  })
  it('tracks decoder aliases and typed assignments', () => {
    expect(scanSources({ 'shared/new-loader.ts': 'function load() {const raw=JSON.parse(text); const alias=raw; return alias as Config}' })).toHaveLength(1)
    expect(scanSources({ 'shared/new-loader.ts': 'const config: Config = JSON.parse(text)' })).toHaveLength(1)
    expect(scanSources({ 'shared/new-loader.ts': 'import {parseToml as parse} from \'./toml\'; const config = parse(text) as Config' })).toHaveLength(1)
    expect(scanSources({ 'shared/new-loader.ts': 'const config = JSON[\'parse\'](text) as Config' })).toHaveLength(1)
  })
  it('allows syntax-only unknown-returning decoders outside finite ingress registry', () => expect(scanSources({ 'shared/trace.ts': 'function read(): unknown {return JSON.parse(text)}' })).toEqual([]))
  it('accepts a direct throwing canonical write-file parse in a registered loader', () => {
    const file = 'shared/loader.ts'
    expect(scanSources({ [file]: 'import {ProjectConfigWriteFileSchema as schema} from "@mdt/domain-contracts"; function load() {return schema.parse(JSON.parse(text))}' }, new Set([file]))).toEqual([])
  })
  it.each([
    'import {ProjectConfigWriteFileSchema as schema} from "./fake"; return schema.parse(JSON.parse(text))',
    'import {ProjectConfigWriteFileSchema as schema} from "@mdt/domain-contracts"; schema.safeParse(JSON.parse(text)); return {}',
    'import {ProjectConfigWriteFileSchema as schema} from "@mdt/domain-contracts"; function f(schema: unknown) {return schema.parse(JSON.parse(text))}',
    'import {ProjectConfigWriteFileSchema as schema} from "@mdt/domain-contracts"; const raw = JSON.parse(text); schema.parse(raw); return raw',
  ])('rejects unchecked/shadowed decoder consumption: %s', (body) => {
    const file = 'shared/loader.ts'
    expect(scanSources({ [file]: body }, new Set([file])).length).toBeGreaterThan(0)
  })
  it('rejects raw MCP members through renamed dispatcher arguments and aliases', () => {
    expect(scanSources({ 'mcp-server/src/tools/new.ts': 'class Tools {handleToolCall(name: string, input: unknown) {const alias=input; return alias.key}}' })).toHaveLength(1)
  })
})

const config = 'export const TOOL_NAMES = { WRITE: \'write\' } as const'
const index = 'import { defineTool } from \'./defineTool.js\'; class Tools {constructor() {this.registry = {[TOOL_NAMES.WRITE]: defineTool(schema, run)}} handleToolCall(name: string, args: unknown) {}}'
describe('registry fixtures', () => {
  it('accepts real wrapper entries', () => expect(checkRegistry(index, config)).toEqual([]))
  it('rejects a new advertised tool without registry entry', () => expect(checkRegistry(index, 'export const TOOL_NAMES = {WRITE:\'write\', NEW:\'new\'} as const')).not.toEqual([]))
  it('rejects local or unrelated defineTool', () => {
    expect(checkRegistry(index.replace('\'./defineTool.js\'', '\'./fake.js\''), config)).not.toEqual([])
    expect(checkRegistry(`${index}; function defineTool() {}`, config)).not.toEqual([])
  })
  it('rejects typed raw dispatcher arguments', () => expect(checkRegistry(index.replace('args: unknown', 'args: Record<string,unknown>'), config)).not.toEqual([]))
})
