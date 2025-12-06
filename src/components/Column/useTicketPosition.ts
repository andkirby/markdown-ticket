import { useState, useCallback, useRef, useEffect } from 'react';

// Position tracking interface for ticket restoration
export interface TicketPosition {
  columnIndex: number;
  ticketIndex: number;
  timestamp: number;
}

/**
 * Hook for managing ticket positions across the kanban board.
 * Provides functionality to store, retrieve, and manage ticket positions
 * for restoration after status changes.
 */
export function useTicketPosition() {
  // Position tracking for ticket restoration
  const [ticketPositions, setTicketPositions] = useState<Map<string, TicketPosition>>(new Map());

  // Use ref to always get current ticket positions (prevents stale closure)
  const ticketPositionsRef = useRef<Map<string, TicketPosition>>(ticketPositions);

  useEffect(() => {
    ticketPositionsRef.current = ticketPositions;
  }, [ticketPositions]);

  // Position tracking methods

  /**
   * Store the position of a ticket in the kanban board
   * @param ticketCode - The unique identifier for the ticket
   * @param columnIndex - The column index where the ticket is located
   * @param ticketIndex - The ticket's index within the column
   */
  const storeTicketPosition = useCallback((ticketCode: string, columnIndex: number, ticketIndex: number): void => {
    const position: TicketPosition = {
      columnIndex,
      ticketIndex,
      timestamp: Date.now()
    };
    setTicketPositions(prev => new Map(prev.set(ticketCode, position)));
  }, []);

  /**
   * Retrieve the stored position for a ticket
   * @param ticketCode - The unique identifier for the ticket
   * @returns The ticket position if found, undefined otherwise
   */
  const getTicketPosition = useCallback((ticketCode: string): TicketPosition | undefined => {
    return ticketPositionsRef.current.get(ticketCode);
  }, []);

  /**
   * Remove the stored position for a ticket
   * @param ticketCode - The unique identifier for the ticket
   */
  const clearTicketPosition = useCallback((ticketCode: string): void => {
    setTicketPositions(prev => {
      const newMap = new Map(prev);
      newMap.delete(ticketCode);
      return newMap;
    });
  }, []);

  /**
   * Get all stored ticket positions
   * @returns A copy of the ticket positions map
   */
  const getAllTicketPositions = useCallback((): Map<string, TicketPosition> => {
    return new Map(ticketPositionsRef.current);
  }, []);

  /**
   * Clear all stored ticket positions
   */
  const clearAllTicketPositions = useCallback((): void => {
    setTicketPositions(new Map());
  }, []);

  return {
    storeTicketPosition,
    getTicketPosition,
    clearTicketPosition,
    getAllTicketPositions,
    clearAllTicketPositions,
  };
}