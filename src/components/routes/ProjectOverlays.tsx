import type { AccessMode } from '@mdt/domain-contracts'
import type { Project, ProjectConfig } from '@mdt/shared/models/Project'
import type { Dispatch, SetStateAction } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { Ticket } from '../../types'
import { getTicketsPath } from '@mdt/shared/models/Project'
import { buildProjectPath } from '../../routes'
import { getProjectCode } from '../../utils/projectUtils'
import { AddProjectModal } from '../AddProjectModal'
import { AuthUnlockPanel } from '../AuthUnlock/AuthUnlockPanel'
import { EventHistory } from '../DevTools/EventHistory'
import { QuickSearchModal } from '../QuickSearch'
import { SettingsModal } from '../SettingsModal'
import TicketViewer from '../TicketViewer'
import { Modal, ModalBody } from '../ui/Modal'
import { Toaster } from '../ui/sonner'

export interface ProjectOverlaysProps {
  // TicketViewer
  selectedTicket: Ticket | null
  ticketError: string | null
  onTicketClose: () => void
  projectConfig: ProjectConfig | null
  // Add / edit project modals
  canManageProjects: boolean
  showAddProjectModal: boolean
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>
  showEditProjectModal: boolean
  setShowEditProjectModal: Dispatch<SetStateAction<boolean>>
  refreshProjects: () => Promise<void>
  selectedProject: Project | null
  // Event history
  eventHistoryOpen: boolean
  eventHistoryForceHidden: boolean
  setEventHistoryState: (open: boolean, forceHidden: boolean) => void
  // Owner unlock modal
  accessMode: AccessMode
  showOwnerUnlock: boolean
  setShowOwnerUnlock: Dispatch<SetStateAction<boolean>>
  ownerUnlockError: string | null
  onOwnerUnlock: (token: string) => Promise<void>
  // Settings modal
  canManageSharing: boolean
  showSettings: boolean
  setShowSettings: Dispatch<SetStateAction<boolean>>
  canUseOwnerEndpoints: boolean
  // Quick search
  showQuickSearch: boolean
  setShowQuickSearch: Dispatch<SetStateAction<boolean>>
  projects: Project[]
  tickets: Ticket[]
  onTicketClick: (ticket: Ticket, targetProjectCode?: string) => void
  navigate: NavigateFunction
  projectCode?: string
}

/**
 * Overlay cluster for the project route (controlled refactor stage 4).
 *
 * Pure composition: the 7 overlays + toaster moved verbatim from
 * ProjectRouteHandler's JSX. Owns no state — everything arrives as props and
 * all callbacks stay owned by the shell/hook boundaries.
 */
export function ProjectOverlays({
  selectedTicket,
  ticketError,
  onTicketClose,
  projectConfig,
  canManageProjects,
  showAddProjectModal,
  setShowAddProjectModal,
  showEditProjectModal,
  setShowEditProjectModal,
  refreshProjects,
  selectedProject,
  eventHistoryOpen,
  eventHistoryForceHidden,
  setEventHistoryState,
  accessMode,
  showOwnerUnlock,
  setShowOwnerUnlock,
  ownerUnlockError,
  onOwnerUnlock,
  canManageSharing,
  showSettings,
  setShowSettings,
  canUseOwnerEndpoints,
  showQuickSearch,
  setShowQuickSearch,
  projects,
  tickets,
  onTicketClick,
  navigate,
  projectCode,
}: ProjectOverlaysProps) {
  return (
    <>
      <TicketViewer
        ticket={selectedTicket}
        isOpen={!!selectedTicket || !!ticketError}
        ticketError={ticketError}
        onClose={onTicketClose}
        ticketsPath={getTicketsPath(projectConfig)}
      />

      {canManageProjects && (
        <AddProjectModal
          isOpen={showAddProjectModal}
          onClose={() => setShowAddProjectModal(false)}
          onProjectCreated={async () => {
            setShowAddProjectModal(false)
            if (refreshProjects) {
              await refreshProjects()
            }
          }}
        />
      )}

      {selectedProject && canManageProjects && (
        <AddProjectModal
          isOpen={showEditProjectModal}
          onClose={() => setShowEditProjectModal(false)}
          onProjectCreated={async () => {
            setShowEditProjectModal(false)
            if (refreshProjects) {
              await refreshProjects()
            }
          }}
          editMode={true}
          editProject={{
            name: selectedProject.project.name,
            code: getProjectCode(selectedProject),
            path: selectedProject.project.path,
            crsPath: selectedProject.project.ticketsPath || 'docs/CRs',
            description: selectedProject.project.description || '',
            repositoryUrl: selectedProject.project.repository || '',
          }}
        />
      )}

      <EventHistory
        isOpen={eventHistoryOpen}
        onOpenChange={open => setEventHistoryState(open, false)}
        forceHidden={eventHistoryForceHidden}
      />

      <Modal
        isOpen={showOwnerUnlock && accessMode === 'read-only'}
        onClose={() => setShowOwnerUnlock(false)}
        size="sm"
        overlayClassName="modal--center"
        data-testid="sharing-owner-unlock-dialog"
      >
        <ModalBody>
          <AuthUnlockPanel
            title="Unlock access"
            description="Enter an owner token to manage projects. Your read-only session stays available if the token is not accepted."
            error={ownerUnlockError}
            errorTestId="sharing-owner-unlock-error"
            panelTestId="sharing-owner-unlock-panel"
            onUnlock={onOwnerUnlock}
            onCancel={() => setShowOwnerUnlock(false)}
            cancelTestId="sharing-owner-unlock-cancel"
          />
        </ModalBody>
      </Modal>

      {canManageSharing && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          selectedProject={selectedProject}
          projects={projects}
          onProjectSharingUpdated={refreshProjects}
          canUseOwnerEndpoints={canUseOwnerEndpoints}
        />
      )}

      <QuickSearchModal
        isOpen={showQuickSearch}
        onClose={() => setShowQuickSearch(false)}
        tickets={tickets}
        onSelectTicket={onTicketClick}
        onSelectProject={(project) => {
          const code = project.project?.code
          if (code) {
            navigate(buildProjectPath(code))
          }
        }}
        currentProjectCode={projectCode}
        projects={projects}
      />

      <Toaster />
    </>
  )
}
