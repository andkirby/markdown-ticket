import type { HttpTransportSecurityConfig } from './httpSecurity.js'
import { parseHttpTransportConfig } from './httpSecurity.js'

export type McpTransportMode = 'stdio' | 'http'

export interface McpTransportSelection {
  mode: McpTransportMode
  httpConfig?: HttpTransportSecurityConfig
}

export function selectMcpTransport(env: NodeJS.ProcessEnv): McpTransportSelection {
  const httpEnabled = env.MCP_HTTP_ENABLED === 'true' || env.HTTP_ENABLED === 'true'

  if (!httpEnabled) {
    return { mode: 'stdio' }
  }

  return {
    mode: 'http',
    httpConfig: parseHttpTransportConfig(env),
  }
}
