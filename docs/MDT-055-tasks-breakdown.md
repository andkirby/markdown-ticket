# MDT-055: Docker Containerization - Task Breakdown

## Phase 1: Pre-Containerization Improvements (Required)

### Task 1.1: Configuration Externalization
- [ ] Create `server/config.js` with Config class
  - [ ] Add Docker detection (`/.dockerenv`)
  - [ ] Add config directory paths (host vs Docker)
  - [ ] Add data directory paths
  - [ ] Add port configuration
  - [ ] Add Chokidar polling detection
  - [ ] Add CORS origin configuration
- [ ] Create `.env.example` file with all variables
  - [ ] Server configuration (PORT, NODE_ENV)
  - [ ] Docker configuration (CONFIG_DIR, DATA_DIR, CHOKIDAR_USEPOLLING)
  - [ ] CORS configuration
  - [ ] Frontend configuration (VITE_API_URL)

### Task 1.2: Graceful Shutdown Handlers
- [ ] Update `server/server.js` with shutdown logic
  - [ ] Import config module
  - [ ] Add `isShuttingDown` flag
  - [ ] Implement `gracefulShutdown()` function
  - [ ] Stop file watchers on shutdown
  - [ ] Close HTTP server gracefully
  - [ ] Add forced shutdown timeout (10 seconds)
  - [ ] Register SIGTERM handler
  - [ ] Register SIGINT handler

### Task 1.3: Health Check Endpoints
- [ ] Add `/api/health` endpoint to `server/server.js`
  - [ ] Return status, timestamp, uptime
  - [ ] Return environment information
  - [ ] Return file watcher status (active, clients, projects)
- [ ] Add `/api/ready` endpoint to `server/server.js`
  - [ ] Check filesystem access
  - [ ] Check project discovery
  - [ ] Return 503 if not ready
  - [ ] Return detailed check results

### Task 1.4: Chokidar Polling Configuration
- [ ] Update `server/fileWatcherService.js`
  - [ ] Import config module
  - [ ] Update `initMultiProjectWatcher()` to use `config.chokidarPolling`
  - [ ] Set polling interval to 1000ms
  - [ ] Configure `awaitWriteFinish` options
  - [ ] Test Docker environment detection

## Phase 2: Docker Implementation

### Task 2.1: Development Docker Setup
- [ ] Create `Dockerfile.dev`
  - [ ] Define base stage with Node 20 Alpine
  - [ ] Create frontend-dev stage
  - [ ] Create backend-dev stage
  - [ ] Install nodemon globally in backend stage
  - [ ] Configure proper working directories
  - [ ] Expose ports 5173 and 3001
- [ ] Create `docker-compose.dev.yml`
  - [ ] Define frontend service
  - [ ] Define backend service
  - [ ] Configure volume mounts (source code, node_modules)
  - [ ] Set environment variables
  - [ ] Configure mdt-network
  - [ ] Add CHOKIDAR_USEPOLLING to both services

### Task 2.2: Production Docker Setup
- [ ] Create `Dockerfile` (multi-stage production)
  - [ ] Define base stage
  - [ ] Create frontend-build stage
  - [ ] Create backend-build stage
  - [ ] Create backend-prod stage with health checks
  - [ ] Create frontend-prod stage for nginx
  - [ ] Add curl for health checks
  - [ ] Configure USER node for security
- [ ] Create `nginx.conf`
  - [ ] Configure upstream backend
  - [ ] Configure static file serving
  - [ ] Configure /api/ proxy
  - [ ] Configure /api/events SSE endpoint (special handling)
  - [ ] Set proper proxy headers
  - [ ] Disable buffering for SSE
- [ ] Create `docker-compose.prod.yml`
  - [ ] Define nginx service
  - [ ] Define backend service
  - [ ] Configure named volumes (tickets_data, config_data)
  - [ ] Add health checks
  - [ ] Configure restart policies
  - [ ] Set up service dependencies
  - [ ] Configure mdt-network

