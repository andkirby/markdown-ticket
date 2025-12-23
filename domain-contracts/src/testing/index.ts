/**
 * MDT-101 Phase 1: Testing Index Exports
 * Clean testing API entry point - re-exports all fixtures
 */

// Project fixtures
export {
  buildProject, buildProjectConfig, buildCreateProjectInput, buildUpdateProjectInput,
  buildMinimalProject, buildProjectWithComplexDocumentConfig, buildProjects,
  invalidFixtures
} from './project.fixtures.js';

// Ticket fixtures
export {
  buildTicket, buildCR, buildCreateTicketInput, buildUpdateTicketInput,
  buildTicketWithRelationship, buildTicketWithDependencies, buildTicketWithBlocks,
  buildTicketWithRelations, buildFullTicket, buildTickets
} from './ticket.fixtures.js';