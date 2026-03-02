/**
 * Page Selectors
 *
 * Centralized selectors for E2E tests.
 * Organized by feature area for easy maintenance.
 */

/**
 * Navigation selectors
 */
export const navSelectors = {
  /** Main navigation container */
  nav: '[data-testid="main-nav"]',
  /** Project selector dropdown */
  projectSelector: '[data-testid="project-selector"]',
  /** Board view tab */
  boardTab: '[data-testid="nav-board"]',
  /** List view tab */
  listTab: '[data-testid="nav-list"]',
  /** Documents view tab */
  documentsTab: '[data-testid="nav-documents"]',
} as const

/**
 * Board view selectors
 */
export const boardSelectors = {
  /** Board container */
  board: '[data-testid="kanban-board"]',
  /** Status column by status name */
  columnByStatus: (status: string) => `[data-testid="column-${status}"]`,
  /** Ticket card in board (note: space-separated with ticket-{code}) */
  ticketCard: '[data-testid~="ticket-card"]',
  /** Ticket card by code (note: space-separated with ticket-card) */
  ticketByCode: (code: string) => `[data-testid~="ticket-${code}"]`,
  /** Drag handle on ticket */
  dragHandle: '[data-testid="drag-handle"]',
  /** Drop zone indicator */
  dropZone: '[data-testid="drop-zone"]',
  /** Filter controls container */
  filterControls: '[data-testid="filter-controls"]',
  /** Search input field */
  searchInput: '[data-testid="search-input"]',
} as const

/**
 * Ticket selectors
 */
export const ticketSelectors = {
  /** Ticket detail panel */
  detailPanel: '[data-testid="ticket-detail"]',
  /** Ticket title */
  title: '[data-testid="ticket-title"]',
  /** Ticket code/ID */
  code: '[data-testid="ticket-code"]',
  /** Ticket status badge */
  statusBadge: '[data-testid="ticket-status"]',
  /** Ticket type badge */
  typeBadge: '[data-testid="ticket-type"]',
  /** Ticket priority badge */
  priorityBadge: '[data-testid="ticket-priority"]',
  /** Ticket content area */
  content: '[data-testid="ticket-content"]',
  /** Close detail button */
  closeDetail: '[data-testid="close-detail"]',
  /** Status dropdown for changing status */
  statusDropdown: '[data-testid="status-dropdown"]',
} as const

/**
 * Common UI selectors
 */
export const commonSelectors = {
  /** Loading spinner */
  loading: '[data-testid="loading"]',
  /** Error message */
  error: '[data-testid="error-message"]',
  /** Toast notification */
  toast: '[data-testid="toast"]',
  /** Modal dialog */
  modal: '[data-testid="modal"]',
  /** Confirm button */
  confirmButton: '[data-testid="confirm-button"]',
  /** Cancel button */
  cancelButton: '[data-testid="cancel-button"]',
} as const

/**
 * Project info selectors
 */
export const projectSelectors = {
  /** Project name header */
  projectName: '[data-testid="project-name"]',
  /** Project code */
  projectCode: '[data-testid="project-code"]',
  /** Ticket count badge */
  ticketCount: '[data-testid="ticket-count"]',
} as const

/**
 * List view selectors
 */
export const listSelectors = {
  /** Ticket list container */
  ticketList: '[data-testid="ticket-list"]',
  /** Ticket row in list (note: space-separated with ticket-row-{code}) */
  ticketRow: '[data-testid~="ticket-row"]',
  /** Ticket row by code (note: space-separated with ticket-row) */
  rowByCode: (code: string) => `[data-testid~="ticket-row-${code}"]`,
  /** Sort controls container */
  sortControls: '[data-testid="sort-controls"]',
  /** Sort button for column */
  sortButton: (column: string) => `[data-testid="sort-${column}"]`,
  /** Table header */
  tableHeader: '[data-testid="table-header"]',
  /** Sort indicator */
  sortIndicator: '[data-testid="sort-indicator"]',
} as const

/**
 * Document view selectors
 */
export const documentSelectors = {
  /** Document tree container */
  documentTree: '[data-testid="document-tree"]',
  /** Document item */
  documentItem: '[data-testid="document-item"]',
  /** Folder item */
  folderItem: '[data-testid="folder-item"]',
  /** File content viewer */
  fileViewer: '[data-testid="file-viewer"]',
} as const
