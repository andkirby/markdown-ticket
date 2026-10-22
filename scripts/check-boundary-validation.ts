/** MDT-258: a constrained AST convention gate, with exact phased exceptions. */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

export interface Site {
  file: string
  function: string
  kind: string
  expression: string
  count: number
  delegate?: string
}
export interface LegacySite extends Site {
  reason: string
  phase: number
}
export interface Decoder {
  file: string
  parser: string
  fallback: string
  fixture: string
}
export interface Manifest {
  legacy: LegacySite[]
  decoders: Decoder[]
}

const root = path.resolve(import.meta.dir, '..')
const helperFile = 'server/http/parseRequest.ts'
const wrapperFile = 'mcp-server/src/tools/defineTool.ts'
const printer = ts.createPrinter({ removeComments: true })
const sourceFields = new Set(['body', 'params', 'query'])

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node)
  node.forEachChild(child => walk(child, visit))
}
function member(node: ts.Node): string | undefined {
  if (ts.isPropertyAccessExpression(node))
    return node.name.text
  if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteral(node.argumentExpression))
    return node.argumentExpression.text
}
function unwrap(node: ts.Node): ts.Node {
  while (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node)) node = node.expression
  return node
}
function functionIdentity(node: ts.Node, sf: ts.SourceFile): string {
  const names: string[] = []
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
    if ((ts.isMethodDeclaration(current) || ts.isFunctionDeclaration(current) || ts.isClassDeclaration(current)) && current.name) {
      names.unshift(current.name.getText(sf))
    }
    else if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const parent = current.parent
      if (ts.isCallExpression(parent)) {
        // Include the route and verb, so moving a read to another route cannot
        // borrow its old exception. Nested anonymous callbacks remain distinct.
        names.unshift(`${parent.expression.getText(sf)}(${parent.arguments.filter(ts.isStringLiteral).map(arg => JSON.stringify(arg.text)).join(',')})`)
      }
      else if (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent)) {
        names.unshift(parent.name.getText(sf))
      }
      else {
        names.unshift('<callback>')
      }
    }
  }
  return names.join('/') || '<module>'
}
function isDecoderCall(node: ts.Node): boolean {
  return ts.isCallExpression(node) && (node.expression.getText() === 'JSON.parse' || ['parseToml', 'matter', 'grayMatter', 'parseFrontmatter', 'parseYamlFrontmatter'].includes(member(node.expression) ?? node.expression.getText()))
}
function importedName(sf: ts.SourceFile, file: string, exported: string): Set<string> {
  const names = new Set<string>()
  for (const statement of sf.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(sf.fileName), statement.moduleSpecifier.text)).replace(/\.js$/, '.ts')
    if (target !== file)
      continue
    const bindings = statement.importClause?.namedBindings
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements) {
        if ((binding.propertyName ?? binding.name).text === exported)
          names.add(binding.name.text)
      }
    }
  }
  return names
}

