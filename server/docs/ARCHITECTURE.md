# Architecture: Server

Layered architecture for the Express API server.

## Layers

```
HTTP Clients → server.js → Middleware → Routes → Controllers → Services → Data Storage
```

| Layer | Responsibility |
|-------|---------------|
| **Routes** | Define endpoints, map to controllers |
| **Controllers** | HTTP handling, request/response formatting |
| **Services** | Business logic, coordinate operations |
| **Utilities** | Pure helper functions |

## Request Flow Example

```
GET /api/projects/markdown-ticket/crs
  → Middleware (validation, security)
  → Route handler (projects.js)
  → ProjectController.getProjectCRs()
  → TicketService.getProjectCRs()
  → ProjectDiscovery.getProjectCRs()
  → File system (read markdown files)
  ← JSON response
```

## Dependency Injection

```javascript
// Core services
const fileWatcher = new FileWatcherService()
const projectDiscovery = new ProjectDiscoveryService()

// Business services (inject dependencies)
const projectService = new ProjectService(projectDiscovery)
const ticketService = new TicketService(projectDiscovery)

// Controllers (inject services)
const projectController = new ProjectController(
  projectService, ticketService, fileSystemService, fileWatcher
)

// Routes (inject controllers)
const projectRouter = createProjectRouter(projectController)
app.use('/api/projects', projectRouter)
```

## Module Responsibilities

| Module | Does | Doesn't |
|--------|------|---------|
| Routes | Define endpoints | Business logic |
| Controllers | HTTP handling | Business logic |
| Services | Business rules | HTTP concerns |
| Utilities | Pure functions | State management |

## Conventions

- **Single Responsibility**: Each layer has one job
- **Dependency Injection**: Constructor-based, testable
- **Error Handling**: Service throws → Controller catches → Error middleware responds
- **Stateless Controllers**: Easy to scale horizontally

## Routes

| Route | Controller |
|-------|------------|
| `/api/projects` | ProjectController |
| `/api/projects/:id/crs` | TicketController |
| `/api/documents` | DocumentController |
| `/api/events` | SSE (Server-Sent Events) |
| `/api/system` | SystemController |
