import type { Project } from '@mdt/shared/models/Project'
import type { SortPreferences } from '../config/sorting'
import type { Ticket } from '../types'
import { CRStatus } from '@mdt/domain-contracts'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSortPreferences, setSortPreferences } from '../config/sorting'
import { getProjectCode } from '../utils/projectUtils'
import { sortTickets } from '../utils/sorting'
import { AddProjectModal } from './AddProjectModal'
import Board from './Board'
import { DocumentsLayout } from './DocumentsView'
import { SecondaryHeader } from './SecondaryHeader'
import { TicketCode } from './TicketCode'

type ViewMode = 'board' | 'list' | 'documents'

const VIEW_MODE_KEY = 'single-project-view-mode'

interface ProjectViewProps {
  onTicketClick: (ticket: Ticket) => void
  selectedProject: Project | null
  tickets?: Ticket[]
  updateTicketOptimistic?: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>
  onAddProject?: () => void
  viewMode?: ViewMode
  refreshProjects?: () => Promise<void>
}

export default function ProjectView({ onTicketClick, selectedProject, tickets: propTickets, updateTicketOptimistic, onAddProject: _onAddProject, viewMode: externalViewMode, refreshProjects }: ProjectViewProps) {
  // Use external viewMode if provided, otherwise fall back to internal state
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY)
    const validModes: ViewMode[] = ['board', 'list', 'documents']
    return (saved && validModes.includes(saved as ViewMode))
      ? (saved as ViewMode)
      : 'board'
  })

  const viewMode = externalViewMode || internalViewMode

  const [localSortPreferences, setLocalSortPreferences] = useState<SortPreferences>(getSortPreferences)
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const loading = false // Loading is controlled by parent component

  // Use ref to prevent stale closure bug when switching projects
  const selectedProjectRef = useRef<Project | null>(selectedProject)

  useEffect(() => {
    selectedProjectRef.current = selectedProject
  }, [selectedProject])

  const _handleViewModeChange = (mode: ViewMode) => {
    setInternalViewMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
  }

  const handleSortPreferencesChange = useCallback((newPreferences: SortPreferences) => {
    setLocalSortPreferences(newPreferences)
    setSortPreferences(newPreferences)
  }, [])

  const handleTicketUpdate = useCallback(async (ticketCode: string, updates: Partial<Ticket>) => {
    const currentProject = selectedProjectRef.current
    if (!currentProject) {
      throw new Error('No project selected')
    }

    try {
      const response = await fetch(`/api/projects/${currentProject.id}/crs/${ticketCode}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        // Try to parse the error response from backend
        let errorMessage = `Failed to update ticket: ${response.statusText}`
        let errorData = null

        try {
          errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
        }
        catch (e) {
          // If we can't parse JSON, use the status text
          console.warn('Failed to parse error response JSON:', e)
        }

        // Create an error object with response data for proper error handling
        const error = new Error(errorMessage);
        (error as Error & { response?: { status: number, data: unknown } }).response = {
          status: response.status,
          data: errorData,
        }
        throw error
      }

      const updatedTicket = await response.json()

      // Ticket updates are now handled by SSE events automatically

      return updatedTicket
    }
    catch (error) {
      console.error('Failed to update ticket:', error)
      throw error
    }
  }, []) // Removed selectedProject from deps - using ref instead

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-border">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            {selectedProject?.project.name || 'Board View'}
          </h1>
          <div className="flex items-center space-x-4">
            <SecondaryHeader
              viewMode={viewMode}
              sortPreferences={(viewMode === 'board' || viewMode === 'list') ? localSortPreferences : undefined}
              onSortPreferencesChange={(viewMode === 'board' || viewMode === 'list') ? handleSortPreferencesChange : undefined}
              onAddProject={() => setShowAddProjectModal(true)}
              onEditProject={() => setShowEditProjectModal(true)}
              selectedProject={selectedProject}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'board'
          ? (
              <Board
                onTicketClick={onTicketClick}
                onTicketUpdate={updateTicketOptimistic || handleTicketUpdate}
                showHeader={false}
                enableProjectSwitching={false}
                selectedProject={selectedProject}
                tickets={propTickets || []}
                loading={loading}
                sortPreferences={localSortPreferences}
              />
            )
          : viewMode === 'list'
            ? (
                <div className="h-full overflow-auto p-6">
                  <div className="space-y-2">
                    {sortTickets(propTickets || [], localSortPreferences.selectedAttribute, localSortPreferences.selectedDirection).map(ticket => (
                      <div
                        key={ticket.code}
                        onClick={() => onTicketClick(ticket)}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <TicketCode code={ticket.code} />
                            <span className="font-medium">{ticket.title}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            ticket.status === CRStatus.PROPOSED
                              ? 'bg-blue-100 text-blue-800'
                              : ticket.status === CRStatus.APPROVED
                                ? 'bg-green-100 text-green-800'
                                : ticket.status === CRStatus.IN_PROGRESS
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : ticket.status === CRStatus.IMPLEMENTED
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-red-100 text-red-800'
                          }`}
                          >
                            {ticket.status}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {ticket.lastModified ? new Date(ticket.lastModified).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            : viewMode === 'documents'
              ? (
                  selectedProject
                    ? (
                        <DocumentsLayout projectId={selectedProject.id} />
                      )
                    : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No project selected
                        </div>
                      )
                )
              : null}
      </div>

      <AddProjectModal
        isOpen={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        onProjectCreated={() => {
          setShowAddProjectModal(false)
          // Optionally refresh projects or show success message
        }}
      />

      {selectedProject && (
        <AddProjectModal
          isOpen={showEditProjectModal}
          onClose={() => setShowEditProjectModal(false)}
          onProjectCreated={async () => {
            console.warn('Edit project onProjectCreated called')
            setShowEditProjectModal(false)
            if (refreshProjects) {
              console.warn('Calling refreshProjects...')
              await refreshProjects()
              console.warn('refreshProjects completed')
            }
            else {
              console.warn('refreshProjects not available')
            }
          }}
          editMode={true}
          editProject={{
            name: selectedProject.project.name,
            code: getProjectCode(selectedProject),
            path: selectedProject.project.path,
            crsPath: 'docs/CRs',
            description: selectedProject.project.description || '',
            repositoryUrl: '',
          }}
        />
      )}
    </div>
  )
}