### Task 2.3: Standalone Docker Setup
- [ ] Create `Dockerfile.standalone`
  - [ ] Define builder stage (frontend + backend)
  - [ ] Define runtime stage
  - [ ] Copy built frontend to dist/
  - [ ] Copy backend to server/
  - [ ] Add health check
  - [ ] Configure USER node
  - [ ] Expose port 3000
- [ ] Create `standalone-server.js`
  - [ ] Import Express and backend logic
  - [ ] Serve static frontend files
  - [ ] Configure SPA fallback routing
  - [ ] Start server on port 3000
- [ ] Create `docker-compose.standalone.yml`
  - [ ] Define single app service
  - [ ] Configure volume mounts
  - [ ] Set environment variables
  - [ ] Configure restart policy

## Phase 3: MCP Server Integration

### Task 3.1: MCP on Host Documentation
- [ ] Create `docs/MCP_DOCKER.md`
  - [ ] Document Option A: MCP on Host
  - [ ] Provide setup instructions
  - [ ] Show LLM configuration (Claude Code, Amazon Q)
  - [ ] Explain how it works (volume access)
  - [ ] List pros and cons
  - [ ] Add troubleshooting tips

### Task 3.2: MCP Docker Exec Documentation
- [ ] Update `docs/MCP_DOCKER.md`
  - [ ] Document Option B: MCP in Container
  - [ ] Create `Dockerfile.mcp`
  - [ ] Add MCP service to docker-compose
  - [ ] Create wrapper script `mcp-docker-wrapper.sh`
  - [ ] Show LLM configuration for docker exec
  - [ ] Explain stdio transport through docker exec
  - [ ] List pros and cons
  - [ ] Add performance considerations

## Phase 4: Documentation & Developer Experience

### Task 4.1: Quick Start Guide
- [ ] Create `docs/DOCKER_QUICKSTART.md`
  - [ ] List prerequisites (Docker Desktop/Engine, Compose v2.0+)
  - [ ] Document development setup (4 steps)
  - [ ] Document production deployment (3 steps)
  - [ ] Document standalone mode (1 step)
  - [ ] Add troubleshooting section
    - [ ] File changes not detected
    - [ ] MCP server can't access files
    - [ ] SSE connection fails

### Task 4.2: CI/CD Integration
- [ ] Create `.github/workflows/docker-build.yml`
  - [ ] Configure workflow triggers (push, PR)
  - [ ] Set up Docker Buildx
  - [ ] Configure GitHub Container Registry login
  - [ ] Extract metadata for tagging
  - [ ] Build and push backend image
  - [ ] Build and push frontend image
  - [ ] Configure build caching

### Task 4.3: Update Main Documentation
- [ ] Update `README.md`
  - [ ] Add Docker quick start section
  - [ ] Link to DOCKER_QUICKSTART.md
  - [ ] Update installation instructions
  - [ ] Add Docker badge/status
- [ ] Update `CLAUDE.md`
  - [ ] Add Docker commands reference
  - [ ] Update development workflow for Docker
  - [ ] Add Docker troubleshooting tips

## Phase 5: Testing & Validation

### Task 5.1: Development Environment Testing
- [ ] Test docker-compose.dev.yml
  - [ ] Verify frontend hot reload works
  - [ ] Verify backend nodemon restart works
  - [ ] Verify file watching with polling
  - [ ] Verify SSE events propagate
  - [ ] Verify volume mounts preserve code
  - [ ] Measure startup time (< 2 minutes)

### Task 5.2: Production Environment Testing
- [ ] Test docker-compose.prod.yml
  - [ ] Verify multi-stage build completes
  - [ ] Verify nginx serves frontend correctly
  - [ ] Verify nginx proxies API correctly
  - [ ] Verify SSE endpoint configuration
  - [ ] Verify health checks pass
  - [ ] Verify auto-restart on failure
  - [ ] Measure total image size (< 500MB)

### Task 5.3: Standalone Environment Testing
- [ ] Test docker-compose.standalone.yml
  - [ ] Verify single container starts
  - [ ] Verify frontend + backend work together
  - [ ] Verify volume mounts work
  - [ ] Verify access at localhost:3000
  - [ ] Measure image size (< 300MB)
  - [ ] Measure startup time (< 30 seconds)

