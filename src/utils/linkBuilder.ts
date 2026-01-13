export function buildTicketLink(projectCode: string, ticketKey: string, anchor?: string): string {
  if (!projectCode?.trim()) {
    throw new Error('Project code is required');
  }
  if (!ticketKey?.trim()) {
    throw new Error('Ticket key is required');
  }
  return `/prj/${projectCode}/ticket/${ticketKey}${anchor || ''}`;
}

export function buildDocumentLink(projectCode: string, documentPath: string): string {
  if (!projectCode?.trim()) {
    throw new Error('Project code is required');
  }
  if (!documentPath?.trim()) {
    throw new Error('Document path is required');
  }
  return `/prj/${projectCode}/documents?file=${encodeURIComponent(documentPath)}`;
}

function buildProjectLink(projectCode: string, view: 'board' | 'list' | 'documents' = 'board'): string {
  if (!projectCode?.trim()) {
    throw new Error('Project code is required');
  }
  const basePath = `/prj/${projectCode}`;
  return view === 'board' ? basePath : `${basePath}/${view}`;
}
