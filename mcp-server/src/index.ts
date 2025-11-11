#!/usr/bin/env node

import { ConfigService } from './config/index.js';
import { ProjectService } from '@mdt/shared/services/ProjectService.js';
import { CRService } from './services/crService.js';
// @ts-ignore
import { TemplateService } from '@mdt/shared/services/TemplateService.js';
import { MCPTools } from './tools/index.js';
import { startStdioTransport } from './transports/stdio.js';
import { startHttpTransport } from './transports/http.js';

class MCPCRServer {
  private configService!: ConfigService;
  private projectService!: ProjectService;
  private crService!: CRService;
  private templateService!: TemplateService;
  private mcpTools!: MCPTools;
  private quiet: boolean;

  constructor(quiet: boolean = false) {
    this.quiet = quiet;
    this.setupErrorHandling();
    this.initializeServices();
  }

  /**
   * Log to stderr unless quiet mode is enabled
   */
  private log(message: string): void {
    if (!this.quiet) {
      console.error(message);
    }
  }

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      this.log('❌ Uncaught Exception: ' + error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.log('❌ Unhandled Rejection at: ' + promise + ', reason: ' + reason);
      process.exit(1);
    });

    process.on('SIGINT', () => {
      this.log('\n🛑 Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
  }

  private initializeServices(): void {
    this.log('🚀 Initializing MCP CR Server...');

    // Initialize configuration
    this.configService = new ConfigService(this.quiet);
    const config = this.configService.getConfig();

    // Initialize services
    this.projectService = new ProjectService(this.quiet);
    this.crService = new CRService();
    this.templateService = new TemplateService(undefined, this.quiet);
    this.mcpTools = new MCPTools(
      this.projectService,
      this.crService,
      this.templateService
    );

    this.log('✅ Services initialized');
  }

  async start(): Promise<void> {
    try {
      // Validate configuration
      this.log('🔍 Validating configuration...');
      const validation = await this.configService.validateConfig();

      if (!validation.valid) {
        this.log('❌ Configuration validation failed:');
        validation.errors.forEach(error => this.log(`  • ${error}`));

        this.log('\n💡 To create a default configuration file, run:');
        this.log(`echo 'Creating config...' && mkdir -p ~/.config/mcp-server && cat > ~/.config/mcp-server/config.toml << 'EOF'\n${this.generateSampleConfig()}\nEOF`);

        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        if (!this.quiet) {
          console.warn('⚠️  Configuration warnings:');
          validation.warnings.forEach(warning => console.warn(`  • ${warning}`));
        }
      }

      // Discover projects
      this.log('🔍 Discovering projects...');
      const projects = await this.projectService.getAllProjects();
      this.log(`📁 Found ${projects.length} project${projects.length === 1 ? '' : 's'}`);

      if (projects.length > 0) {
        this.log('\nProjects discovered:');
        projects.forEach(project => {
          this.log(`  • ${project.id} - ${project.project.name}`);
          this.log(`    Path: ${project.project.path}`);
        });
      }

      this.log('\n🌐 Starting MCP transports...');

      // Start stdio transport (ALWAYS ON)
      this.log('📡 Starting stdio transport...');
      await startStdioTransport(this.mcpTools);
      this.log('✅ Stdio transport ready');

      // Start HTTP transport (OPTIONAL - enabled via env var)
      if (process.env.MCP_HTTP_ENABLED === 'true') {
        this.log('🌐 Starting HTTP transport...');
        try {
          const port = parseInt(process.env.MCP_HTTP_PORT || '3002');
          const host = process.env.MCP_BIND_ADDRESS || '127.0.0.1';

          // Phase 2: Security features (all optional)
          const enableOriginValidation = process.env.MCP_SECURITY_ORIGIN_VALIDATION === 'true';
          const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
          const enableRateLimiting = process.env.MCP_SECURITY_RATE_LIMITING === 'true';
          const rateLimitMax = parseInt(process.env.MCP_RATE_LIMIT_MAX || '100');
          const rateLimitWindowMs = parseInt(process.env.MCP_RATE_LIMIT_WINDOW_MS || '60000');
          const enableAuth = process.env.MCP_SECURITY_AUTH === 'true';
          const authToken = process.env.MCP_AUTH_TOKEN;
          const sessionTimeoutMs = parseInt(process.env.MCP_SESSION_TIMEOUT_MS || '1800000'); // 30 min

          await startHttpTransport(this.mcpTools, {
            port,
            host,
            enableOriginValidation,
            allowedOrigins,
            enableRateLimiting,
            rateLimitMax,
            rateLimitWindowMs,
            enableAuth,
            authToken,
            sessionTimeoutMs
          });

          this.log(`✅ HTTP transport ready at http://${host}:${port}/mcp`);
          this.log(`   Features: SSE=${true}, Sessions=${true}, RateLimit=${enableRateLimiting}, Auth=${enableAuth}`);
        } catch (error) {
          if (!this.quiet) {
            console.warn('⚠️  HTTP transport failed to start:', (error as Error).message);
            console.warn('   Stdio transport is still available');
          }
        }
      } else {
        this.log('ℹ️  HTTP transport disabled (set MCP_HTTP_ENABLED=true to enable)');
      }

      this.log('\n✅ MCP CR Server is running and ready for connections!');
      this.log('\n📡 Available tools:');
      const tools = this.mcpTools.getTools();
      tools.forEach(tool => {
        this.log(`  • ${tool.name}: ${tool.description}`);
      });

      this.log('\n🔗 Connect your MCP client to start managing CRs across projects!');

    } catch (error) {
      this.log('❌ Failed to start MCP CR Server: ' + (error as Error).message);
      process.exit(1);
    }
  }

  private generateSampleConfig(): string {
    return `[server]
port = 8000
logLevel = "info"

[discovery]
scanPaths = ["~", "~/projects", "~/work"]
excludePaths = ["node_modules", ".git", "vendor"]
maxDepth = 4
cacheTimeout = 300

[templates]
# customPath = "~/.config/mcp-server/templates"`;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): { quiet: boolean } {
  const quiet = process.argv.includes('-q') || process.argv.includes('--quiet');
  return { quiet };
}

// Start the server
async function main() {
  try {
    const { quiet } = parseArgs();
    const server = new MCPCRServer(quiet);
    await server.start();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Handle module execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export { MCPCRServer };