# Research: HTTP Transport Project Context in Docker

**CR Context**: MDT-121  
**Date**: 2026-02-07  
**Status**: Research complete, implementation deferred

## 1. Problem Statement

MDT-121 implemented single-project mode by detecting project context from server startup directory (`cwd`). This works well for STDIO subprocess usage, but Docker + HTTP introduces a context mismatch:

- Server process context is container startup state (static)
- Caller context is per HTTP request (dynamic)

Result: startup-detected project can be incorrect or too broad for HTTP clients.

## 2. Current Behavior (Code-Level Findings)

- Startup project detection occurs once in `mcp-server/src/index.ts` before transport startup.
- `MCPTools` stores `detectedProject` and uses it for all tool requests.
- HTTP transport calls `mcpTools.handleToolCall(...)` directly and does not inject per-request project context.
- Session manager exists but session creation/state is not used to carry project context.
- HTTP host defaults to `127.0.0.1` unless passed in config, which can block host-to-container access.

## 3. Constraints and Realities

1. Environment variables are process-scoped and fixed after process start.
2. `initialize` is client-driven handshake; server cannot rely on custom params being sent.
3. In hosted/container HTTP, request-time context is the reliable place for dynamic project selection.

## 4. Key Insight

For STDIO, startup-derived context is correct by design.  
For HTTP, project selection must be resolved per request.

## 5. Recommended Resolution

Adopt explicit precedence for project resolution in HTTP calls:

1. `tools/call` argument `project` (highest priority)
2. HTTP header (example: `X-MDT-Project`)
3. Container default env (example: `MCP_DEFAULT_PROJECT`)
4. Startup-detected project
5. Error: no project context available

This preserves backward compatibility while allowing dynamic context in stateless HTTP flows.

## 6. Authentication as Context Carrier

Authentication can carry custom context (for example JWT claims):

- Validate token in HTTP middleware
- Extract project/workspace claim
- Inject into tool-call arguments if missing

This is request-time context propagation, not dynamic env mutation.

## 7. Implementation Notes

### Minimal transport change

In `mcp-server/src/transports/http.ts`, for `tools/call`:

- Read project from request header
- Merge into tool args only when `args.project` is absent
- Forward merged args to `mcpTools.handleToolCall(...)`

### Container usability fix

Ensure HTTP bind address is configurable and defaults to `0.0.0.0` in Docker deployments.

## 8. Decision

- Keep current STDIO behavior unchanged.
- Introduce request-scoped context handling for HTTP transport.
- Do not rely on custom `initialize` params or dynamic env changes for project selection.

## 9. Follow-Up Work

1. Add HTTP request-context project injection (`args`/header/env precedence).
2. Add tests for header-based project override and fallback chain.
3. Add optional auth-claim-to-project mapping (if multi-tenant use case is needed).
4. Document client integration pattern for Codex and other MCP HTTP clients.
