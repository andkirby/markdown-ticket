# Quick Start: New Event System

This guide helps you quickly understand and use the new event management architecture.

## TL;DR - What Changed?

**Before (Fragile)**:
- Complex event handling mixed with state management
- Multiple event systems (SSE, callbacks, window events)
- Refs and closures causing stale data issues
- Hard to debug

**After (Robust)**:
- Centralized EventBus for all events
- Clear separation: SSEClient → EventBus → State
- Type-safe events
- Easy debugging with event history

## File Structure

```
src/services/
├── eventBus.ts        # Central event router - ALL events flow through here
├── sseClient.ts       # SSE connection manager - emits to EventBus
└── dataLayer.ts       # API calls - clean abstraction

src/components/DevTools/
└── EventHistory.tsx   # Debug tool - view event history (dev only)
```

## How It Works

### 1. Event Flow

```
File System Change
    ↓
Backend SSE
    ↓
SSEClient.handleSSEMessage()  ← Translates SSE to business events
    ↓
EventBus.emit('ticket:updated')  ← Central router
    ↓
Your Component listens  ← Subscribe with useEventBus hook
    ↓
Update UI
```

### 2. Using Events in Components

**Simple Usage with Hook**:
```typescript
import { useEventBus } from '../services/eventBus';

function MyComponent() {
  // Listen for ticket updates
  useEventBus('ticket:updated', (event) => {
    console.log('Ticket updated:', event.payload.ticketCode);
    // Refresh data or update state
  });

  return <div>...</div>;
}
```

**Manual Subscription** (if you need more control):
```typescript
import { useEffect } from 'react';
import { eventBus } from '../services/eventBus';

function MyComponent() {
  useEffect(() => {
    const unsubscribe = eventBus.on('ticket:created', (event) => {
      console.log('New ticket:', event.payload);
    });

    // Cleanup when component unmounts
    return unsubscribe;
  }, []);

  return <div>...</div>;
}
```

### 3. Available Events

```typescript
// Ticket events
'ticket:created'  // New ticket created
'ticket:updated'  // Ticket modified
'ticket:deleted'  // Ticket deleted

// Project events
'project:created' // New project created
'project:changed' // Selected project changed
'project:deleted' // Project deleted

// SSE connection events
'sse:connected'    // SSE connection established
'sse:disconnected' // SSE connection lost
'sse:error'        // SSE error occurred

// Error events
'error:api'        // API error
'error:network'    // Network error
```

### 4. Event Payload Examples

```typescript
// Ticket event
{
  type: 'ticket:updated',
  payload: {
    ticketCode: 'MDT-001',
    projectId: 'markdown-ticket',
    ticket?: { /* optional ticket data */ }
  },
  timestamp: 1704123456789,
  source: 'sse',
  id: 'evt_123'
}

// SSE connection event
{
  type: 'sse:connected',
  payload: {
    url: '/api/events'
  },
  timestamp: 1704123456789,
  source: 'sse',
  id: 'evt_124'
}
```

## Making API Calls

Use the `dataLayer` service instead of direct fetch:

```typescript
import { dataLayer } from '../services/dataLayer';

// Fetch tickets
const tickets = await dataLayer.fetchTickets('markdown-ticket');

// Create ticket
const newTicket = await dataLayer.createTicket('markdown-ticket', {
  title: 'New Feature',
  type: 'Feature Enhancement'
});

// Update ticket
await dataLayer.updateTicket('markdown-ticket', 'MDT-001', {
  status: 'In Progress'
});

// Delete ticket
await dataLayer.deleteTicket('markdown-ticket', 'MDT-001');
```

## Debugging Events

### 1. Use the Event History Tool

Add to your App.tsx (development only):
```typescript
import { EventHistory } from './components/DevTools/EventHistory';

function App() {
  return (
    <>
      {/* Your app */}
      <BrowserRouter>...</BrowserRouter>

      {/* Debug tool - only in development */}
      <EventHistory />
    </>
  );
}
```

### 2. View Recent Events in Console

```typescript
import { eventBus } from './services/eventBus';

// Get last 20 events
console.log(eventBus.getRecentEvents(20));

// Get events by type
console.log(eventBus.getEventsByType('ticket:updated'));

// Get statistics
console.log(eventBus.getStats());
```

### 3. Monitor SSE Connection

```typescript
import { sseClient } from './services/sseClient';

// Check connection status
console.log(sseClient.isSSEConnected()); // true/false

// Get connection stats
console.log(sseClient.getStats());
/*
{
  isConnected: true,
  reconnectAttempts: 0,
  url: '/api/events',
  readyState: 1
}
*/
```

## Migration from Old System

### Step 1: Keep Both Systems Running

Your existing code continues to work. New system runs in parallel.

```typescript
// OLD (still works)
import { useMultiProjectData } from './hooks/useMultiProjectData';
const { tickets, updateTicket } = useMultiProjectData();

// NEW (add alongside)
import { EventHistory } from './components/DevTools/EventHistory';
// Add <EventHistory /> to see events
```

### Step 2: Gradually Migrate Components

One component at a time:

