import { Tool } from '@modelcontextprotocol/sdk/types.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const startFrontendLogging: Tool = {
  name: 'start_frontend_logging',
  description: 'Start frontend logging session to capture browser console logs',
  inputSchema: {
    type: 'object',
    properties: {
      frontend_host: {
        type: 'string',
        description: 'Frontend server host (default: localhost:5173)',
        default: 'localhost:5173'
      }
    },
    additionalProperties: false
  }
};

export const stopFrontendLogging: Tool = {
  name: 'stop_frontend_logging', 
  description: 'Stop frontend logging session and cleanup',
  inputSchema: {
    type: 'object',
    properties: {
      frontend_host: {
        type: 'string',
        description: 'Frontend server host (default: localhost:5173)',
        default: 'localhost:5173'
      }
    },
    additionalProperties: false
  }
};

export const getFrontendSessionStatus: Tool = {
  name: 'get_frontend_session_status',
  description: 'Get current frontend logging session status',
  inputSchema: {
    type: 'object',
    properties: {
      frontend_host: {
        type: 'string',
        description: 'Frontend server host (default: localhost:5173)',
        default: 'localhost:5173'
      }
    },
    additionalProperties: false
  }
};

export async function handleStartFrontendLogging(args: { frontend_host?: string } = {}): Promise<string> {
  const host = args.frontend_host || FRONTEND_URL;
  const frontendUrl = host.startsWith('http') ? host : `http://${host}`;
  
  try {
    const response = await fetch(`${frontendUrl}/api/frontend/logs/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return `✅ **Frontend logging session started**\n\n- Status: ${data.status}\n- Session started: ${new Date(data.sessionStart).toLocaleTimeString()}\n- Frontend URL: ${frontendUrl}\n- Frontend console logs will now be captured\n- Use browser console to test: \`console.error("test")\``;
  } catch (error) {
    return `❌ **Failed to start frontend logging session**\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nMake sure the frontend server is running on ${frontendUrl}`;
  }
}

export async function handleStopFrontendLogging(args: { frontend_host?: string } = {}): Promise<string> {
  const host = args.frontend_host || FRONTEND_URL;
  const frontendUrl = host.startsWith('http') ? host : `http://${host}`;
  
  try {
    const response = await fetch(`${frontendUrl}/api/frontend/logs/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return `✅ **Frontend logging session stopped**\n\n- Status: ${data.status}\n- Frontend URL: ${frontendUrl}\n- Frontend console logs are no longer being captured`;
  } catch (error) {
    return `❌ **Failed to stop frontend logging session**\n\nError: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function handleGetFrontendSessionStatus(args: { frontend_host?: string } = {}): Promise<string> {
  const host = args.frontend_host || FRONTEND_URL;
  const frontendUrl = host.startsWith('http') ? host : `http://${host}`;
  
  try {
    const response = await fetch(`${frontendUrl}/api/frontend/logs/status`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.active) {
      const duration = Math.round((Date.now() - new Date(data.sessionStart).getTime()) / 1000);
      const remaining = Math.round(data.timeRemaining / 1000 / 60);
      
      return `🟢 **Frontend logging session ACTIVE**\n\n- Frontend URL: ${frontendUrl}\n- Duration: ${duration} seconds\n- Time remaining: ~${remaining} minutes\n- Session started: ${new Date(data.sessionStart).toLocaleTimeString()}`;
    } else {
      return `🔴 **Frontend logging session INACTIVE**\n\n- Frontend URL: ${frontendUrl}\n\nUse \`start_frontend_logging()\` to begin capturing frontend console logs.`;
    }
  } catch (error) {
    return `❌ **Failed to get session status**\n\nError: ${error instanceof Error ? error.message : String(error)}`;
  }
}
