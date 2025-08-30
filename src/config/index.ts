// Attribute Configuration
export {
  CR_ATTRIBUTES,
  validateAttribute,
  validateTicket,
  getRequiredAttributes,
  getOptionalAttributes,
  getEnumValues,
  isAttributeEditable,
  isAttributeReadOnly,
  attributeSections,
  type AttributeConfig,
  type AttributeSection
} from './ticketAttributes';

// Status Configuration
export {
  STATUS_CONFIG,
  STATUS_GROUPS,
  canTransitionFromTo,
  getValidTransitions,
  getStatusByOrder,
  getNextStatus,
  getPreviousStatus,
  isStatusEditable,
  getStatusColor,
  getStatusDescription,
  getStatusLabel,
  sortStatusesByOrder,
  getInitialStatuses,
  getNewTicketStatuses,
  shouldUpdateImplementationDate,
  getWorkflowSuggestions,
  type StatusConfig
} from './statusConfig';

// Board Column Configuration
export {
  BOARD_COLUMNS,
  getVisibleColumns,
  getColumnForStatus,
  isStatusVisible,
  toggleColumnVisibility
} from './statusConfig';