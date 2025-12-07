# Setup and Running Guide

This guide explains how to set up and run the complete md-ticket-board system with both frontend and backend components.

## System Overview

The md-ticket-board consists of two main components:

1. **Frontend**: React application with TypeScript, Tailwind CSS, and drag-and-drop functionality
2. **Backend**: Express.js server for file system operations and API endpoints

## Prerequisites

### Required Software

- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 7.0.0 or higher (comes with Node.js)
- **Git**: For cloning the repository

### System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Memory**: Minimum 512MB RAM (1GB recommended)
- **Storage**: Minimum 100MB free space
- **Network**: Internet connection for package installation

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd md-ticket-board
```

### 2. Install Frontend Dependencies

```bash
# Install frontend dependencies
npm install
```

### 3. Install Backend Dependencies

```bash
# Navigate to server directory
cd server

# Install server dependencies
npm install

# Navigate back to root directory
cd ..
```

### 4. Verify Installation

```bash
# Check frontend dependencies
npm list

# Check server dependencies
cd server && npm list && cd ..
```

## Running the System

### Option 1: Using npm Scripts (Recommended)

#### Start Backend Server

```bash
# Start backend server in development mode
npm run server:dev
```

#### Start Frontend Application

```bash
# Start frontend development server
npm start
```

### Option 2: Manual Startup

#### Backend Server

```bash
# Navigate to server directory
cd server

# Start server in development mode (with auto-restart)
npm run dev

# Or start in production mode
npm start
```

#### Frontend Application

```bash
# Start frontend development server
npm start
```

### Option 3: Using Concurrent Processes

```bash
# Install concurrently if not already installed
npm install --save-dev concurrently

# Start both frontend and backend simultaneously
npm run dev
```

## Directory Structure

```
md-ticket-board/
├── server/                 # Backend server files
│   ├── server.js          # Main server file
│   ├── package.json       # Server dependencies
│   └── tasks/             # Ticket markdown files
├── src/                   # Frontend source code
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API and file services
│   ├── types/             # TypeScript type definitions
│   └── config/            # Configuration files
├── public/                # Static assets
├── package.json           # Frontend dependencies
├── tailwind.config.js     # Tailwind CSS configuration
├── server.js             # Main server file (root level)
└── README.md             # This file
```

## API Endpoints

The backend server provides the following API endpoints:

### Task Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all task files |
| GET | `/api/tasks/:filename` | Get specific task content |
| POST | `/api/tasks/save` | Save task file |
| DELETE | `/api/tasks/:filename` | Delete task file |
| GET | `/api/status` | Server status |

### Example Usage

#### Get All Tasks

```bash
curl http://localhost:3001/api/tasks
```

#### Get Specific Task

```bash
curl http://localhost:3001/api/tasks/CR-A001.md
```

#### Save Task

```bash
curl -X POST http://localhost:3001/api/tasks/save \
  -H "Content-Type: application/json" \
  -d '{"filename": "CR-A001.md", "content": "---\ncode: CR-A001\nstatus: In Progress\n---"}'
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory for environment-specific configuration:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_APP_NAME=md-ticket-board
```

### Server Configuration

The server can be configured by modifying the following settings in `server.js`:

```javascript
const PORT = process.env.PORT || 3001;  // Server port
const TICKETS_DIR = path.join(__dirname, 'tasks');  // Tasks directory
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3001`

**Solution**: 
```bash
# Find and kill the process using the port
lsof -ti:3001 | xargs kill -9

# Or use a different port
PORT=3002 npm run server:dev
```

#### 2. Node Version Issues

**Error**: `Node version mismatch` or `Unsupported Node version`

**Solution**:
```bash
# Check Node version
node --version

# Use nvm to manage Node versions
nvm install 18
nvm use 18
```

#### 3. Dependency Issues

**Error**: `Cannot find module 'package-name'`

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For server dependencies
cd server && rm -rf node_modules package-lock.json && npm install && cd ..
```

#### 4. CORS Issues

**Error**: `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`

**Solution**: The server is already configured with CORS, but you can verify the configuration in `server.js`.

#### 5. File Permission Issues

**Error**: `EACCES: permission denied` when accessing tasks directory

**Solution**:
```bash
# Fix directory permissions
chmod 755 tasks/
chmod 644 tasks/*.md
```

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
# For backend
DEBUG=* npm run server:dev

# For frontend
npm start -- --debug
```

### Health Check

Check if the server is running:

```bash
curl http://localhost:3001/api/status
```

Expected response:
```json
{
  "status": "ok",
  "message": "Ticket board server is running",
  "tasksDir": "/path/to/tasks",
  "timestamp": "2024-01-20T10:00:00.000Z"
}
```

## Development Workflow

### 1. Development Setup

```bash
# Install all dependencies
npm install
cd server && npm install && cd ..

