import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import process from 'node:process'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export const getFrontendLogs: Tool = {
  name: 'get_frontend_logs',
  description: 'Get recent frontend console logs with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      lines: {
        type: 'number',
        description: 'Number of recent lines to retrieve (default: 20, max: 100)',
        default: 20,
      },
      filter: {
        type: 'string',
        description: 'Text filter to match in log messages',
      },
      frontend_host: {
        type: 'string',
        description: 'Frontend server URL (default: http://localhost:5173)',
        default: 'http://localhost:5173',
      },
    },
    additionalProperties: false,
  },
}

export const streamFrontendLogs: Tool = {
  name: 'stream_frontend_logs',
  description: 'Get SSE endpoint URL for real-time frontend log streaming',
  inputSchema: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        description: 'Text filter for SSE stream',
      },
      frontend_host: {
        type: 'string',
        description: 'Frontend server URL (default: http://localhost:5173)',
        default: 'http://localhost:5173',
      },
    },
    additionalProperties: false,
  },
}

export async function handleGetFrontendLogs(args: { lines?: number, filter?: string, frontend_host?: string } = {}): Promise<string> {
  const lines = Math.min(args.lines || 20, 100)
  const { filter } = args
  const host = args.frontend_host || FRONTEND_URL
  const frontendUrl = host.startsWith('http') ? host : `http://${host}`

  try {
    // Check if session is active, start if not
    const statusResponse = await fetch(`${frontendUrl}/api/frontend/logs/status`)

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()

      if (!statusData.active) {
        // Auto-start session
        const startResponse = await fetch(`${frontendUrl}/api/frontend/logs/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        if (startResponse.ok) {
          console.error('🔍 Auto-started frontend logging session')
        }
      }
    }

    const params = new URLSearchParams()

    params.append('lines', lines.toString())
    if (filter) {
      params.append('filter', filter)
    }

    const response = await fetch(`${frontendUrl}/api/frontend/logs?${params}`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.logs || data.logs.length === 0) {
      return `📋 **Frontend Logs** (0 entries)\n\n${filter ? `No logs found matching filter: "${filter}"` : 'No frontend logs captured yet.'}\n\n💡 **Session auto-started** - try generating logs:\n- \`console.error("test error")\`\n- \`console.log("debug info")\`\n- \`console.warn("warning message")\`\n\n**Frontend URL:** ${frontendUrl}`
    }

    let output = `📋 **Frontend Logs** (${data.logs.length} entries${filter ? `, filtered by "${filter}"` : ''})\n\n`

    data.logs.forEach((log: any) => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString()
      const level = log.level.toUpperCase().padEnd(5)
      const url = log.url ? ` [${new URL(log.url).pathname}]` : ''

      output = `${output}[${timestamp}] ${level} ${log.message}${url}\n`
    })

    output = `${output}\n**Frontend URL:** ${frontendUrl}`

    return output
  }
  catch (error) {
    return `❌ **Failed to get frontend logs**\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nMake sure:\n1. Frontend server is running on ${frontendUrl}\n2. Frontend has generated some console logs`
  }
}

export async function handleStreamFrontendLogs(args: { filter?: string, frontend_host?: string } = {}): Promise<string> {
  const { filter } = args
  const host = args.frontend_host || FRONTEND_URL
  const frontendUrl = host.startsWith('http') ? host : `http://${host}`
  const params = filter ? `?filter=${encodeURIComponent(filter)}` : ''
  const streamUrl = `${frontendUrl}/api/frontend/logs/stream${params}`

  return `🔗 **Frontend Log Stream URL**\n\n\`${streamUrl}\`\n\n**Usage:**\n- Subscribe to this SSE endpoint for real-time frontend logs\n- Logs will stream when frontend logging session is active\n- Use EventSource in JavaScript: \`new EventSource("${streamUrl}")\`\n\n${filter ? `**Filter:** Only logs containing "${filter}" will be streamed` : '**No filter:** All frontend logs will be streamed'}\n\n**Frontend URL:** ${frontendUrl}`
}
