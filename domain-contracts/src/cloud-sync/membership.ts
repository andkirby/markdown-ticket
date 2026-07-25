import type { ProjectRole } from './http'
import type { CloudPrincipalKind } from './principal'

export interface ProjectBindingProbe {
  projectId: string
  projectCode: string
  coordinationState: 'active' | 'suspended'
  role: ProjectRole
}

export interface ProjectMember {
  kind: CloudPrincipalKind
  id: string
  displayLabel: string
  role: ProjectRole
}

export interface UpsertProjectMemberRequest {
  displayLabel: string
  role: ProjectRole
}

export interface CoordinationStateRequest {
  state: 'active' | 'suspended'
}