/** Virtual source maps make the same production rules executable in fixtures. */
export function scanSources(sources: Record<string, string>, decoderFiles: ReadonlySet<string> = new Set()): Site[] {
  const files = Object.entries(sources).map(([file, text]) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true))
  // A symbol table distinguishes aliases and shadowed callback identifiers.
  const host = ts.createCompilerHost({ noLib: true })
  const byName = new Map(files.map(sf => [sf.fileName, sf]))
  host.getSourceFile = file => byName.get(file)
  const program = ts.createProgram(files.map(sf => sf.fileName), { noLib: true, noResolve: true }, host)
  const checker = program.getTypeChecker()
  const sites = new Map<string, Site>()
  for (const sf of files) {
    const requestSymbols = new Set<ts.Symbol>()
    const rawSymbols = new Set<ts.Symbol>()
    const decodedSymbols = new Set<ts.Symbol>()
    const parsers = importedName(sf, helperFile, 'parseRequest')
    const requestTypes = new Set(['Request', 'AuthenticatedRequest'])
    const decoderNames = new Set<string>()
    for (const statement of sf.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
        continue
      const bindings = statement.importClause?.namedBindings
      if (bindings && ts.isNamedImports(bindings)) {
        for (const binding of bindings.elements) {
          const exported = (binding.propertyName ?? binding.name).text
          if (statement.moduleSpecifier.text === 'express' && exported === 'Request')
            requestTypes.add(binding.name.text)
          if (['parseToml', 'parseYamlFrontmatter'].includes(exported))
            decoderNames.add(binding.name.text)
        }
      }
      if (statement.moduleSpecifier.text === 'gray-matter' && statement.importClause?.name)
        decoderNames.add(statement.importClause.name.text)
    }
    const decoderCall = (node: ts.Node): boolean => {
      if (isDecoderCall(node))
        return true
      if (!ts.isCallExpression(node))
        return false
      if (ts.isIdentifier(node.expression))
        return decoderNames.has(node.expression.text)
      return (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
        && node.expression.expression.getText(sf) === 'JSON' && member(node.expression) === 'parse'
    }
    const owner = (name: ts.Node, seen = new Set<ts.Symbol>()): string => {
      const symbol = checker.getSymbolAtLocation(name)
      if (!symbol || seen.has(symbol))
        return `${sf.fileName}#${name.getText(sf)}`
      seen.add(symbol)
      const declaration = symbol.declarations?.[0]
      if (declaration && ts.isImportSpecifier(declaration)) {
        const source = declaration.parent.parent.parent
        if (ts.isImportDeclaration(source) && ts.isStringLiteral(source.moduleSpecifier))
          return `${source.moduleSpecifier.text}#${(declaration.propertyName ?? declaration.name).text}`
      }
      if (declaration && (ts.isParameter(declaration) || ts.isVariableDeclaration(declaration))) {
        if (declaration.type && ts.isTypeReferenceNode(declaration.type))
          return owner(declaration.type.typeName, seen)
        if (declaration.initializer && ts.isNewExpression(declaration.initializer))
          return owner(declaration.initializer.expression, seen)
      }
      return `${sf.fileName}#${name.getText(sf)}`
    }
    const consumption = (node: ts.Node): ts.Node => {
      while (node.parent && ts.isExpression(node.parent) && !ts.isFunctionLike(node.parent)) node = node.parent
      if (node.parent && ts.isVariableDeclaration(node.parent))
        return node.parent
      return node
    }
    const add = (node: ts.Node, kind: string) => {
      const expression = printer.printNode(ts.EmitHint.Unspecified, ['request-read', 'tool-read'].includes(kind) ? consumption(node) : node, sf).trim()
      const site: Site = { file: sf.fileName, function: functionIdentity(node, sf), kind, expression, count: 1 }
      if (kind === 'request-delegation' && ts.isCallExpression(node)) {
        const callee = node.expression
        site.delegate = ts.isPropertyAccessExpression(callee) ? `${owner(callee.expression)}.${callee.name.text}` : owner(callee)
      }
      const key = JSON.stringify([site.file, site.function, site.kind, site.expression, site.delegate])
      const existing = sites.get(key)
      if (existing)
        existing.count++
      else sites.set(key, site)
    }
    const symbolIn = (node: ts.Node, symbols: Set<ts.Symbol>) => {
      const symbol = checker.getSymbolAtLocation(unwrap(node))
      return symbol !== undefined && symbols.has(symbol)
    }
    walk(sf, (node) => {
      if (!ts.isParameter(node) || !ts.isIdentifier(node.name))
        return
      const symbol = checker.getSymbolAtLocation(node.name)
      if (!symbol)
        return
      const type = node.type?.getText(sf) ?? ''
      const parent = node.parent
      const route = (ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) && ts.isCallExpression(parent.parent)
        && /\.(?:get|post|put|patch|delete|use|all)$/.test(parent.parent.expression.getText(sf))
        && parent.parameters[0] === node
      // JsonRpcRequest is a transport envelope, not an Express Request.
      const httpFile = /^(?:server\/|mcp-server\/src\/transports\/)/.test(sf.fileName)
      const requestType = (/\b\w*Request\b/.test(type) || [...requestTypes].some(name => type === name || type.startsWith(`${name}<`)))
        && !/JsonRpc|IncomingMessage/.test(type)
      const conventionalParameter = !node.type && (ts.isMethodDeclaration(parent) || ts.isFunctionDeclaration(parent))
        && sf.fileName.startsWith('server/') && /^(?:req|request|_req)$/.test(node.name.text)
      if (httpFile && (requestType || conventionalParameter || route))
        requestSymbols.add(symbol)
      if (sf.fileName.startsWith('mcp-server/') && ts.isMethodDeclaration(parent) && ['handleToolCall', 'handleLegacyRead'].includes(parent.name.getText(sf)) && parent.parameters[1] === node)
        rawSymbols.add(symbol)
    })
    walk(sf, (node) => {
      if (!ts.isCallExpression(node) || !/\.(?:get|post|put|patch|delete|use|all)$/.test(node.expression.getText(sf)))
        return
      for (const arg of node.arguments) {
        if (!ts.isIdentifier(arg))
          continue
        const declaration = checker.getSymbolAtLocation(arg)?.declarations?.[0]
        const callback = declaration && ts.isVariableDeclaration(declaration) ? declaration.initializer : declaration
        if (!callback || !(ts.isFunctionDeclaration(callback) || ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)))
          continue
        const parameter = callback.parameters[0]
        if (parameter && ts.isIdentifier(parameter.name)) {
          const symbol = checker.getSymbolAtLocation(parameter.name)
          if (symbol)
            requestSymbols.add(symbol)
        }
      }
    })
    // Alias discovery is monotonic and bounded by the number of declarations.
    let changed = true
    while (changed) {
      changed = false
      walk(sf, (node) => {
        let target: ts.Node | undefined
        let value: ts.Node | undefined
        if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.name)) {
          target = node.name
          value = node.initializer
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)) {
          target = node.left
          value = node.right
        }
        if (!target || !value)
          return
        const symbol = checker.getSymbolAtLocation(target)
        if (!symbol)
          return
        for (const set of [requestSymbols, rawSymbols, decodedSymbols]) {
          if (!set.has(symbol) && symbolIn(value, set)) {
            set.add(symbol)
            changed = true
          }
        }
        if (decoderCall(unwrap(value)) && !decodedSymbols.has(symbol)) {
          decodedSymbols.add(symbol)
          changed = true
        }
        if (sf.fileName.startsWith('mcp-server/') && functionIdentity(node, sf).endsWith('handleLegacyRead') && ts.isIdentifier(unwrap(value)) && unwrap(value).getText(sf) === 'raw' && !rawSymbols.has(symbol)) {
          rawSymbols.add(symbol)
          changed = true
        }
      })
    }
    walk(sf, (node) => {
      if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
        if (sourceFields.has(member(node) ?? '') && symbolIn(node.expression, requestSymbols)) {
          const parent = node.parent
          const directParse = ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && parsers.has(parent.expression.text) && parent.arguments[1] === node
            && !checker.getSymbolAtLocation(parent.expression)?.declarations?.some(decl => !ts.isImportSpecifier(decl))
          if (!directParse)
            add(node, 'request-read')
        }
        if (symbolIn(node.expression, rawSymbols) && sf.fileName !== wrapperFile)
          add(node, 'tool-read')
      }
      if (ts.isVariableDeclaration(node) && node.initializer && ts.isObjectBindingPattern(node.name) && symbolIn(node.initializer, rawSymbols))
        add(node, 'tool-destructure')
      if (ts.isParameter(node) && ts.isObjectBindingPattern(node.name) && (/Request/.test(node.type?.getText(sf) ?? '') || requestTypes.has(node.type?.getText(sf) ?? '') || (ts.isArrowFunction(node.parent) && ts.isCallExpression(node.parent.parent) && /\.(?:get|post|put|patch|delete|use|all)$/.test(node.parent.parent.expression.getText(sf)))))
        add(node, 'request-destructure')
      if (ts.isVariableDeclaration(node) && node.type && node.initializer && (decoderCall(unwrap(node.initializer)) || symbolIn(node.initializer, decodedSymbols)))
        add(node, 'decoder-cast')
      if (ts.isVariableDeclaration(node) && node.initializer && ts.isObjectBindingPattern(node.name) && symbolIn(node.initializer, requestSymbols))
        add(node, 'request-destructure')
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isObjectLiteralExpression(node.left) && symbolIn(node.right, requestSymbols))
        add(node, 'request-destructure')
      if (ts.isCallExpression(node)) {
        if (node.arguments.some(arg => symbolIn(arg, requestSymbols)))
          add(node, 'request-delegation')
        if (decoderFiles.has(sf.fileName) && decoderCall(node))
          add(node, 'decoder')
      }
      if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && (decoderCall(unwrap(node.expression)) || symbolIn(node.expression, decodedSymbols)))
        add(node, 'decoder-cast')
      if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && symbolIn(node.expression, rawSymbols) && sf.fileName !== wrapperFile)
        add(node, 'tool-cast')
    })
  }
  return [...sites.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
}

