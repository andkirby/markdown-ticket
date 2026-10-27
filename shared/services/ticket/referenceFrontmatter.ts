import { isMap, isNode, isScalar, isSeq, parseDocument } from 'yaml'

/** YAML node ranges include comments between entries without consuming the next field. */
function referenceField(frontmatter: string) {
  const document = parseDocument(frontmatter)
  if (!isMap(document.contents))
    return undefined
  const pair = document.contents.items.find(item => isScalar(item.key) && item.key.value === 'refs')
  if (!pair)
    return undefined
  if (document.errors.length)
    throw new Error(`Invalid refs frontmatter: ${document.errors[0]!.message}`)
  const start = isScalar(pair.key) ? pair.key.range?.[0] : undefined
  const end = isNode(pair.value) ? pair.value.range?.[1] : undefined
  if (start === undefined || end === undefined)
    throw new Error('refs frontmatter must be a YAML string array')
  return { start, end, value: pair.value }
}

export function readReferenceFrontmatter(frontmatter: string): string[] | undefined {
  const field = referenceField(frontmatter)
  if (!field)
    return undefined
  if (!isSeq(field.value))
    throw new Error('refs frontmatter must be a YAML string array')
  return field.value.items.map((item) => {
    if (!isScalar(item) || typeof item.value !== 'string')
      throw new Error('refs frontmatter must be a YAML string array')
    return item.value
  })
}

export function writeReferenceFrontmatter(markdown: string, refs: readonly string[]): string {
  const match = /^(\uFEFF?---[ \t]*\r?\n)([\s\S]*?)(\r?\n---[ \t]*(?:\r?\n|$))/.exec(markdown)
  if (!match)
    throw new Error('Ticket frontmatter is missing')
  const newline = match[1]!.includes('\r\n') ? '\r\n' : '\n'
  const frontmatter = match[2]!
  const field = referenceField(frontmatter)
  const serialized = `refs: ${JSON.stringify(refs)}`
  const updated = field
    ? frontmatter.slice(0, field.start) + serialized
    + (frontmatter.slice(field.start, field.end).endsWith('\n') ? newline : '')
    + frontmatter.slice(field.end)
    : frontmatter + newline + serialized
  return match[1] + updated + match[3] + markdown.slice(match[0].length)
}
