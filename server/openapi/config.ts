/**
 * OpenAPI Configuration - swagger-jsdoc setup for Markdown Ticket API
 * Generates OpenAPI 3.0.0 specification by scanning route JSDoc comments
 */

import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';
import { schemas, parameters } from './schemas.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * swagger-jsdoc configuration options
 */
export const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Markdown Ticket API',
      version: '1.0.0',
      description: `
REST API for Markdown Ticket - an AI-powered Kanban board where tickets are markdown files.

## Key Features
- **Multi-project support**: Manage CRs across multiple projects
- **File-based storage**: All CRs stored as markdown files with YAML frontmatter
- **Real-time updates**: SSE endpoint for live change notifications
- **Git integration**: Version control for all ticket changes

## Authentication
Currently, the API does not require authentication. Future versions may add API key or OAuth support.

## Error Handling
All endpoints return consistent error responses with \`error\` and \`message\` fields.
      `.trim(),
      contact: {
        name: 'Markdown Ticket',
        url: 'https://github.com/example/markdown-ticket'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    tags: [
      { name: 'Projects', description: 'Project management operations' },
      { name: 'CRs', description: 'Change Request (ticket) operations' },
      { name: 'Documents', description: 'Document discovery and management' },
      { name: 'Events', description: 'Server-Sent Events for real-time updates' },
      { name: 'DevTools', description: 'Development tools and logging endpoints' }
    ],
    components: {
      schemas,
      parameters,
      responses: {
        BadRequest: {
          description: 'Invalid request parameters',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } }
        },
        NotFound: {
          description: 'Resource not found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } }
        },
        ServerError: {
          description: 'Internal server error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } }
        },
        DevModeInactive: {
          description: 'DEV mode not active',
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'DEV mode not active' },
              message: { type: 'string', example: 'DEV mode logging is not currently active' }
            }
          } } }
        },
        RateLimitExceeded: {
          description: 'Rate limit exceeded',
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Rate limit exceeded' },
              message: { type: 'string', example: 'DEV mode logging rate limit of 300 logs per minute exceeded' }
            }
          } } }
        },
        CRCreated: {
          description: 'CR created successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CR' } } }
        },
        CRUpdated: {
          description: 'CR updated successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CR' } } }
        },
        ProjectCreated: {
          description: 'Project created successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } }
        },
        ProjectUpdated: {
          description: 'Project updated successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } }
        }
      },
      requestBodies: {
        CRCreate: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CRInput' } } }
        },
        CRPatch: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              status: { $ref: '#/components/schemas/CRStatus' },
              priority: { $ref: '#/components/schemas/CRPriority' },
              assignee: { type: 'string' },
              phaseEpic: { type: 'string' }
            }
          } } }
        },
        CRUpdate: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CR' } } }
        },
        ProjectCreate: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            required: ['name', 'code', 'path'],
            properties: {
              name: { type: 'string', example: 'My Project' },
              code: { type: 'string', example: 'PRJ' },
              path: { type: 'string', example: '/path/to/project' },
              crPath: { type: 'string', example: 'docs/CRs' }
            }
          } } }
        },
        ProjectUpdate: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              crPath: { type: 'string' },
              documentPaths: { type: 'array', items: { type: 'string' } },
              excludeFolders: { type: 'array', items: { type: 'string' } }
            }
          } } }
        }
      }
    }
  },
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../routes/*.js')
  ]
};

/**
 * Generated OpenAPI specification
 * Use this with swagger-ui-express or other OpenAPI tools
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
