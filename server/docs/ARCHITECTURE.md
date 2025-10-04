# Server Architecture Documentation

## Layered Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        HTTP Clients                         │
│                    (Frontend, API consumers)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      server.js (Main)                       │
│                   Application Orchestration                 │
│  - Service initialization                                   │
│  - Controller creation                                      │
│  - Route registration                                       │
│  - Error handling setup                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Middleware Layer                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ errorHandler │ │  validation  │ │   security   │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Route Layer                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ projects │ │ tickets  │ │documents │ │   sse    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐                                 │
│  │  system  │ │ devtools │                                 │
│  └──────────┘ └──────────┘                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Controller Layer                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │ProjectController│ │TicketController │ │DocumentCtrl  │  │
│  │                 │ │                 │ │              │  │
│  │ - getAllProjects│ │ - getAllTasks   │ │ - getDocuments│ │
│  │ - getProjectCRs │ │ - getDuplicates │ │ - getContent │  │
│  │ - createCR      │ │ - resolveDupe   │ └──────────────┘  │
│  │ - updateCR      │ └─────────────────┘                   │
│  │ - deleteCR      │                                       │
│  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                          │
│  ┌───────────────┐ ┌───────────────┐ ┌─────────────────┐   │
│  │ProjectService │ │TicketService  │ │DocumentService  │   │
│  │               │ │               │ │                 │   │
│  │ Business      │ │ Business      │ │ Business        │   │
│  │ Logic         │ │ Logic         │ │ Logic           │   │
│  └───────────────┘ └───────────────┘ └─────────────────┘   │
│  ┌─────────────────────┐                                    │
│  │ FileSystemService   │                                    │
│  │                     │                                    │
│  │ Legacy Task Ops     │                                    │
│  └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Utility Layer                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ticketNumber  │ │fileSystemTree│ │duplicateDetect│       │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
│  ┌─────────────────┐ ┌─────────────────┐                   │
│  │ ProjectDiscovery│ │ FileWatcher     │                   │
│  └─────────────────┘ └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Storage                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Markdown  │ │    TOML     │ │   Counter   │           │
│  │    Files    │ │   Configs   │ │    Files    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow

### Example: Get Project CRs

```
1. HTTP Request
   GET /api/projects/markdown-ticket/crs
                ↓
2. Middleware (validation, security)
                ↓
3. Route Handler
   projects.js → router.get('/:projectId/crs', ...)
                ↓
4. Controller
   ProjectController.getProjectCRs(req, res)
                ↓
5. Service
   TicketService.getProjectCRs(projectId)
                ↓
6. External Service
   ProjectDiscovery.getProjectCRs(projectPath)
                ↓
7. File System
   Read markdown files from docs/CRs/
                ↓
8. Response
   JSON array of CR objects
```

## Dependency Injection Flow

```javascript
// server.js

// 1. Initialize Core Services
const fileWatcher = new FileWatcherService();
const projectDiscovery = new ProjectDiscoveryService();

// 2. Initialize Business Services (inject dependencies)
const projectService = new ProjectService(projectDiscovery);
const ticketService = new TicketService(projectDiscovery);
const documentService = new DocumentService(projectDiscovery);
const fileSystemService = new FileSystemService(TICKETS_DIR);

// 3. Initialize Controllers (inject services)
const projectController = new ProjectController(
  projectService,
  ticketService,
  fileSystemService,
  fileWatcher
);

// 4. Create Routes (inject controllers)
const projectRouter = createProjectRouter(projectController);

// 5. Register Routes
app.use('/api/projects', projectRouter);
```

## Module Responsibilities

### Routes (Route Definitions)
- Define HTTP endpoints and methods
- Map URLs to controller methods
- No business logic
- No direct data access

### Controllers (Request/Response Handling)
- Parse request parameters
- Call appropriate service methods
- Format responses
- Handle HTTP-specific errors
- No business logic
- No direct data access

### Services (Business Logic)
- Implement business rules
- Coordinate multiple operations
- Handle data validation
- Manage transactions
- Call external services
- No HTTP concerns
- No direct HTTP responses

### Utilities (Helper Functions)
- Pure functions
- Reusable logic
- No dependencies on other layers
- No state management

### Middleware (Cross-Cutting Concerns)
- Error handling
- Request validation
- Security checks
- Logging
- Applied to all or specific routes

## Error Handling Flow

```
Error occurs in Service
        ↓
Service throws Error
        ↓
Controller catches (or doesn't)
        ↓
Express error middleware
        ↓
errorHandler.js
        ↓
Format error response
        ↓
Send HTTP error to client
```

## File Organization Benefits

### Before Refactoring
```
server/
└── server.js (2,456 lines)
    - Routes
    - Controllers
    - Services
    - Utilities
    - Error handling
    - All mixed together
```

### After Refactoring
```
server/
├── server.js (253 lines) - Clean orchestration
├── routes/ - Route definitions only
├── controllers/ - HTTP handling only
├── services/ - Business logic only
├── middleware/ - Cross-cutting concerns
└── utils/ - Pure helper functions
```

## SOLID Principles Applied

### Single Responsibility
- Each class/module has one reason to change
- Routes only define endpoints
- Controllers only handle HTTP
- Services only implement business logic

### Open/Closed
- Extend behavior by adding new modules
- Don't modify existing modules
- Add new routes without changing server.js

### Liskov Substitution
- Services implement clear interfaces
- Controllers are interchangeable
- Mock implementations for testing

### Interface Segregation
- Small, focused interfaces
- Controllers depend only on needed services
- No fat interfaces

### Dependency Inversion
- Depend on abstractions (service interfaces)
- Inject dependencies via constructor
- Easy to swap implementations

## Testing Strategy

### Unit Tests
```javascript
// Test services in isolation
const mockProjectDiscovery = {
  getAllProjects: jest.fn()
};
const projectService = new ProjectService(mockProjectDiscovery);
```

### Integration Tests
```javascript
// Test controller → service flow
const projectController = new ProjectController(
  projectService,
  ticketService,
  fileSystemService,
  fileWatcher
);
```

### E2E Tests
```javascript
// Test complete request flow
const response = await request(app)
  .get('/api/projects/markdown-ticket/crs');
```

## Performance Considerations

### Caching Strategy
- Service layer can implement caching
- Controller layer stays thin
- Cache invalidation in services

### Lazy Loading
- Routes loaded on demand
- Services initialized at startup
- Controllers created once

### Memory Management
- Services are singletons
- Controllers are stateless
- Utilities are pure functions

## Security Layers

### Middleware Level
- Path traversal prevention
- Input sanitization
- Access control

### Controller Level
- Request validation
- Parameter checking
- Error sanitization

### Service Level
- Business rule validation
- Data integrity checks
- Authorization logic

## Conclusion

This layered architecture provides:

1. **Maintainability**: Each layer has clear responsibilities
2. **Testability**: Easy to test in isolation
3. **Scalability**: Add features without affecting existing code
4. **Security**: Multiple layers of validation
5. **Performance**: Opportunities for optimization at each layer
6. **Team Collaboration**: Developers can work on different layers independently
