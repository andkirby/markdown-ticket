import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const streamFrontendUrl: Tool = {
  name: 'stream_frontend_url',
  description: 'Get SSE endpoint URL for real-time frontend log streaming',
  inputSchema: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        description: 'Text filter for log streams'
      },
      frontend_host: {
        type: 'string',
        description: 'Frontend server host (default: localhost:5173)',
        default: 'localhost:5173'
      }
    },
    additionalProperties: false
  }
};

export async function handleStreamFrontendUrl(args: { 
  filter?: string; 
  frontend_host?: string 
} = {}): Promise<string> {
  const filter = args.filter;
  const host = args.frontend_host || process.env.FRONTEND_URL || 'localhost:5173';
  const frontendUrl = host.startsWith('http') ? host : `http://${host}`;
  
  const params = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  const streamUrl = `${frontendUrl}/api/frontend/logs/stream${params}`;
  
  return `🔗 **Frontend Log Stream URL**\n\n\`${streamUrl}\`\n\n**Usage:**\n- Subscribe to this SSE endpoint for real-time frontend logs\n- Use EventSource in JavaScript: \`new EventSource("${streamUrl}")\`\n\n${filter ? `**Filter:** Only logs containing "${filter}" will be streamed` : '**No filter:** All frontend logs will be streamed'}\n\n**Frontend Host:** ${frontendUrl}`;
}