# Start both frontend and backend
npm run dev
```

### 2. Making Changes

#### Frontend Changes

```bash
# Frontend hot-reloads automatically
# Make changes in src/ directory
```

#### Backend Changes

```bash
# Server restarts automatically in dev mode
# Make changes in server.js or server/ directory
```

### 3. Testing

#### Frontend Testing

```bash
# Run frontend tests
npm test

# Run tests with coverage
npm run test:coverage
```

#### Backend Testing

```bash
# Navigate to server directory
cd server

# Run server tests
npm test

# Run tests with coverage
npm run test:coverage
```

### 4. Building for Production

#### Frontend Build

```bash
# Build frontend for production
npm run build

# The build output will be in the build/ directory
```

#### Backend Production Build

```bash
# Navigate to server directory
cd server

# Install production dependencies
npm install --production

# The server is ready for production deployment
```

## Deployment

### Production Deployment

#### 1. Build Frontend

```bash
npm run build
```

#### 2. Configure Server for Production

```bash
# Set production environment variable
export NODE_ENV=production

# Use process manager (PM2 recommended)
npm install -g pm2
pm2 start server.js --name "ticket-board"
```

#### 3. Configure Reverse Proxy (Nginx Example)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Docker Deployment

#### Dockerfile for Backend

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production

COPY server/ .
EXPOSE 3001

CMD ["npm", "start"]
```

#### Dockerfile for Frontend

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment-Specific Configuration

#### Development

```env
NODE_ENV=development
PORT=3001
REACT_APP_API_URL=http://localhost:3001
```

#### Production

```env
NODE_ENV=production
PORT=3001
REACT_APP_API_URL=https://your-domain.com
```

## Performance Optimization

### Frontend Optimization

1. **Code Splitting**: React.lazy and Suspense
2. **Bundle Analysis**: Use `npm run analyze` to see bundle size
3. **Caching**: Service worker for offline support
4. **Image Optimization**: Optimize images and use WebP format

### Backend Optimization

1. **Caching**: Implement Redis for frequent operations
2. **Compression**: Enable gzip compression
3. **Connection Pooling**: Use connection pooling for database operations
4. **Load Balancing**: Use multiple server instances

## Security Considerations

### Backend Security

1. **Input Validation**: Validate all user inputs
2. **File Path Sanitization**: Prevent directory traversal attacks
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **HTTPS**: Use HTTPS in production
5. **Environment Variables**: Store sensitive data in environment variables

### Frontend Security

1. **Content Security Policy**: Implement CSP headers
2. **XSS Protection**: Sanitize user inputs
3. **HTTPS**: Always use HTTPS
4. **Authentication**: Implement proper authentication if needed

## Monitoring and Logging

### Application Logging

```javascript
// Example logging in server.js
const logger = require('morgan');
app.use(logger('combined'));
```

### Error Tracking

```javascript
// Example error tracking
const Sentry = require('@sentry/node');
Sentry.init({ dsn: your-dsn });
```

### Performance Monitoring

```javascript
// Example performance monitoring
const apm = require('elastic-apm-node');
apm.start();
```

## Backup and Recovery

### File Backup

```bash
# Backup tasks directory
tar -czf backup-$(date +%Y%m%d).tar.gz tasks/

# Restore from backup
tar -xzf backup-20240120.tar.gz
```

### Database Backup (if using database)

```bash
# Example MongoDB backup
mongodump --db ticket-board --out backup/
```

## Support and Maintenance

### Getting Help

1. **Check Documentation**: Refer to this README and other documentation
2. **Console Logs**: Check browser and server console logs
3. **Network Tab**: Verify API calls in browser network tab
4. **Issue Tracker**: Check GitHub issues for known problems

### Maintenance Tasks

#### Regular Maintenance

```bash
# Update dependencies
npm update
cd server && npm update && cd ..

# Clean up old files
find tasks/ -name "*.md" -mtime +30 -exec ls -la {} \;

# Monitor server health
curl http://localhost:3001/api/status
```

#### Performance Monitoring

```bash
# Monitor server resources
htop

# Monitor network connections
netstat -tulpn

# Monitor disk usage
df -h
```

## Conclusion

This setup guide should help you get the md-ticket-board system running smoothly. If you encounter any issues not covered here, please check the console logs and refer to the troubleshooting section.

For additional support, please refer to the project documentation or create an issue in the project repository.