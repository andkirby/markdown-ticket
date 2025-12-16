/**
 * Ticket Creator Interface
 *
 * Defines interface for creating CRs/tickets in different implementations.
 * Decouples ticket creation logic from specific implementations (MCP, file, memory).
 */

import { TestCRData, MCPResponse, ValidationResult } from '../types/project-factory-types';

/**
 * Interface for creating CRs/tickets with multiple implementations
 */
export interface TicketCreator {
  /**
   * Create a single ticket/CR
   *
   * @param projectCode - Project code where ticket will be created
   * @param data - Ticket data including title, type, and content
   * @returns Promise resolving to ticket creation result
   */
  createTicket(projectCode: string, data: TestCRData): Promise<MCPResponse>;

  /**
   * Create multiple tickets/CRs
   *
   * @param projectCode - Project code where tickets will be created
   * @param ticketsData - Array of ticket data (supports dependencies)
   * @returns Promise resolving to array of creation results
   */
  createMultipleTickets(
    projectCode: string,
    ticketsData: TestCRData[]
  ): Promise<MCPResponse[]>;

  /**
   * Validate ticket data before creation
   *
   * @param data - Ticket data to validate
   * @returns Validation result with errors and warnings
   */
  validateTicket(data: TestCRData): ValidationResult;

  /**
   * Get the type of ticket creator implementation
   *
   * @returns String identifying the creator type ('mcp', 'file', 'memory')
   */
  getCreatorType(): string;
}