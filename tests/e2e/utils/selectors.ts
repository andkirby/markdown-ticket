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
  /** Resolution dialog shown when dropping into Done */
  resolutionDialog: '[data-testid="resolution-dialog"]',
  /** Resolution option button by status */
  resolutionOption: (status: string) => `[data-testid="resolution-option-${status.toLowerCase().replace(/ /g, '-')}"]`,
  /** Cancel button for resolution dialog */
  resolutionCancel: '[data-testid="resolution-cancel"]',
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
  /** Hamburger menu button */
  hamburgerMenu: '[data-testid="hamburger-menu"]',
  /** Add project button in navigation */
  addProjectButton: '[data-testid="add-project-button"]',
  /** Add project modal */
  addProjectModal: '[data-testid="add-project-modal"]',
  /** Project name input field */
  projectNameInput: '[data-testid="project-name-input"]',
  /** Project code input field */
  projectCodeInput: '[data-testid="project-code-input"]',
  /** Project path input field */
  projectPathInput: '[data-testid="project-path-input"]',
  /** Submit button for project creation */
  projectSubmitButton: '[data-testid="project-submit-button"]',
  /** Cancel button for project creation */
  projectCancelButton: '[data-testid="project-cancel-button"]',
  /** Browse button for project path */
  projectPathBrowseButton: '[data-testid="project-path-browse-button"]',
  /** Folder browser modal */
  folderBrowserModal: '[data-testid="folder-browser-modal"]',
  /** Current path shown in folder browser */
  folderBrowserCurrentPath: '[data-testid="folder-browser-current-path"]',
  /** Folder browser directory items */
  folderBrowserItem: '[data-testid="folder-browser-item"]',
  /** Folder browser confirm button */
  folderBrowserSelectButton: '[data-testid="folder-browser-select-button"]',
  /** Confirmation dialog for project creation */
  confirmCreationDialog: '[data-testid="confirm-creation-dialog"]',
  /** Confirm button in confirmation dialog */
  confirmCreationButton: '[data-testid="confirm-creation-button"]',
  /** Success dialog after project creation */
  successDialog: '[data-testid="success-dialog"]',
  /** Done button in success dialog */
  successDoneButton: '[data-testid="success-done-button"]',
  /** Project option in navigation (by code) */
  projectOption: (code: string) => `[data-testid="project-option-${code}"]`,
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

/**
 * Sub-document navigation selectors
 *
 * @testid subdoc-tabs — container for tab rows; only rendered when subdocuments exist
 * @testid subdoc-tab-row — a single tab row (primary or nested); multiple may exist for folder levels
 * @testid subdoc-tab-{name} — individual tab trigger, where {name} is the document or folder name
 * @testid subdoc-content — content area displaying the currently selected sub-document
 * @testid subdoc-preloading — initial loading state when tab is clicked but content not yet loaded
 * @testid subdoc-loading — loading indicator shown while sub-document content is fetching
 * @testid subdoc-error — error message shown when sub-document content fails to load
 */
export const subdocSelectors = {
  /** Tabs container — only present when subdocuments exist */
  tabsContainer: '[data-testid="subdoc-tabs"]',
  /** A tab row element (primary or nested) */
  tabRow: '[data-testid="subdoc-tab-row"]',
  /** Individual tab trigger by document/folder name */
  tabTrigger: (name: string) => `[data-testid="subdoc-tab-${name}"]`,
  /** Content area for the selected sub-document */
  content: '[data-testid="subdoc-content"]',
  /** Preloading indicator when tab is clicked but content not yet loaded */
  preloading: '[data-testid="subdoc-preloading"]',
  /** Loading indicator during content fetch */
  loading: '[data-testid="subdoc-loading"]',
  /** Error message when content fails to load */
  error: '[data-testid="subdoc-error"]',
} as const

/**
 * Markdown rendering selectors
 */
export const markdownSelectors = {
  /** Nested list item rendered under a parent list item */
  nestedListItem: 'ul > li > ul > li',
  /** Mermaid diagram container */
  mermaidContainer: '.mermaid-container',
  /** Mermaid fullscreen control added after rendering */
  mermaidFullscreenButton: '.mermaid-container .mermaid-fullscreen-btn',
  /** Rendered markdown table */
  table: 'table',
  /** Rendered blockquote */
  blockquote: 'blockquote',
  /** Rendered fenced code block */
  codeBlock: 'pre code',
} as const
