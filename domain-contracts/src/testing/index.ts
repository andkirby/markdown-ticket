/**
 * MDT-101 Phase 1: Testing Index Exports
 * Clean testing API entry point - re-exports all fixtures
 */

// Project fixtures
export {
  buildCreateProjectInput,
  buildMinimalProject,
  buildProject,
  buildProjectConfig,
  buildProjects,
  buildProjectWithComplexDocumentConfig,
  buildUpdateProjectInput,
  invalidFixtures,
} from './project.fixtures.js'

// Ticket fixtures
export {
  buildCR,
  buildCreateTicketInput,
  buildFullTicket,
  buildTicket,
  buildTickets,
  buildTicketWithBlocks,
  buildTicketWithDependencies,
  buildTicketWithRelations,
  buildTicketWithRelationship,
  buildUpdateTicketInput,
} from './ticket.fixtures.js'
