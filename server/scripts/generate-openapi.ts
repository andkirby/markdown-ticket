/**
 * Generate OpenAPI specification file from JSDoc annotations
 * Run with: npm run openapi:generate.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { swaggerSpec } from '../openapi/config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function generateOpenAPISpec(): Promise<void> {
  const outputPath = path.join(__dirname, '..', 'openapi.yaml')

  try {
    const yamlContent = yaml.dump(swaggerSpec, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    })

    await fs.writeFile(outputPath, yamlContent, 'utf8')
    console.log(`OpenAPI spec generated at: ${outputPath}`)
  }
  catch (error) {
    console.error('Failed to generate OpenAPI spec:', error)
    process.exit(1)
  }
}

generateOpenAPISpec()
