import { StatusConfig } from '../../shared/models/Config';
import { CRStatus } from '../../shared/models/Types';

export type { StatusConfig };

// Status Configuration using shared interface
export const STATUS_CONFIG: Record<CRStatus, StatusConfig> = {
  Proposed: {
    label: 'Proposed',
    color: 'gray',
    description: 'New change request has been submitted and is awaiting review',
    isTerminal: false,
    canTransitionTo: ['Approved', 'Rejected'],
    order: 1
  },
  Approved: {
    label: 'Approved',
    color: 'green',
    description: 'Change request has been approved and can be implemented',
    isTerminal: false,
    canTransitionTo: ['In Progress', 'On Hold', 'Rejected'],
    order: 2
  },
  'In Progress': {
    label: 'In Progress',
    color: 'blue',
    description: 'Change request is currently being implemented',
    isTerminal: false,
    canTransitionTo: ['Implemented', 'On Hold', 'Rejected'],
    order: 3
  },
  Implemented: {
    label: 'Implemented',
    color: 'teal',
    description: 'Change request has been successfully implemented',
    isTerminal: true,
    canTransitionTo: [],
    order: 4
  },
  'Partially Implemented': {
    label: 'Partially Implemented',
    color: 'indigo',
    description: 'Only part of the change request has been implemented',
    isTerminal: false,
    canTransitionTo: ['Implemented', 'Rejected'],
    order: 5
  },
  'On Hold': {
    label: 'On Hold',
    color: 'orange',
    description: 'Implementation of change request has been temporarily paused',
    isTerminal: false,
    canTransitionTo: ['Approved', 'Rejected', 'In Progress'],
    order: 6
  },
  Rejected: {
    label: 'Rejected',
    color: 'red',
    description: 'Change request has been rejected and will not be implemented',
    isTerminal: true,
    canTransitionTo: [],
    order: 7
  },
  Superseded: {
    label: 'Superseded',
    color: 'purple',
    description: 'Change request has been replaced by a newer version',
    isTerminal: true,
    canTransitionTo: [],
    order: 8
  },
  Deprecated: {
    label: 'Deprecated',
    color: 'yellow',
    description: 'Change request is no longer recommended for use',
    isTerminal: false,
    canTransitionTo: ['Rejected'],
    order: 9
  },
  Duplicate: {
    label: 'Duplicate',
    color: 'pink',
    description: 'Change request is a duplicate of an existing request',
    isTerminal: true,
    canTransitionTo: [],
    order: 10
  }
};

// Simplified Board Column Configuration
export const BOARD_COLUMNS = {
  // Column 1: Backlog
  backlog: {
    label: 'Backlog',
    color: 'gray',
    description: 'Work that needs to be done',
    statuses: ['Proposed'] as CRStatus[],
    visible: true,
    order: 1
  },
  
  // Column 2: Open
  open: {
    label: 'Open',
    color: 'green',
    description: 'Work that is ready to start',
    statuses: ['Approved'] as CRStatus[],
    visible: true,
    order: 2
  },
  
  // Column 3: In Progress
  inProgress: {
    label: 'In Progress',
    color: 'blue',
    description: 'Work currently being done',
    statuses: ['In Progress', 'On Hold'] as CRStatus[],
    visible: true,
    order: 3
  },
  
  // Column 4: Done
  done: {
    label: 'Done',
    color: 'teal',
    description: 'Completed work',
    statuses: ['Implemented', 'Partially Implemented', 'Rejected'] as CRStatus[],
    visible: true,
    order: 4
  },
  
  // Column 5: Deferred (hidden by default)
  deferred: {
    label: 'Deferred',
    color: 'orange',
    description: 'Work that is paused or cancelled',
    statuses: ['Rejected', 'Superseded', 'Duplicate'] as CRStatus[],
    visible: false,
    order: 5
  }
};

// Status Groupings (for compatibility)
export const STATUS_GROUPS = {
  // Active statuses that can be worked on
  active: ['Proposed', 'Approved', 'In Progress', 'On Hold', 'Deprecated'] as CRStatus[],
  
  // Completed/terminal statuses
  completed: ['Implemented', 'Rejected', 'Superseded', 'Duplicate'] as CRStatus[],
  
  // Statuses that require review
  review: ['Proposed'] as CRStatus[],
  
  // Statuses that are in development
  development: ['In Progress', 'Partially Implemented'] as CRStatus[],
  
  // Statuses that are blocked or paused
  blocked: ['On Hold', 'Rejected', 'Deprecated'] as CRStatus[],
  
  // Statuses that are final
  final: ['Implemented', 'Rejected', 'Superseded', 'Duplicate'] as CRStatus[]
};