```typescript
// Before
function TicketList() {
  const { tickets, loading } = useMultiProjectData();
  // ...
}

// After
function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Subscribe to updates
  useEventBus('ticket:updated', () => {
    dataLayer.fetchTickets(projectId).then(setTickets);
  });

  // Load initial data
  useEffect(() => {
    dataLayer.fetchTickets(projectId).then(setTickets);
  }, [projectId]);

  // ...
}
```

### Step 3: Clean Up Old Code

After all components migrated:
- Remove `useMultiProjectData`
- Remove `RealtimeFileWatcher`
- Simplify `FileService` (keep only if needed)

## Common Patterns

### Pattern 1: Auto-Refresh on Changes

```typescript
function TicketBoard({ projectId }: { projectId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Refresh tickets when any ticket event occurs
  const refreshTickets = useCallback(async () => {
    const fresh = await dataLayer.fetchTickets(projectId);
    setTickets(fresh);
  }, [projectId]);

  useEventBus('ticket:created', refreshTickets);
  useEventBus('ticket:updated', refreshTickets);
  useEventBus('ticket:deleted', refreshTickets);

  // Initial load
  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  return <div>{/* render tickets */}</div>;
}
```

### Pattern 2: Project-Specific Updates

```typescript
function TicketBoard({ projectId }: { projectId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Only refresh if update is for current project
  useEventBus('ticket:updated', (event) => {
    if (event.payload.projectId === projectId) {
      dataLayer.fetchTickets(projectId).then(setTickets);
    }
  });

  return <div>{/* render tickets */}</div>;
}
```

### Pattern 3: Optimistic Updates

```typescript
function TicketCard({ ticket }: { ticket: Ticket }) {
  const [localTicket, setLocalTicket] = useState(ticket);

  const handleStatusChange = async (newStatus: Status) => {
    // 1. Optimistic update (instant UI feedback)
    setLocalTicket(prev => ({ ...prev, status: newStatus }));

    try {
      // 2. Update backend
      await dataLayer.updateTicket(projectId, ticket.code, { status: newStatus });

      // 3. Emit event (optional - backend SSE will also emit)
      eventBus.emit('ticket:updated', {
        ticketCode: ticket.code,
        projectId
      }, 'ui');

    } catch (error) {
      // 4. Revert on error
      setLocalTicket(ticket);
      console.error('Failed to update ticket:', error);
    }
  };

  return <div>{/* render ticket */}</div>;
}
```

### Pattern 4: Error Handling

```typescript
function App() {
  const [error, setError] = useState<string | null>(null);

  // Listen for errors
  useEventBus('error:api', (event) => {
    setError(event.payload.message);
  });

  useEventBus('sse:error', (event) => {
    setError(`SSE Error: ${event.payload.message}`);
  });

  return (
    <div>
      {error && (
        <div className="error-toast">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {/* rest of app */}
    </div>
  );
}
```

## Testing

### Unit Test EventBus

```typescript
import { EventBus } from './eventBus';

describe('EventBus', () => {
  it('should emit and receive events', () => {
    const eventBus = new EventBus();
    const handler = jest.fn();

    eventBus.on('ticket:created', handler);
    eventBus.emit('ticket:created', { ticketCode: 'TEST-001' });

    expect(handler).toHaveBeenCalled();
  });

  it('should unsubscribe properly', () => {
    const eventBus = new EventBus();
    const handler = jest.fn();

    const unsubscribe = eventBus.on('ticket:created', handler);
    unsubscribe();

    eventBus.emit('ticket:created', { ticketCode: 'TEST-001' });
    expect(handler).not.toHaveBeenCalled();
  });
});
```

### Test Component with Events

```typescript
import { render, waitFor } from '@testing-library/react';
import { eventBus } from './eventBus';

test('component updates on event', async () => {
  const { getByText } = render(<MyComponent />);

  // Emit event
  eventBus.emit('ticket:created', { ticketCode: 'TEST-001' });

  // Wait for component to update
  await waitFor(() => {
    expect(getByText('TEST-001')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Events Not Firing?

1. Check if SSE is connected:
   ```typescript
   console.log(sseClient.isSSEConnected()); // Should be true
   ```

2. Check EventBus stats:
   ```typescript
   console.log(eventBus.getStats());
   // Should show listeners for your event type
   ```

3. View event history:
   - Add `<EventHistory />` to your app
   - Check if events are being emitted

### Component Not Updating?

1. Make sure you're subscribed to the right event
2. Check if event payload matches your filter (e.g., projectId)
3. Verify cleanup - unsubscribe function is called on unmount

### SSE Keeps Disconnecting?

1. Check network tab - is `/api/events` endpoint responding?
2. Check backend logs - is file watcher running?
3. Check browser console for reconnection attempts

## Best Practices

1. **Always Unsubscribe**: Use the returned unsubscribe function in useEffect cleanup
2. **Filter Events**: Check event payload before acting (e.g., projectId match)
3. **Avoid Re-renders**: Use useCallback for event handlers
4. **Debug Early**: Add EventHistory component during development
5. **Type Safety**: Use TypeScript event types for compile-time safety

## Next Steps

1. ✅ Add `<EventHistory />` to your app for debugging
2. ✅ Try subscribing to events in a simple component
3. ✅ Gradually migrate components from old system
4. ✅ Remove old code when all components migrated

## Questions?

See the full architecture documentation: `/docs/event-system-architecture.md`
