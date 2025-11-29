# Developer Guide - Refactored Server Architecture

## Quick Start

### Adding a New Feature

Follow this checklist when adding new functionality:

1. **Identify the layer** where your feature belongs
2. **Create/modify utility** if needed (pure functions)
3. **Create/modify service** for business logic
4. **Create/modify controller** for HTTP handling
5. **Create/modify route** for endpoint definition
6. **Update server.js** if needed (rare)

### Example: Adding a "Tag" Feature

#### Step 1: Add Utility (if needed)
```javascript
// server/utils/tagUtils.js
export function parseTagsFromContent(content) {
  const tagRegex = /#(\w+)/g;
  return content.match(tagRegex) || [];
}
```

#### Step 2: Add Service Method
```javascript
// server/services/TicketService.js
async getTicketsByTag(projectId, tag) {
  const tickets = await this.getProjectCRs(projectId);
  return tickets.filter(ticket =>
    ticket.tags && ticket.tags.includes(tag)
  );
}
```

#### Step 3: Add Controller Method
```javascript
// server/controllers/TicketController.js
async getTicketsByTag(req, res) {
  try {
    const { projectId, tag } = req.params;
    const tickets = await this.ticketService.getTicketsByTag(projectId, tag);
    res.json(tickets);
  } catch (error) {
    if (error.message === 'Project not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to get tickets by tag' });
    }
  }
}
```

#### Step 4: Add Route
```javascript
// server/routes/tickets.js
router.get('/tags/:tag', (req, res) =>
  ticketController.getTicketsByTag(req, res)
);
```

#### Step 5: Register Route (if new router)
```javascript
// server/server.js
app.use('/api/tickets', createTicketRouter(ticketController));
```

## File Location Guide

### When to create files in each directory:

#### `/utils/`
Create files here for:
- Pure functions (no side effects)
- Data transformation
- String manipulation
- Date/time utilities
- Validation helpers

**Example**:
```javascript
// utils/dateFormatter.js
export function formatTicketDate(date) {
  return new Date(date).toISOString().split('T')[0];
}
```

#### `/services/`
Create files here for:
- Business logic
- Data operations
- External API calls
- Complex calculations
- Multi-step operations

**Example**:
```javascript
// services/NotificationService.js
export class NotificationService {
  async notifyTicketUpdate(ticketId, changes) {
    // Business logic for notifications
  }
}
```

#### `/controllers/`
Create files here for:
- HTTP request handling
- Response formatting
- Error mapping
- Request validation calls

**Example**:
```javascript
// controllers/NotificationController.js
export class NotificationController {
  constructor(notificationService) {
    this.notificationService = notificationService;
  }

  async sendNotification(req, res) {
    // HTTP handling only
  }
}
```

#### `/routes/`
Create files here for:
- Endpoint definitions
- HTTP method mapping
- Middleware application

**Example**:
```javascript
// routes/notifications.js
export function createNotificationRouter(controller) {
  const router = Router();
  router.post('/', (req, res) => controller.sendNotification(req, res));
  return router;
}
```

#### `/middleware/`
Create files here for:
- Request/response interception
- Cross-cutting concerns
- Authentication/authorization
- Logging
- Rate limiting

**Example**:
```javascript
// middleware/authentication.js
export function authenticate(req, res, next) {
  // Check authentication
}
```

## Common Patterns

### Pattern 1: CRUD Operations

```javascript
// 1. Service
class ResourceService {
  async getAll() { /* ... */ }
  async getById(id) { /* ... */ }
  async create(data) { /* ... */ }
  async update(id, data) { /* ... */ }
  async delete(id) { /* ... */ }
}

// 2. Controller
class ResourceController {
  constructor(resourceService) {
    this.resourceService = resourceService;
  }

  async getAll(req, res) {
    try {
      const items = await this.resourceService.getAll();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get items' });
    }
  }
  // ... other methods
}

// 3. Routes
export function createResourceRouter(controller) {
  const router = Router();
  router.get('/', (req, res) => controller.getAll(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/', (req, res) => controller.create(req, res));
  router.put('/:id', (req, res) => controller.update(req, res));
  router.delete('/:id', (req, res) => controller.delete(req, res));
  return router;
}
```

### Pattern 2: Error Handling

```javascript
// Service throws descriptive errors
class MyService {
  async doSomething(id) {
    if (!id) {
      throw new Error('ID is required');
    }
    const item = await findItem(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }
}

// Controller maps errors to HTTP status
class MyController {
  async doSomething(req, res) {
    try {
      const result = await this.service.doSomething(req.params.id);
      res.json(result);
    } catch (error) {
      if (error.message === 'ID is required') {
        res.status(400).json({ error: error.message });
      } else if (error.message === 'Item not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}
```

### Pattern 3: Dependency Injection

```javascript
// 1. Define service with dependencies
class MyService {
  constructor(dependency1, dependency2) {
    this.dep1 = dependency1;
    this.dep2 = dependency2;
  }
}

// 2. Define controller with service
class MyController {
  constructor(myService) {
    this.myService = myService;
  }
}

// 3. Wire up in server.js
const dep1 = new Dependency1();
const dep2 = new Dependency2();
const myService = new MyService(dep1, dep2);
const myController = new MyController(myService);
const myRouter = createMyRouter(myController);
app.use('/api/my-resource', myRouter);
```

### Pattern 4: Middleware Usage

