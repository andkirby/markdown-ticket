/**
 * Port configuration for isolated test environments
 *
 * Uses static ports to avoid conflicts with development servers:
 * - Frontend: 6173 (dev server uses 5173)
 * - Backend: 4001 (dev server uses 3001)
 * - MCP: 4002 (dev server uses 3002)
 */

export interface PortConfig {
  readonly frontend: number;
  readonly backend: number;
  readonly mcp: number;
}

/**
 * Default static port allocation for test isolation
 * These ports are chosen to avoid conflicts with development servers
 */
export const DEFAULT_TEST_PORTS: PortConfig = {
  frontend: 6173,
  backend: 4001,
  mcp: 4002,
};

/**
 * Validate that a port number is within the valid range
 * @param port Port number to validate
 * @returns true if port is valid (1024-65535)
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1024 && port <= 65535;
}

/**
 * Validate all ports in a PortConfig
 * @param config Port configuration to validate
 * @throws Error if any port is invalid
 */
export function validatePortConfig(config: PortConfig): void {
  const { frontend, backend, mcp } = config;

  if (!isValidPort(frontend)) {
    throw new Error(`Invalid frontend port: ${frontend}. Must be between 1024 and 65535.`);
  }

  if (!isValidPort(backend)) {
    throw new Error(`Invalid backend port: ${backend}. Must be between 1024 and 65535.`);
  }

  if (!isValidPort(mcp)) {
    throw new Error(`Invalid MCP port: ${mcp}. Must be between 1024 and 65535.`);
  }

  // Ensure ports are unique
  const ports = [frontend, backend, mcp];
  const uniquePorts = new Set(ports);
  if (uniquePorts.size !== ports.length) {
    throw new Error('All ports must be unique. Found duplicate ports in configuration.');
  }
}

/**
 * Get the current port configuration
 * Supports environment variable overrides for flexibility
 * @returns PortConfig instance
 */
export function getPortConfig(): PortConfig {
  // Support environment variable overrides
  const frontend = process.env.TEST_FRONTEND_PORT
    ? parseInt(process.env.TEST_FRONTEND_PORT, 10)
    : DEFAULT_TEST_PORTS.frontend;

  const backend = process.env.TEST_BACKEND_PORT
    ? parseInt(process.env.TEST_BACKEND_PORT, 10)
    : DEFAULT_TEST_PORTS.backend;

  const mcp = process.env.TEST_MCP_PORT
    ? parseInt(process.env.TEST_MCP_PORT, 10)
    : DEFAULT_TEST_PORTS.mcp;

  const config = { frontend, backend, mcp };
  validatePortConfig(config);

  return config;
}