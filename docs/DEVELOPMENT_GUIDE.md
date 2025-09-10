# Development Guide

Complete guide for developing and contributing to the Markdown Ticket Board project.

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
git clone <repository-url>
cd markdown-ticket
npm install
```

## Development Environment

### Frontend Development
```bash
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend Development
```bash
cd server
node server.js       # Start backend server (http://localhost:3001)
```

### Full Development Setup
```bash
# Terminal 1: Backend server
cd server && node server.js

# Terminal 2: Frontend development
npm run dev

# Terminal 3: MCP development tools (optional)
cd server/mcp-dev-tools && npm start

# Access application at http://localhost:5173
```

## MCP Development Tools

The project includes an MCP server for development log access and monitoring during development.

### Setup
```bash
# Build MCP development tools
cd server/mcp-dev-tools
npm install
npm run build

# Start MCP server (for AI assistant integration)
npm start
```

### Available Tools
- `get_frontend_logs` - Access filtered frontend development logs
- `get_frontend_session_status` - Check frontend development server status
- `stop_frontend_logging` - Stop frontend logging session
- `stream_frontend_url` - Access frontend URLs and endpoints

### AI Assistant Integration
- **Claude Desktop**: Configured as `mdt-logging` in `.claude/settings.local.json`
- **Amazon Q CLI**: Configured as `mdt-logging-local` in `.amazonq/mcp.json`

**Complete Documentation**: See `server/mcp-dev-tools/README.md`

## Testing

### Unit Tests
```bash
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

### End-to-End Tests
```bash
npm run test:e2e     # Run end-to-end tests
```

### MCP Testing
```bash
# Test MCP CR management server
cd mcp-server
npm run build
npm start

# Test MCP development tools
cd server/mcp-dev-tools
npm run build
npm start
```

## Architecture

### Shared Core Architecture
The project uses a unified shared core architecture:

- **`shared/models/`** - Unified type definitions (CR, Project, Config)
- **`shared/services/`** - Core business logic (ProjectService, MarkdownService, TemplateService, CRService)
- **`shared/templates/`** - File-based CR templates
- **`shared/utils/`** - Constants and utilities

### System Components
- **Frontend** (`src/`) - React application with Kanban board interface
- **Backend** (`server/`) - Node.js API server
- **MCP CR Server** (`mcp-server/`) - Model Context Protocol server for CR management
- **MCP Dev Tools** (`server/mcp-dev-tools/`) - Development logging and monitoring

### Template System
Templates are stored as files in `shared/templates/`:
- `templates.json` - Template configuration
- `bug-fix.md`, `architecture.md`, etc. - Template content files

## Code Organization

### Frontend Structure
```
src/
├── components/          # React components
├── hooks/              # Custom React hooks  
├── types/              # Frontend-specific types
├── config/             # UI configuration
└── utils/              # Frontend utilities
```

### Backend Structure
```
server/
├── routes/             # API routes
├── middleware/         # Express middleware
├── utils/              # Backend utilities
└── mcp-dev-tools/      # MCP development server
```

### Shared Core Structure
```
shared/
├── models/             # Type definitions
├── services/           # Business logic services
├── templates/          # CR templates
└── utils/              # Shared utilities
```

## Development Workflow

### Making Changes

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Start development environment**
   ```bash
   # Terminal 1: Backend
   cd server && node server.js
   
   # Terminal 2: Frontend
   npm run dev
   ```

3. **Make changes** using shared core services where possible

4. **Test changes**
   ```bash
   npm run test
   npm run test:e2e
   ```

5. **Build and verify**
   ```bash
   npm run build
   npm run preview
   ```

### Adding New Features

#### Frontend Features
- Use shared types from `shared/models/Types.ts`
- Leverage shared services for business logic
- Follow existing component patterns

#### Backend Features  
- Import shared services and types
- Use unified configuration from shared core
- Maintain API consistency

#### MCP Features
- Extend existing MCP servers or create new tools
- Use shared core for all business logic
- Document new tools in respective README files

### Working with Templates
- Template files: `shared/templates/*.md`
- Template config: `shared/templates/templates.json`
- Template service: `shared/services/TemplateService.ts`

## Common Development Tasks

### Adding a New CR Type
1. Add type to `shared/models/Types.ts`
2. Create template file in `shared/templates/`
3. Update `shared/templates/templates.json`
4. Update frontend type dropdowns
5. Test with MCP server

### Adding New CR Fields
1. Update `CR` interface in `shared/models/Types.ts`
2. Update `CRService.createCR()` method
3. Update frontend forms and displays
4. Update MCP server tools
5. Update templates if needed

### Debugging Issues
1. **Use MCP development tools** for real-time log monitoring
2. **Check browser console** for frontend errors
3. **Monitor backend logs** in terminal
4. **Use React DevTools** for component debugging

## Configuration

### Environment Variables
- `BACKEND_URL` - Backend server URL (default: http://localhost:3001)
- `MCP_PROJECT_FILTER` - Limit MCP to specific project
- `MCP_SCAN_PATHS` - Set project paths for MCP scanning

### Configuration Files
- `.mdt-config.toml` - Project configuration
- `~/.config/markdown-ticket/mcp-server.toml` - MCP server config
- `~/.config/markdown-ticket/user.toml` - User preferences

## Troubleshooting

### Common Issues

#### Frontend Not Loading
1. Check if backend is running on port 3001
2. Verify npm dependencies are installed
3. Check browser console for errors

#### MCP Server Issues
1. Ensure server is built: `npm run build`
2. Check Node.js version compatibility
3. Verify configuration files exist

#### Template Issues
1. Check template files exist in `shared/templates/`
2. Verify `templates.json` configuration
3. Ensure TemplateService can read files

### Getting Help
1. Check existing documentation in `docs/`
2. Review related CRs in `docs/CRs/`
3. Use MCP development tools for debugging
4. Check GitHub issues (if applicable)

## Related Documentation

- **Frontend Issues**: `docs/FRONTEND_DEVELOPMENT_GUIDE.md`
- **MCP Development Tools**: `server/mcp-dev-tools/README.md`
- **MCP CR Management**: `mcp-server/MCP_TOOLS.md`
- **Architecture**: `docs/architecture-guide.md`
- **Main README**: Project overview and quick start

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the development workflow above
4. Add tests for new functionality
5. Update documentation as needed
6. Submit a pull request

### Code Style
- Use TypeScript for type safety
- Follow existing naming conventions
- Leverage shared core services
- Document new features and APIs
- Write tests for new functionality
