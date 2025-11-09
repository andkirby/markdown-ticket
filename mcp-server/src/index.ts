#!/usr/bin/env node

import { ConfigService } from './config/index.js';
import { ProjectDiscoveryService } from './services/projectDiscovery.js';
import { CRService } from './services/crService.js';
// @ts-ignore
import { TemplateService } from '@shared/services/TemplateService.js';
import { MCPTools } from './tools/index.js';
import { startStdioTransport } from './transports/stdio.js';
import { startHttpTransport } from './transports/http.js';

class MCPCRServer {
  private configService!: ConfigService;
  private projectDiscovery!: ProjectDiscoveryService;
  private crService!: CRService;
  private templateService!: TemplateService;
  private mcpTools!: MCPTools;

  constructor() {
    this.setupErrorHandling();
    this.initializeServices();
  }

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    process.on('SIGINT', () => {
      console.error('\n🛑 Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.error('\n🛑 Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
  }

  private initializeServices(): void {
    console.error('🚀 Initializing MCP CR Server...');

    // Initialize configuration
    this.configService = new ConfigService();
    const config = this.configService.getConfig();

    // Initialize services
    this.projectDiscovery = new ProjectDiscoveryService(config);
    this.crService = new CRService();
    this.templateService = new TemplateService();
    this.mcpTools = new MCPTools(
      this.projectDiscovery,
      this.crService,
      this.templateService
    );

    console.error('✅ Services initialized');
  }

  async start(): Promise<void> {
    try {
      // Validate configuration
      console.error('🔍 Validating configuration...');
      const validation = await this.configService.validateConfig();

      if (!validation.valid) {
        console.error('❌ Configuration validation failed:');
        validation.errors.forEach(error => console.error(`  • ${error}`));

        console.error('\n💡 To create a default configuration file, run:');
        console.error(`echo 'Creating config...' && mkdir -p ~/.config/mcp-server && cat > ~/.config/mcp-server/config.toml << 'EOF'\n${this.generateSampleConfig()}\nEOF`);

        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️  Configuration warnings:');
        validation.warnings.forEach(warning => console.warn(`  • ${warning}`));
      }

      // Discover projects
      console.error('🔍 Discovering projects...');
      const projects = await this.projectDiscovery.discoverProjects();
      console.error(`📁 Found ${projects.length} project${projects.length === 1 ? '' : 's'}`);

      if (projects.length > 0) {
        console.error('\nProjects discovered:');
        projects.forEach(project => {
          console.error(`  • ${project.id} - ${project.project.name}`);
          console.error(`    Path: ${project.project.path}`);
        });
      }

      console.error('\n🌐 Starting MCP transports...');

      // Start stdio transport (ALWAYS ON)
      console.error('📡 Starting stdio transport...');
      await startStdioTransport(this.mcpTools);
      console.error('✅ Stdio transport ready');

      // Start HTTP transport (OPTIONAL - enabled via env var)
      if (process.env.MCP_HTTP_ENABLED === 'true') {
        console.error('🌐 Starting HTTP transport...');
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

          console.error(`✅ HTTP transport ready at http://${host}:${port}/mcp`);
          console.error(`   Features: SSE=${true}, Sessions=${true}, RateLimit=${enableRateLimiting}, Auth=${enableAuth}`);
        } catch (error) {
          console.warn('⚠️  HTTP transport failed to start:', (error as Error).message);
          console.warn('   Stdio transport is still available');
        }
      } else {
        console.error('ℹ️  HTTP transport disabled (set MCP_HTTP_ENABLED=true to enable)');
      }

      console.error('\n✅ MCP CR Server is running and ready for connections!');
      console.error('\n📡 Available tools:');
      const tools = this.mcpTools.getTools();
      tools.forEach(tool => {
        console.error(`  • ${tool.name}: ${tool.description}`);
      });

      console.error('\n🔗 Connect your MCP client to start managing CRs across projects!');

    } catch (error) {
      console.error('❌ Failed to start MCP CR Server:', (error as Error).message);
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

// Start the server
async function main() {
  try {
    const server = new MCPCRServer();
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