### Task 5.4: MCP Integration Testing
- [ ] Test MCP Option A (Host)
  - [ ] Verify MCP connects from host
  - [ ] Verify file operations work
  - [ ] Verify volume access permissions
  - [ ] Test with Claude Code
  - [ ] Test with Amazon Q
- [ ] Test MCP Option B (Docker Exec)
  - [ ] Verify docker exec wrapper works
  - [ ] Verify stdio transport functions
  - [ ] Verify file operations complete
  - [ ] Measure performance overhead

### Task 5.5: E2E Testing in Docker
- [ ] Update Playwright configuration
  - [ ] Configure for Docker environment
  - [ ] Update base URLs for containers
- [ ] Run existing E2E test suite
  - [ ] Verify all tests pass in Docker
  - [ ] Verify file watching works
  - [ ] Verify SSE connections stable
  - [ ] Verify multi-project setup (3+ projects)

### Task 5.6: Performance Testing
- [ ] Measure container startup times
  - [ ] Dev mode startup (< 10s)
  - [ ] Prod mode startup (< 10s)
- [ ] Measure file change detection latency (< 2s polling)
- [ ] Compare API response times (within 10% of non-Docker)
- [ ] Test SSE reconnection
- [ ] Monitor memory usage (< 512MB per container)
- [ ] Test resource limits (CPU, memory)
- [ ] Verify container restart doesn't lose data

## Phase 6: Security & Hardening

### Task 6.1: Container Security
- [ ] Implement non-root user (USER node)
- [ ] Set up vulnerability scanning (Trivy/Snyk)
- [ ] Verify minimal base images (alpine)
- [ ] Pin package versions in Dockerfiles
- [ ] Implement secrets management

### Task 6.2: Network Security
- [ ] Configure internal Docker networks
- [ ] Minimize exposed ports
- [ ] Add nginx security headers
- [ ] Plan HTTPS with Let's Encrypt
- [ ] Implement rate limiting

### Task 6.3: Volume Security
- [ ] Mount config volumes as read-only (:ro)
- [ ] Set proper file permissions
- [ ] Plan data encryption at rest
- [ ] Set up volume backup strategy
- [ ] Implement volume access logging

## Phase 7: Migration & Rollout

### Task 7.1: Migration Planning
- [ ] Create migration timeline (4 weeks)
  - Week 1: Preparation
  - Week 2: Parallel operation
  - Week 3: Migration
  - Week 4: Optimization
- [ ] Communicate plan to team
- [ ] Backup existing configurations

### Task 7.2: Rollback Planning
- [ ] Document rollback procedures
- [ ] Create volume backup scripts
- [ ] Test rollback scenario
- [ ] Prepare legacy deployment scripts

### Task 7.3: Production Deployment
- [ ] Deploy to staging (2 weeks testing)
- [ ] Canary deployment (10% traffic, 1 week)
- [ ] Full rollout (gradual to 100%, 1 week)
- [ ] Cleanup and retrospective (1 week)

## Summary

**Total Tasks: 91**

**Estimated Timeline:**
- Phase 1 (Pre-containerization): 3-5 days
- Phase 2 (Docker Implementation): 5-7 days
- Phase 3 (MCP Integration): 2-3 days
- Phase 4 (Documentation): 2-3 days
- Phase 5 (Testing): 5-7 days
- Phase 6 (Security): 3-5 days
- Phase 7 (Migration): 4 weeks (parallel with development)

**Total Development Time: 3-4 weeks**

**Critical Path:**
1. Configuration externalization (Task 1.1)
2. Health checks and graceful shutdown (Tasks 1.2, 1.3)
3. Development Docker setup (Task 2.1)
4. Production Docker setup (Task 2.2)
5. MCP integration documentation (Tasks 3.1, 3.2)
6. Testing and validation (Phase 5)
7. Production rollout (Phase 7)
