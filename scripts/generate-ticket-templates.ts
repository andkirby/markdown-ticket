/** Generate or verify file projections of the compiled built-in template catalog. */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { builtinTemplateCatalog } from '@mdt/shared/templates/catalog.js'

const directory = resolve(import.meta.dirname, '../shared/templates')
const check = process.argv.includes('--check')
const projections = new Map(builtinTemplateCatalog.map(template => [template.file, template.template]))
const config = Object.fromEntries(builtinTemplateCatalog.map(template => [template.type, {
  type: template.type,
  file: template.file,
  requiredFields: template.requiredFields,
  sections: template.sections,
}]))
projections.set('templates.json', `${JSON.stringify(config, null, 2)}\n`)

for (const [filename, content] of projections) {
  const filePath = resolve(directory, filename)
  if (check) {
    const current = await readFile(filePath, 'utf8').catch(() => null)
    if (current !== content) {
      throw new Error(`Template projection is stale: shared/templates/${filename}. Compile with bun run --cwd shared build:tools, then run bun scripts/generate-ticket-templates.ts.`)
    }
  }
  else {
    await writeFile(filePath, content, 'utf8')
  }
}
