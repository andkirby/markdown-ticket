#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ConfigService } from './config/index.js';
import { ProjectDiscoveryService } from './services/projectDiscovery.js';
import { CRService } from './services/crService.js';
// @ts-ignore
import { TemplateService } from '../../dist/services/TemplateService.js';
import { MCPTools } from './tools/index.js';

class MCPCRServer {
  private server: Server;
  private configService!: ConfigService;
  private projectDiscovery!: ProjectDiscoveryService;
  private crService!: CRService;
  private templateService!: TemplateService;
  private mcpTools!: MCPTools;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-cr-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupErrorHandling();
    this.initializeServices();
    this.setupHandlers();
  }

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      //console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      //console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    process.on('SIGINT', () => {
      //console.error('\\n🛑 Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      //console.error('\\n🛑 Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
  }

  private initializeServices(): void {
    // Debug: Initializing MCP CR Server...

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

    // Debug: Services initialized
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Debug: Listing available tools
      return {
        tools: this.mcpTools.getTools()
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      // Debug: Tool called: ${name}

      try {
        const result = await this.mcpTools.handleToolCall(name, args || {});
        
        // Debug: Tool completed successfully
        
        return {
          content: [
            {
              type: 'text',
              text: result
            }
          ]
        };
      } catch (error) {
        //console.error(`❌ Tool ${name} failed:`, error);
        
        // Return error as content rather than throwing
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Error in ${name}**\\n\\n${(error as Error).message}\\n\\nPlease check your input parameters and try again.`
            }
          ]
        };
      }
    });
  }

  async start(): Promise<void> {
    try {
      // Validate configuration
      // Debug: Validating configuration...
      const validation = await this.configService.validateConfig();
      
      if (!validation.valid) {
        //console.error('❌ Configuration validation failed:');
        // validation.errors.forEach(error => console.error(`  • ${error}`));
        
        //console.error('\\n💡 To create a default configuration file, run:');
        //console.error(`echo 'Creating config...' && mkdir -p ~/.config/mcp-server && cat > ~/.config/mcp-server/config.toml << 'EOF'\\n${this.generateSampleConfig()}\\nEOF`);
        
        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ Configuration warnings:');
        validation.warnings.forEach(warning => console.warn(`  • ${warning}`));
      }

      // Discover projects
      //console.error('🔍 Discovering projects...');
      const projects = await this.projectDiscovery.discoverProjects();
      //console.error(`📁 Found ${projects.length} project${projects.length === 1 ? '' : 's'}`);

      if (projects.length > 0) {
        //console.error('\\nProjects discovered:');
        projects.forEach(project => {
          //console.error(`  • ${project.id} - ${project.project.name}`);
          //console.error(`    Path: ${project.project.path}`);
        });
      }

      // Start MCP server
      //console.error('\\n🌐 Starting MCP server...');
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      //console.error('✅ MCP CR Server is running and ready for connections!');
      //console.error('\\n📡 Available tools:');
      const tools = this.mcpTools.getTools();
      tools.forEach(tool => {
        //console.error(`  • ${tool.name}: ${tool.description}`);
      });

      //console.error('\\n🔗 Connect your MCP client to start managing CRs across projects!');
      
    } catch (error) {
      //console.error('❌ Failed to start MCP CR Server:', (error as Error).message);
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
    //console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Handle module execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    //console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export { MCPCRServer };