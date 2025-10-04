import * as path from 'path';
import * as os from 'os';

/**
 * Shared Constants for Frontend, Backend, and MCP
 * Ensures consistent values across all systems
 */

// Ticket Statuses
export const STATUSES = [
  'Proposed',
  'Approved', 
  'In Progress',
  'Implemented',
  'Rejected',
  'On Hold'
] as const;

export type Status = typeof STATUSES[number];

// Ticket Types
export const TYPES = [
  'Architecture',
  'Feature Enhancement', 
  'Bug Fix',
  'Technical Debt',
  'Documentation'
] as const;

export type TicketType = typeof TYPES[number];

// Ticket Priorities
export const PRIORITIES = [
  'Low',
  'Medium',
  'High', 
  'Critical'
] as const;

export type Priority = typeof PRIORITIES[number];

// File Extensions
export const SUPPORTED_EXTENSIONS = ['.md', '.markdown'] as const;

// Default configuration paths
export const DEFAULT_PATHS = {
  CONFIG_DIR: path.join(os.homedir(), '.config', 'markdown-ticket'),
  CONFIG_FILE: path.join(os.homedir(), '.config', 'markdown-ticket', 'config.toml'),
  TEMPLATES_DIR: path.join(os.homedir(), '.config', 'markdown-ticket', 'templates'),
  PROJECTS_REGISTRY: path.join(os.homedir(), '.config', 'markdown-ticket', 'projects'),
  USER_CONFIG: path.join(os.homedir(), '.config', 'markdown-ticket', 'user.toml')
} as const;

// Configuration Files
export const CONFIG_FILES = {
  PROJECT_CONFIG: '.mdt-config.toml',
  COUNTER_FILE: '.mdt-next',
  USER_CONFIG: '~/.config/markdown-ticket/user.toml',
  PROJECTS_REGISTRY: '~/.config/markdown-ticket/projects'
} as const;

// Default Values
export const DEFAULTS = {
  STATUS: 'Proposed' as Status,
  TYPE: 'Feature Enhancement' as TicketType,
  PRIORITY: 'Medium' as Priority,
  TICKETS_PATH: 'docs/CRs',
  START_NUMBER: 1,
  CODE_PADDING: 3
} as const;

// Validation Patterns
export const PATTERNS = {
  TICKET_CODE: /^[A-Z]{2,5}-\d{3,}$/,
  PROJECT_CODE: /^[A-Z]{2,5}$/,
  YAML_FRONTMATTER: /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
} as const;
