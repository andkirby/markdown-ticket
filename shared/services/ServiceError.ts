/**
 * Service Error Types
 * MDT-145: Consumer-neutral error model for shared services
 *
 * This is a stub for TDD - implementation will be added in Task 1
 */

export type ServiceErrorCode =
  | 'NO_PROJECT_DETECTED'
  | 'PROJECT_NOT_FOUND'
  | 'TICKET_NOT_FOUND'
  | 'INVALID_OPERATION'
  | 'VALIDATION_ERROR'
  | 'PERSISTENCE_ERROR'
  | 'INTERNAL_ERROR'

export interface ServiceErrorPayload {
  code: ServiceErrorCode
  message: string
  details?: Record<string, unknown>
}

export class ServiceError extends Error {
  public readonly code: ServiceErrorCode
  public readonly details?: Record<string, unknown>

  constructor(payload: ServiceErrorPayload) {
    super(payload.message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = 'ServiceError'
    this.code = payload.code
    this.details = payload.details
  }

  static noProjectDetected(cwd?: string): ServiceError {
    return new ServiceError({
      code: 'NO_PROJECT_DETECTED',
      message: `No project configuration found in current directory or parent directories${cwd ? ` (searching from: ${cwd})` : ''}`,
      details: cwd ? { cwd } : undefined,
    })
  }

  static projectNotFound(identifier: string): ServiceError {
    return new ServiceError({
      code: 'PROJECT_NOT_FOUND',
      message: `Project not found: ${identifier}`,
      details: { identifier },
    })
  }

  static ticketNotFound(ticketKey: string): ServiceError {
    return new ServiceError({
      code: 'TICKET_NOT_FOUND',
      message: `Ticket not found: ${ticketKey}`,
      details: { ticketKey },
    })
  }

  static invalidOperation(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError({
      code: 'INVALID_OPERATION',
      message,
      details,
    })
  }

  static validationError(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError({
      code: 'VALIDATION_ERROR',
      message,
      details,
    })
  }

  static persistenceError(message: string, cause?: Error): ServiceError {
    return new ServiceError({
      code: 'PERSISTENCE_ERROR',
      message,
      details: cause ? { cause: cause.message } : undefined,
    })
  }
}
