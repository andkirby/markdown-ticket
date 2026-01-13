import { useDrop } from 'react-dnd';
import { Ticket } from '../../types';

interface DropZoneOptions {
  /**
   * Function called when an item is dropped on the zone
   * @param item - The dropped item containing the ticket
   * @returns Optional drop result to signal handling
   */
  onDrop: (item: { ticket: Ticket }) => any | void;

  /**
   * The item type(s) to accept. Defaults to 'ticket'
   */
  accept?: string | string[];

  /**
   * Whether this drop zone should mark itself as handled
   * When true, prevents parent drop zones from also handling the drop
   */
  markHandled?: boolean;

  /**
   * Optional custom hover handler
   */
  onHover?: (item: { ticket: Ticket }, monitor: any) => void;

  /**
   * Optional custom can drop handler
   */
  canDrop?: (item: { ticket: Ticket }) => boolean;
}

interface DropZoneResult {
  /**
   * Ref to attach to the drop target element
   */
  drop: React.RefObject<any> | ((node: any) => void);

  /**
   * Whether a draggable item is currently over the drop zone
   */
  isOver: boolean;

  /**
   * Whether the current item can be dropped
   */
  canDrop: boolean;

  /**
   * The currently dragged item (if any)
   */
  draggedItem: { ticket: Ticket } | null;
}

/**
 * Hook that wraps react-dnd's useDrop to provide a cleaner API for drop zones
 *
 * @param options - Configuration options for the drop zone
 * @returns Object containing drop ref and state
 *
 * @example
 * ```tsx
 * const { drop, isOver } = useDropZone({
 *   onDrop: (item) => handleTicketDrop(item.ticket),
 *   accept: 'ticket',
 *   markHandled: true
 * });
 *
 * <div ref={drop} className={isOver ? 'highlight' : ''}>
 *   Drop tickets here
 * </div>
 * ```
 */
export const useDropZone = (options: DropZoneOptions): DropZoneResult => {
  const {
    onDrop,
    accept = 'ticket',
    markHandled = false,
    onHover,
    canDrop: customCanDrop
  } = options;

  const [{ isOver, canDrop, draggedItem }, drop] = useDrop(() => ({
    accept,
    drop: (item: any, monitor) => {
      try {
        // Check if a child drop zone already handled this drop
        if (monitor && monitor.didDrop && monitor.didDrop()) {
          // A child component already handled this drop
          return { handled: true };
        }

        const result = onDrop?.(item);

        // If markHandled is true or drop handler returns handled=true,
        // mark this drop as handled to prevent parent zones from also handling it
        if (markHandled || result?.handled) {
          return { ...result, handled: true };
        }

        return result;
      } catch (error) {
        console.error('useDropZone: Error in drop handler:', error);
        return { handled: false };
      }
    },
    hover: onHover,
    canDrop: customCanDrop ? (item: any) => customCanDrop(item) : undefined,
    collect: (monitor) => ({
      isOver: !!monitor.isOver({ shallow: true }),
      canDrop: !!monitor.canDrop(),
      draggedItem: monitor.getItem() || null,
    }),
  }));

  return {
    drop,
    isOver,
    canDrop,
    draggedItem
  };
};