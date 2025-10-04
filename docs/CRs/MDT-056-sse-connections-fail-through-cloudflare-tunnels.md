---
code: MDT-056
title: SSE connections fail through Cloudflare tunnels
status: Proposed
dateCreated: 2025-10-02T11:38:31.674Z
type: Bug Fix
priority: Medium
---

# SSE connections fail through Cloudflare tunnels

## Description

Server-Sent Events (SSE) connections are being canceled when the application is accessed through Cloudflare tunnels (*.trycloudflare.com). This prevents real-time updates from reaching the frontend, breaking live functionality like ticket updates and logging streams.

## Rationale

SSE is critical for real-time updates in the application. Users accessing via Cloudflare tunnels lose this functionality, making the app feel broken and unresponsive.

## Solution Analysis

Cloudflare tunnels have specific requirements for SSE connections:
1. **Connection timeouts**: Long-lived connections may be terminated
2. **Keepalive requirements**: Need periodic data to maintain connection
3. **Reconnection logic**: Client must handle disconnections gracefully

**Options:**
- Add SSE keepalive heartbeats
- Implement client-side reconnection with exponential backoff
- Add connection state indicators in UI
- Consider WebSocket fallback for tunneled connections

## Implementation

### Backend Changes
- Add periodic keepalive to SSE streams (every 30s)
- Improve connection cleanup on client disconnect
- Add connection state logging

### Frontend Changes
- Implement automatic SSE reconnection logic
- Add connection status indicator
- Handle reconnection with exponential backoff
- Show user feedback when connection is lost

## Acceptance Criteria

- [ ] SSE connections work reliably through Cloudflare tunnels
- [ ] Automatic reconnection when connections drop
- [ ] User sees connection status in UI
- [ ] Real-time updates resume after reconnection
- [ ] No excessive reconnection attempts (backoff implemented)