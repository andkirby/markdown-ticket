/** MDT-266: capability/package import rules and runtime cycles, separate from decoder validation. */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

export interface BoundaryException {
  rule: string
  from: string
  to: string
  owner: string
  reason: string
}
interface ImportEdge {
  from: string
  to: string
  runtime: boolean
  controller: boolean
}
export interface ModuleBoundaryResult {
  violations: string[]
  edges: ImportEdge[]
}
const root = path.resolve(import.meta.dir, '..')
const standardAliases: Record<string, string[]> = {
  '@mdt/shared': ['shared/index.ts'],
  '@mdt/shared/*': ['shared/*'],
  '@mdt/domain-contracts': ['domain-contracts/src/index.ts'],
  '@mdt/domain-contracts/*': ['domain-contracts/src/*'],
  '@/*': ['server/*'],
}
const slash = (value: string) => value.split(path.sep).join('/')

/** Same resolver/rules run over fixtures and the real source map. */
export function checkModuleBoundaries(
  sources: Record<string, string>,
  exceptions: BoundaryException[] = [],
  aliases: Record<string, string[]> = standardAliases,
): ModuleBoundaryResult {
  const edges: ImportEdge[] = []
  const problems: Array<{ rule: string, from: string, to: string }> = []
  const hit = new Set<number>()
  const host: ts.ModuleResolutionHost = {
    fileExists: file => slash(path.relative(root, file)) in sources,
    readFile: file => sources[slash(path.relative(root, file))],
    directoryExists: directory => Object.keys(sources).some(file => path.resolve(root, file).startsWith(`${directory}${path.sep}`)),
    realpath: file => file,
    getCurrentDirectory: () => root,
  }
  const options: ts.CompilerOptions = { moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext, baseUrl: root, paths: aliases, allowJs: true }
  const workspacePaths = new Map<string, Record<string, string[]>>()
  function pathsFor(from: string): Record<string, string[]> {
    const workspace = from.split('/')[0]
    const cached = workspacePaths.get(workspace)
    if (cached)
      return cached
    const configPath = path.join(root, workspace, 'tsconfig.json')
    const configured: Record<string, string[]> = {}
    if (fs.existsSync(configPath)) {
      const read = ts.readConfigFile(configPath, ts.sys.readFile)
      const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(configPath))
      for (const [pattern, targets] of Object.entries(parsed.options.paths ?? {})) {
        configured[pattern] = targets.map(target => slash(path.relative(root, path.resolve(parsed.options.baseUrl ?? path.dirname(configPath), target))))
      }
    }
    const result = { ...configured, ...aliases }
    workspacePaths.set(workspace, result)
    return result
  }
  function resolve(from: string, specifier: string): string | undefined {
    const result = ts.resolveModuleName(specifier, path.resolve(root, from), { ...options, paths: pathsFor(from) }, host).resolvedModule
      ?? (specifier.startsWith('@mdt/') ? ts.resolveModuleName(specifier, path.resolve(root, from), options, host).resolvedModule : undefined)
    return result ? slash(path.relative(root, result.resolvedFileName)) : undefined
  }
  function exportsController(file: string, name: string, seen = new Set<string>()): boolean {
    const key = `${file}#${name}`
    if (seen.has(key))
      return false
    seen.add(key)
    const sf = ts.createSourceFile(file, sources[file] ?? '', ts.ScriptTarget.Latest, true)
    for (const statement of sf.statements) {
      if (ts.isClassDeclaration(statement) && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        const exported = statement.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword) ? 'default' : statement.name?.text
        if (exported === name && (/Controller\.ts$/.test(file) || (statement.name?.text ?? '').endsWith('Controller')))
          return true
      }
      if (ts.isExportDeclaration(statement)) {
        const target = statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier) ? resolve(file, statement.moduleSpecifier.text) : undefined
        if (!statement.exportClause && target && exportsController(target, name, seen))
          return true
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
          for (const item of statement.exportClause.elements) {
            if (item.name.text !== name)
              continue
            const original = (item.propertyName ?? item.name).text
            if (original.endsWith('Controller') || (target && exportsController(target, original, seen)))
              return true
          }
        }
      }
    }
    return false
  }
  function add(rule: string, from: string, to: string): void {
    const exception = exceptions.findIndex(item => item.rule === rule && item.from === from && item.to === to && item.owner.trim() && item.reason.trim())
    if (exception >= 0)
      hit.add(exception)
    else
      problems.push({ rule, from, to })
  }
  const purePolicy = new Set(['shared/services/epicRules.ts', 'shared/services/ticket/derivedFields.ts', 'shared/services/ticket/referenceMutations.ts'])
  for (const [from, source] of Object.entries(sources)) {
    const sf = ts.createSourceFile(from, source, ts.ScriptTarget.Latest, true)
    function inspect(specifier: string, runtime: boolean, controller = false): void {
      const to = resolve(from, specifier)
      const destination = to ?? specifier
      if (from.startsWith('domain-contracts/') && ((to && !to.startsWith('domain-contracts/')) || /^(?:node:|fs(?:-extra)?(?:\/|$)|path(?:\/|$)|express$|@mdt\/shared)/.test(specifier)))
        add('contract-purity', from, destination)
      if (/^(?:shared|server)\//.test(from) && /^@mdt\/cloud(?:\/|$)/.test(specifier))
        add('cloud-implementation', from, destination)
      if (from.startsWith('shared/') && ((to && /^(?:server|cli|mcp-server|frontend|cloud)\//.test(to)) || specifier === 'express'))
        add('shared-direction', from, destination)
      if ((purePolicy.has(from) || from.startsWith('shared/services/search/')) && /^(?:node:fs|fs(?:-extra)?(?:\/|$))/.test(specifier))
        add('policy-io', from, destination)
      if (from.startsWith('shared/services/search/') && to && /\/ticket\/(?:TicketMutationService|MarkdownTicketRepository|TicketRepository)\.ts$/.test(to))
        add('search-mutation', from, to)
      if (from === 'server/services/config/adapters/ProjectConfigStorageAdapter.ts' && /^(?:node:fs|fs(?:-extra)?(?:\/|$))/.test(specifier))
        add('project-writer-owner', from, destination)
      if (!to) {
        if (specifier.startsWith('.') || Object.keys(pathsFor(from)).some(alias => alias.includes('*') ? specifier.startsWith(alias.split('*')[0]) : specifier === alias))
          add('unresolved-local-import', from, specifier)
        return
      }
      edges.push({ from, to, runtime, controller })
      if (/^server\/(?:modules|services|bootstrap)\//.test(from) || from === 'server/app.ts') {
        if (/^server\/(?:controllers|routes)\//.test(to))
          add('legacy-http-dependency', from, to)
      }
      const sourceCapability = /^server\/modules\/([^/]+)\//.exec(from)?.[1]
      const targetCapability = /^server\/modules\/([^/]+)\//.exec(to)?.[1]
      if (/Controller\.ts$/.test(from) && controller && (runtime || sourceCapability !== targetCapability))
        add('controller-dependency', from, to)
      if (sourceCapability && targetCapability && sourceCapability !== targetCapability && !to.endsWith('/index.ts'))
        add('private-capability-import', from, to)
    }
    function visit(node: ts.Node): void {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = node.importClause
        const names = clause?.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements : []
        const runtime = !clause || (!clause.isTypeOnly && (Boolean(clause.name) || Boolean(clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) || names.some(name => !name.isTypeOnly)))
        const target = resolve(from, node.moduleSpecifier.text)
        let controller = names.some(name => (name.propertyName ?? name.name).text.endsWith('Controller') || (target && exportsController(target, (name.propertyName ?? name.name).text)))
        if (clause?.name && target && exportsController(target, 'default'))
          controller = true
        if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
          const namespace = clause.namedBindings.name.text
          const inspectNamespace = (part: ts.Node): void => {
            if ((ts.isPropertyAccessExpression(part) && ts.isIdentifier(part.expression) && part.expression.text === namespace && part.name.text.endsWith('Controller'))
              || (ts.isQualifiedName(part) && ts.isIdentifier(part.left) && part.left.text === namespace && part.right.text.endsWith('Controller'))
              || (ts.isElementAccessExpression(part) && ts.isIdentifier(part.expression) && part.expression.text === namespace && part.argumentExpression && ts.isStringLiteral(part.argumentExpression) && part.argumentExpression.text.endsWith('Controller'))) {
              controller = true
            }
            part.forEachChild(inspectNamespace)
          }
          inspectNamespace(sf)
        }
        inspect(node.moduleSpecifier.text, runtime, controller)
      }
      else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const runtime = !node.isTypeOnly && (!node.exportClause || !ts.isNamedExports(node.exportClause) || node.exportClause.elements.some(item => !item.isTypeOnly))
        inspect(node.moduleSpecifier.text, runtime)
      }
      else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
        inspect(node.argument.literal.text, false)
      }
      else if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        inspect(node.arguments[0].text, true)
      }
      node.forEachChild(visit)
    }
    visit(sf)
  }
  // Runtime-only strongly connected components. Type imports still obey ownership rules.
  const graph = new Map<string, string[]>()
  for (const edge of edges.filter(edge => edge.runtime))
    graph.set(edge.from, [...(graph.get(edge.from) ?? []), edge.to])
  const indices = new Map<string, number>()
  const low = new Map<string, number>()
  const active = new Set<string>()
  const stack: string[] = []
  let next = 0
  function connect(node: string): void {
    indices.set(node, next)
    low.set(node, next++)
    stack.push(node)
    active.add(node)
    for (const to of graph.get(node) ?? []) {
      if (!indices.has(to)) {
        connect(to)
        low.set(node, Math.min(low.get(node)!, low.get(to)!))
      }
      else if (active.has(to)) {
        low.set(node, Math.min(low.get(node)!, indices.get(to)!))
      }
    }
    if (low.get(node) === indices.get(node)) {
      const component: string[] = []
      let current: string
      do {
        current = stack.pop()!
        active.delete(current)
        component.push(current)
      } while (current !== node)
      if (component.length > 1 || graph.get(node)?.includes(node)) {
        const members = new Set(component)
        for (const from of [...members].sort()) {
          for (const to of graph.get(from) ?? []) {
            if (members.has(to))
              add('runtime-cycle', from, to)
          }
        }
      }
    }
  }
  for (const node of graph.keys()) {
    if (!indices.has(node))
      connect(node)
  }
  exceptions.forEach((exception, index) => {
    if (!hit.has(index))
      problems.push({ rule: 'stale-exception', from: exception.from, to: exception.to })
  })
  return { edges, violations: [...new Set(problems.map(item => `${item.rule}: ${item.from} -> ${item.to}`))].sort() }
}

export function scanModuleSources(): Record<string, string> {
  const sources: Record<string, string> = {}
  function walk(directory: string): void {
    for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', 'tests', '__tests__', 'test-lib', 'coverage', 'mcp-dev-tools'].includes(entry.name))
          walk(file)
      }
      else if (/\.tsx?$/.test(file) && !/\.(?:test|spec|config|d)\.tsx?$/.test(file)) {
        sources[file] = fs.readFileSync(path.join(root, file), 'utf8')
      }
    }
  }
  for (const directory of ['domain-contracts/src', 'shared', 'server', 'cli/src', 'mcp-server/src'])
    walk(directory)
  return sources
}

if (import.meta.main) {
  const sources = scanModuleSources()
  const exceptions: BoundaryException[] = JSON.parse(fs.readFileSync(path.join(root, 'scripts/module-boundary-exceptions.json'), 'utf8'))
  const result = checkModuleBoundaries(sources, exceptions)
  for (const violation of result.violations)
    console.error(violation)
  console.log(`${Object.keys(sources).length} sources; ${result.edges.length} resolved edges; ${result.violations.length} violations; ${exceptions.length} exact exceptions`)
  process.exitCode = result.violations.length ? 1 : 0
}
