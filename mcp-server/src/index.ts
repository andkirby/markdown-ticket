#!/usr/bin/env node

import process from 'node:process'

import { MarkdownService } from '@mdt/shared/services/MarkdownService.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TemplateService } from '@mdt/shared/services/TemplateService.js'
import { TitleExtractionService } from '@mdt/shared/services/TitleExtractionService.js'
import { WorktreeService } from '@mdt/shared/services/WorktreeService.js'
import { ConfigService } from './config/index.js'
import { CRService } from './services/crService.js'
import { MCPTools } from './tools/index.js'
import { startHttpTransport } from './transports/http.js'
import { startStdioTransport } from './transports/stdio.js'

class MCPCRServer {
  private configService!: ConfigService
  private projectService!: ProjectService
  private crService!: CRService
  private templateService!: TemplateService
  private markdownService!: MarkdownService
  private titleExtractionService!: TitleExtractionService
  private worktreeService!: WorktreeService
  private mcpTools: MCPTools | undefined
  private quiet: boolean
  private detectedProject: string | null = null

  constructor(quiet: boolean = false) {
    this.quiet = quiet
    this.setupErrorHandling()
    this.initializeServices()
  }

  /**
   * Log to stderr unless quiet mode is enabled
   */
  private log(message: string): void {
    if (!this.quiet) {
      console.error(message)
    }
  }

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      this.log(`❌ Uncaught Exception: ${error}`)
      process.exit(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      this.log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`)
      process.exit(1)
    })

    process.on('SIGINT', () => {
      this.log('\n🛑 Received SIGINT, shutting down gracefully...')
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      this.log('\n🛑 Received SIGTERM, shutting down gracefully...')
      process.exit(0)
    })
  }

  private initializeServices(): void {
    this.log('🚀 Initializing MCP CR Server...')

    // Initialize configuration
    this.configService = new ConfigService(this.quiet)
    const _config = this.configService.getConfig()

    // Initialize services
    this.projectService = new ProjectService(this.quiet)
    this.crService = new CRService()
    this.templateService = new TemplateService(undefined, this.quiet)
    this.markdownService = new MarkdownService()
    this.titleExtractionService = new TitleExtractionService()
    this.worktreeService = new WorktreeService()

    this.log('✅ Services initialized')
  }

  /**
   * Initialize MCP tools with detected project context
   * Called after project detection to set up tools with proper context
   */
  private initializeMCPTools(): void {
    this.mcpTools = new MCPTools(
      this.projectService,
      this.crService,
      this.templateService,
      this.markdownService,
      this.titleExtractionService,
      this.worktreeService,
      this.detectedProject,
    )
  }

  /**
   * Detect default project from current working directory
   * Called at startup to enable single-project mode
   * Uses shared ProjectService for root-up detection
   */
  private async startupProjectDetection(): Promise<void> {
    this.log('🔍 Detecting project configuration...')

    const result = await this.projectService.resolveCurrentProject()

    if (result.data) {
      this.detectedProject = result.data.project.code
      this.log(`✅ Single-project mode: ${this.detectedProject}`)
    }
    else {
      this.log('ℹ️  Multi-project mode')
    }
  }

  async start(): Promise<void> {
    try {
      // Detect project from cwd (before starting transports)
      await this.startupProjectDetection()

      // Initialize MCP tools with detected project context
      this.initializeMCPTools()

      // Validate configuration
      this.log('🔍 Validating configuration...')
      const validation = await this.configService.validateConfig()

      if (!validation.valid) {
        this.log('❌ Configuration validation failed:')
        validation.errors.forEach(error => this.log(`  • ${error}`))

        this.log('\n💡 To create a default configuration file, run:')
        this.log(`echo 'Creating config...' && mkdir -p ~/.config/mcp-server && cat > ~/.config/mcp-server/config.toml << 'EOF'\n${this.generateSampleConfig()}\nEOF`)

        process.exit(1)
      }

      if (validation.warnings.length > 0) {
        this.log('⚠️  Configuration warnings:')
        validation.warnings.forEach(warning => this.log(`  • ${warning}`))
      }

      // Start transports
      this.log('🚀 Starting MCP CR Server...')
      const httpEnabled = process.env.MCP_HTTP_ENABLED === 'true' || process.env.HTTP_ENABLED === 'true'
      const httpPort = Number.parseInt(process.env.MCP_HTTP_PORT || process.env.HTTP_PORT || '3002', 10)

      if (httpEnabled) {
        await startHttpTransport(this.mcpTools!, { port: httpPort })
      }
      else {
        await startStdioTransport(this.mcpTools!)
      }
    }
    catch (error) {
      this.log(`❌ Error starting server: ${error}`)
      process.exit(1)
    }
  }

  private generateSampleConfig(): string {
    return `# MCP CR Server Configuration
# Global configuration for managing markdown-based CR tickets

# Root directory containing all markdown projects
# Default: \${HOME}/markdown-ticket
projects_root = "\${HOME}/markdown-ticket"

# Path to the shared library
# Default: \${HOME}/markdown-ticket/shared
shared_lib_path = "\${HOME}/markdown-ticket/shared"

# Default ticket numbering prefix (e.g., "MDT" for MDT-001)
# Default: "MDT"
project_code = "MDT"

# Enable debug logging
# Default: false
debug = false

# Quiet mode (suppress log output)
# Default: false
quiet = false
`
  }
}

// CLI entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const quietMode = args.includes('--quiet') || args.includes('-q') || process.env.MCP_QUIET === 'true' || process.env.QUIET === 'true'

  const server = new MCPCRServer(quietMode)
  await server.start()
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
