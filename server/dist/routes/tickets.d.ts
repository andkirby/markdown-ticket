import { Router } from 'express';
import { TicketController } from '../controllers/TicketController.js';
/**
 * Router for ticket/task-related endpoints (legacy and duplicate detection)
 * @param ticketController - Ticket controller instance
 * @returns Express router
 */
export declare function createTicketRouter(ticketController: TicketController): Router;
/**
 * Router for duplicate detection endpoints
 * @param ticketController - Ticket controller instance
 * @returns Express router
 */
export declare function createDuplicateRouter(ticketController: TicketController): Router;