```javascript
// Define middleware
function validateId(req, res, next) {
  if (!req.params.id) {
    return res.status(400).json({ error: 'ID is required' });
  }
  next();
}

// Apply to specific routes
router.get('/:id', validateId, (req, res) =>
  controller.getById(req, res)
);

// Or apply to all routes
router.use(validateId);
```

## Testing Guide

### Unit Testing Services

```javascript
// MyService.test.js
import { MyService } from '../services/MyService';

describe('MyService', () => {
  let service;
  let mockDependency;

  beforeEach(() => {
    mockDependency = {
      getData: jest.fn()
    };
    service = new MyService(mockDependency);
  });

  test('should fetch data', async () => {
    mockDependency.getData.mockResolvedValue({ id: 1 });
    const result = await service.getData();
    expect(result).toEqual({ id: 1 });
  });
});
```

### Unit Testing Controllers

```javascript
// MyController.test.js
import { MyController } from '../controllers/MyController';

describe('MyController', () => {
  let controller;
  let mockService;
  let req, res;

  beforeEach(() => {
    mockService = {
      getData: jest.fn()
    };
    controller = new MyController(mockService);

    req = { params: { id: '1' } };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  test('should return data', async () => {
    mockService.getData.mockResolvedValue({ id: 1 });
    await controller.getData(req, res);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  test('should handle errors', async () => {
    mockService.getData.mockRejectedValue(new Error('Not found'));
    await controller.getData(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
```

### Integration Testing

```javascript
// integration.test.js
import request from 'supertest';
import app from '../server';

describe('Integration Tests', () => {
  test('GET /api/projects returns projects', async () => {
    const response = await request(app)
      .get('/api/projects')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

## Debugging Guide

### Enable Debug Logging

```javascript
// Add to server.js
if (process.env.DEBUG) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}
```

### Trace Request Flow

```javascript
// Add logging at each layer

// Controller
console.log('Controller: getProjects called');

// Service
console.log('Service: getAllProjects called');

// Utility
console.log('Utility: parseProject called with:', data);
```

### Common Issues

#### Issue: "Module not found"
**Solution**: Check import paths, ensure they're relative or absolute correctly
```javascript
// Correct
import { MyService } from '../services/MyService.js';
// Incorrect
import { MyService } from 'services/MyService.js';
```

#### Issue: "Cannot read property of undefined"
**Solution**: Check dependency injection chain
```javascript
// Ensure services are created before controllers
const myService = new MyService(dependency); // First
const myController = new MyController(myService); // Then
```

#### Issue: "Route not found"
**Solution**: Check route registration in server.js
```javascript
// Ensure router is registered
app.use('/api/my-resource', myRouter);
```

## Best Practices

### DO ✅
- Keep controllers thin (just HTTP handling)
- Put business logic in services
- Use descriptive error messages
- Inject dependencies via constructor
- Write tests for services and controllers
- Use async/await consistently
- Validate input at controller level
- Handle errors at controller level

### DON'T ❌
- Don't put business logic in controllers
- Don't access database/files from controllers
- Don't use global variables
- Don't mix HTTP concerns in services
- Don't ignore errors
- Don't use callbacks (use async/await)
- Don't skip input validation
- Don't return HTML from API endpoints

## Code Style

### Naming Conventions
- **Services**: `*Service.js` (e.g., `ProjectService.js`)
- **Controllers**: `*Controller.js` (e.g., `ProjectController.js`)
- **Routes**: lowercase, plural (e.g., `projects.js`, `tickets.js`)
- **Utilities**: camelCase (e.g., `duplicateDetection.js`)
- **Middleware**: camelCase (e.g., `errorHandler.js`)

### File Structure
```javascript
// 1. Imports
import express from 'express';
import { MyService } from '../services/MyService.js';

// 2. Constants
const DEFAULT_VALUE = 10;

// 3. Helper functions (private)
function privateHelper() { }

// 4. Main class/functions (exported)
export class MyClass { }

// 5. Default export (if needed)
export default MyClass;
```

### JSDoc Comments
```javascript
/**
 * Gets all projects from the system
 * @param {Object} options - Query options
 * @param {boolean} options.activeOnly - Return only active projects
 * @returns {Promise<Array>} Array of project objects
 */
async getAllProjects(options = {}) {
  // Implementation
}
```

## Performance Tips

1. **Cache expensive operations** in services
2. **Use connection pooling** for database/external services
3. **Implement pagination** for large datasets
4. **Add indices** to frequently queried fields
5. **Use async/await** to avoid blocking
6. **Implement rate limiting** for public endpoints
7. **Add request timeouts** to prevent hanging requests

## Security Checklist

- [ ] Validate all user input
- [ ] Sanitize file paths (use `path.basename()`)
- [ ] Check permissions before file operations
- [ ] Use HTTPS in production
- [ ] Implement rate limiting
- [ ] Add authentication/authorization
- [ ] Sanitize error messages (don't leak internals)
- [ ] Use security headers (helmet.js)
- [ ] Keep dependencies updated

## Getting Help

### Resources
- Architecture diagram: `ARCHITECTURE.md`
- Refactoring summary: `REFACTORING_SUMMARY.md`

### Common Questions

**Q: Where should I put database queries?**
A: In services, not controllers.

**Q: How do I add a new endpoint?**
A: Follow the "Adding a New Feature" section above.

**Q: Can I access the request object in services?**
A: No, services should be HTTP-agnostic. Extract what you need in the controller.

**Q: How do I share code between services?**
A: Create a utility function or a shared service.

**Q: Should I create a new controller or extend existing?**
A: If it's a different resource, create new. If same resource, extend existing.