// Get visible columns for the board
export const getVisibleColumns = () => {
  return Object.values(BOARD_COLUMNS).filter(column => column.visible);
};

// Get column for a specific status
export const getColumnForStatus = (status: CRStatus) => {
  for (const column of Object.values(BOARD_COLUMNS)) {
    if (column.statuses.includes(status)) {
      return column;
    }
  }
  return BOARD_COLUMNS.deferred; // Default to deferred for unknown statuses
};

// Check if status is visible on main board
export const isStatusVisible = (status: CRStatus) => {
  const column = getColumnForStatus(status);
  return column.visible;
};

// Toggle column visibility
export const toggleColumnVisibility = (columnName: keyof typeof BOARD_COLUMNS) => {
  BOARD_COLUMNS[columnName].visible = !BOARD_COLUMNS[columnName].visible;
};

// Status Transitions
export const canTransitionFromTo = (fromStatus: CRStatus, toStatus: CRStatus): boolean => {
  const config = STATUS_CONFIG[fromStatus];
  return config.canTransitionTo.includes(toStatus);
};

// Get valid transitions for a status
export const getValidTransitions = (fromStatus: CRStatus): CRStatus[] => {
  return STATUS_CONFIG[fromStatus].canTransitionTo;
};

// Get status by order
export const getStatusByOrder = (order: number): CRStatus | undefined => {
  return Object.entries(STATUS_CONFIG).find(([_, config]) => config.order === order)?.[0] as CRStatus;
};

// Get next status in workflow
export const getNextStatus = (currentStatus: CRStatus): CRStatus | undefined => {
  const currentOrder = STATUS_CONFIG[currentStatus].order;
  const nextStatus = getStatusByOrder(currentOrder + 1);
  return nextStatus && canTransitionFromTo(currentStatus, nextStatus) ? nextStatus : undefined;
};

// Get previous status in workflow
export const getPreviousStatus = (currentStatus: CRStatus): CRStatus | undefined => {
  const currentOrder = STATUS_CONFIG[currentStatus].order;
  const previousStatus = getStatusByOrder(currentOrder - 1);
  return previousStatus && canTransitionFromTo(previousStatus, currentStatus) ? previousStatus : undefined;
};

// Check if status is editable
export const isStatusEditable = (status: CRStatus): boolean => {
  return !STATUS_CONFIG[status].isTerminal;
};

// Get status color for UI
export const getStatusColor = (status: CRStatus): string => {
  return STATUS_CONFIG[status].color;
};

// Get status description
export const getStatusDescription = (status: CRStatus): string => {
  return STATUS_CONFIG[status].description;
};

// Get status label
export const getStatusLabel = (status: CRStatus): string => {
  return STATUS_CONFIG[status].label;
};

// Sort statuses by order
export const sortStatusesByOrder = (statuses: CRStatus[]): CRStatus[] => {
  return statuses.sort((a, b) => STATUS_CONFIG[a].order - STATUS_CONFIG[b].order);
};

// Get initial statuses for new tickets
export const getInitialStatuses = (): CRStatus[] => {
  return ['Proposed'];
};

// Get statuses that can be set for new tickets
export const getNewTicketStatuses = (): CRStatus[] => {
  return ['Proposed'];
};

// Check if status change requires implementation date update
export const shouldUpdateImplementationDate = (oldStatus: CRStatus, newStatus: CRStatus): boolean => {
  // Update implementation date when transitioning to "In Progress" or "Implemented"
  const statusesThatTriggerUpdate = ['In Progress', 'Implemented'];
  return statusesThatTriggerUpdate.includes(newStatus) && oldStatus !== newStatus;
};

// Get workflow suggestions for a status
export const getWorkflowSuggestions = (currentStatus: CRStatus): CRStatus[] => {
  const config = STATUS_CONFIG[currentStatus];
  
  // Common workflow suggestions based on current status
  const suggestions: CRStatus[] = [];
  
  if (currentStatus === 'Proposed') {
    suggestions.push('Approved');
  } else if (currentStatus === 'Approved') {
    suggestions.push('In Progress', 'On Hold');
  } else if (currentStatus === 'In Progress') {
    suggestions.push('Implemented', 'On Hold');
  } else if (currentStatus === 'On Hold') {
    suggestions.push('Approved', 'Rejected', 'In Progress');
  }
  
  return suggestions.filter(status => canTransitionFromTo(currentStatus, status));
};