export function compareManifest(sites: Site[], legacy: LegacySite[]): string[] {
  const key = (site: Site) => JSON.stringify([site.file, site.function, site.kind, site.expression, site.delegate])
  const found = new Map(sites.map(site => [key(site), site]))
  const approved = new Map(legacy.map(site => [key(site), site]))
  const errors: string[] = []
  if (approved.size !== legacy.length)
    errors.push('Duplicate legacy site identities')
  for (const site of sites) {
    const exception = approved.get(key(site))
    if (!exception || exception.count !== site.count)
      errors.push(`Unvalidated boundary (${site.count} occurrences): ${key(site)}`)
  }
  for (const site of legacy) {
    if (!site.reason || site.phase < 2 || site.phase > 5)
      errors.push(`Invalid exception metadata: ${key(site)}`)
    if (!found.has(key(site)))
      errors.push(`Stale exception: ${key(site)}`)
  }
  return errors
}

/** Registry syntax is deliberately narrow: real imported defineTool per key. */
export function checkRegistry(indexText: string, configText: string): string[] {
  const sf = ts.createSourceFile('mcp-server/src/tools/index.ts', indexText, ts.ScriptTarget.Latest, true)
  const config = ts.createSourceFile('config.ts', configText, ts.ScriptTarget.Latest, true)
  const wrappers = importedName(sf, wrapperFile, 'defineTool')
  walk(sf, (node) => {
    if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name && wrappers.has(node.name.getText(sf)))
      wrappers.delete(node.name.getText(sf))
  })
  const advertised = new Set<string>()
  const registered = new Set<string>()
  const errors: string[] = []
  walk(config, (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(config) === 'TOOL_NAMES' && node.initializer) {
      const object = unwrap(node.initializer)
      if (ts.isObjectLiteralExpression(object)) {
        for (const prop of object.properties) {
          if (ts.isPropertyAssignment(prop))
            advertised.add(prop.name.getText(config))
        }
      }
    }
  })
  walk(sf, (node) => {
    if (ts.isBinaryExpression(node) && node.left.getText(sf) === 'this.registry' && ts.isObjectLiteralExpression(node.right)) {
      for (const prop of node.right.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isComputedPropertyName(prop.name) || !ts.isPropertyAccessExpression(prop.name.expression) || prop.name.expression.expression.getText(sf) !== 'TOOL_NAMES') {
          errors.push('Registry keys must use TOOL_NAMES')
          continue
        }
        const name = prop.name.expression.name.text
        if (registered.has(name))
          errors.push(`Duplicate registry key: ${name}`)
        registered.add(name)
        if (!ts.isCallExpression(prop.initializer) || !ts.isIdentifier(prop.initializer.expression) || !wrappers.has(prop.initializer.expression.text))
          errors.push(`Registry entry must use imported defineTool: ${name}`)
      }
    }
    if (ts.isMethodDeclaration(node) && node.name.getText(sf) === 'handleToolCall' && node.parameters[1]?.type?.kind !== ts.SyntaxKind.UnknownKeyword)
      errors.push('Dispatcher arguments must be unknown')
  })
  if (!advertised.size || [...advertised].some(name => !registered.has(name)) || [...registered].some(name => !advertised.has(name)))
    errors.push('Registry keys differ from advertised TOOL_NAMES')
  return errors
}

