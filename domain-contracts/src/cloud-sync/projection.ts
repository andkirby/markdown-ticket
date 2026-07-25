/** Approved cloud mirror fields. Ticket bodies never cross this boundary. */
export interface ProjectedHeader {
  code: string
  title: string
  status: string
  type: string | null
  priority: string | null
  assignee: string | null
  date_created: string | null
  last_modified: string
}

export interface AcknowledgeReservationRequest {
  cloudProjectId: string
  reservationId: string
  operationId: string
  contentHash: string
  header: ProjectedHeader
}

export interface AcknowledgeReservationResponse {
  acknowledged: true
  projectionVersion: number
  projectRevision: number
  replayed: boolean
}
