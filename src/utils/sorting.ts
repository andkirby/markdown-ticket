import { Ticket } from '../types';

export function sortTickets(
  tickets: Ticket[],
  attribute: string,
  direction: 'asc' | 'desc'
): Ticket[] {
  return [...tickets].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    // Get values based on attribute
    switch (attribute) {
      case 'code':
        aValue = a.code;
        bValue = b.code;
        break;
      case 'title':
        aValue = a.title;
        bValue = b.title;
        break;
      case 'dateCreated':
        aValue = a.dateCreated;
        bValue = b.dateCreated;
        break;
      case 'lastModified':
        aValue = a.lastModified || a.dateCreated;
        bValue = b.lastModified || b.dateCreated;
        break;
      default:
        // For custom attributes, try to access them directly
        aValue = (a as any)[attribute];
        bValue = (b as any)[attribute];
    }

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return direction === 'asc' ? -1 : 1;
    if (bValue == null) return direction === 'asc' ? 1 : -1;

    // Compare values
    let comparison = 0;
    if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime();
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else {
      comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    }

    return direction === 'asc' ? comparison : -comparison;
  });
}