function productionFiles(directory: string): string[] {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const file = `${directory}/${entry.name}`
    if (entry.isDirectory())
      return /^(?:node_modules|dist|tests|__tests__|__mocks__|fixtures|test-lib|\.git)$/.test(entry.name) ? [] : productionFiles(file)
    return /\.ts$/.test(file) && !/\.(?:test|spec|d)\.ts$/.test(file) ? [file] : []
  })
}
export function checkWorkspace(manifest: Manifest) {
  const sources = Object.fromEntries(['server', 'mcp-server/src', 'shared', 'cli/src'].flatMap(productionFiles).map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]))
  const sites = scanSources(sources, new Set(manifest.decoders.map(decoder => decoder.file)))
  const errors = compareManifest(sites, manifest.legacy)
  for (const decoder of manifest.decoders) {
    if (!sources[decoder.file] || !decoder.parser || !decoder.fallback || !fs.existsSync(path.join(root, decoder.fixture)))
      errors.push(`Invalid decoder registration: ${decoder.file}`)
    if (!sites.some(site => site.file === decoder.file && site.kind === 'decoder'))
      errors.push(`Unused decoder registration: ${decoder.file}`)
  }
  errors.push(...checkRegistry(sources['mcp-server/src/tools/index.ts'], sources['mcp-server/src/tools/config/allTools.ts']))
  return { sites, errors }
}
if (import.meta.main) {
  const manifest: Manifest = JSON.parse(fs.readFileSync(path.join(root, 'scripts/boundary-validation-legacy.json'), 'utf8'))
  const { sites, errors } = checkWorkspace(manifest)
  if (errors.length) {
    for (const error of errors) console.error(error)
    process.exitCode = 1
  }
  else {
    console.log(`Boundary conventions pass; ${sites.length} exact legacy identities (${sites.reduce((sum, site) => sum + site.count, 0)} occurrences), ${manifest.decoders.length} decoder modules.`)
  }
}
