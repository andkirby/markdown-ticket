import type { SortPreferences } from './config/sorting'
import type { Ticket } from './types'
import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AddProjectModal } from './components/AddProjectModal'
import { MobileLogo } from './components/AppHeader'
import { EventHistory } from './components/DevTools/EventHistory'
import { useEventHistoryState } from './components/DevTools/useEventHistoryState'
import { DirectTicketAccess } from './components/DirectTicketAccess'
import { ProjectSelector } from './components/ProjectSelector'
import ProjectView from './components/ProjectView'
import { QuickSearchModal } from './components/QuickSearch'
import { RedirectToCurrentProject } from './components/RedirectToCurrentProject'
import { RouteErrorModal } from './components/RouteErrorModal'
import { SecondaryHeader } from './components/SecondaryHeader'
import TicketViewer from './components/TicketViewer'
import { Toaster } from './components/UI/sonner'
import { ViewModeSwitcher } from './components/ViewModeSwitcher'
import { getSortPreferences, setSortPreferences } from './config/sorting'
import { useGlobalKeyboard } from './hooks/useGlobalKeyboard'
import { useProjectManager } from './hooks/useProjectManager'
import { getProjectCode } from './utils/projectUtils'
import { normalizeTicketKey, setCurrentProject, validateProjectCode } from './utils/routing'
import './utils/cache' // Import cache utilities for development
import './services/sseClient' // Initialize SSE connection

function ProjectRouteHandler() {
  const { projectCode } = useParams<{ projectCode: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const {
    projects,
    selectedProject,
    setSelectedProject,
    tickets,
    refreshProjects,
    loading: projectsLoading,
  } = useProjectManager({ autoSelectFirst: false, handleSSEEvents: true })

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [eventHistoryOpen, eventHistoryForceHidden, setEventHistoryState] = useEventHistoryState()
  const [localSortPreferences, setLocalSortPreferences] = useState<SortPreferences>(getSortPreferences)
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [lastBoardListMode, setLastBoardListMode] = useState<'board' | 'list'>(() => (localStorage.getItem('lastBoardListMode') as 'board' | 'list') || 'board')
  const [showQuickSearch, setShowQuickSearch] = useState(false)

  // Global keyboard shortcuts
  useGlobalKeyboard({
    onQuickSearch: () => setShowQuickSearch(true),
  })

  // Store state setters in refs to avoid direct setState in useEffect
  const errorRef = useRef(error)
  errorRef.current = error
  const setErrorRef = useRef(setError)
  setErrorRef.current = setError

  const selectedTicketRef = useRef(selectedTicket)
  selectedTicketRef.current = selectedTicket
  const setSelectedTicketRef = useRef(setSelectedTicket)
  setSelectedTicketRef.current = setSelectedTicket

  // Determine current view mode from URL
  const getCurrentViewMode = (): 'board' | 'list' | 'documents' => {
    // Check pathname first (for /prj/MDT/list, /prj/MDT/documents)
    if (location.pathname.includes('/list'))
      return 'list'
    if (location.pathname.includes('/documents'))
      return 'documents'
    // Check query param when on ticket route (e.g., /prj/MDT/ticket/MDT-130?view=list)
    const viewParam = searchParams.get('view')
    if (viewParam === 'list' || viewParam === 'documents')
      return viewParam
    return 'board'
  }

  const viewMode = getCurrentViewMode()

  const handleSortPreferencesChange = (newPreferences: SortPreferences) => {
    setLocalSortPreferences(newPreferences)
    setSortPreferences(newPreferences)
  }

  const handleAddProject = () => {
    setShowAddProjectModal(true)
  }

  const handleEditProject = () => {
    setShowEditProjectModal(true)
  }

  // Handle project selection and validation
  useEffect(() => {
    if (projectsLoading) {
      setErrorRef.current(null) // Clear errors when loading
      return
    }

    if (!projectCode)
      return

    // Validate project code format
    if (!validateProjectCode(projectCode)) {
      setErrorRef.current(`Invalid project code format: '${projectCode}'`)
      return
    }

    const project = projects.find(p => getProjectCode(p) === projectCode)
    if (!project) {
      setErrorRef.current(`Project '${projectCode}' not found`)
      return
    }

    if (!selectedProject || getProjectCode(selectedProject) !== projectCode) {
      setSelectedProject(project)
      setCurrentProject(projectCode)
    }
    setErrorRef.current(null)
  }, [projectCode, projects, projectsLoading, selectedProject, setSelectedProject])

  // Initialize view mode from localStorage when URL has no view suffix
  useEffect(() => {
    if (!projectCode)
      return

    // Check if URL is just /prj/:code (no view suffix)
    const isRootProjectPath = /^\/prj\/[^/]+$/.test(location.pathname)

    if (isRootProjectPath) {
      const lastBoardListMode = localStorage.getItem('lastBoardListMode')

      // If user's last preference was list view, navigate to it
      if (lastBoardListMode === 'list') {
        navigate(`/prj/${projectCode}/list`, { replace: true })
      }
      // Otherwise stay on board view (default)
    }
  }, [projectCode, location.pathname, navigate])

  // Handle ticket modal from URL
  useEffect(() => {
    const ticketMatch = location.pathname.match(/\/ticket\/([^/]+)/)
    if (ticketMatch) {
      const ticketKey = normalizeTicketKey(ticketMatch[1])
      const ticket = tickets.find(t => t.code === ticketKey)
      if (ticket) {
        setSelectedTicketRef.current(ticket)
        setErrorRef.current(null) // Clear any previous error
      }
      else if (!projectsLoading && selectedProject) {
        // Only set error if projects are loaded and we have a selected project with loaded tickets
        // This prevents false errors during initial loading
        setErrorRef.current(`Ticket '${ticketMatch[1]}' not found`)
      }
    }
    else {
      setSelectedTicketRef.current(null)
    }
  }, [location.pathname, tickets, projectsLoading, selectedProject])

  const handleViewModeChange = (mode: 'board' | 'list' | 'documents') => {
    const basePath = `/prj/${projectCode}`
    const newPath = mode === 'board' ? basePath : `${basePath}/${mode}`

    // Store view mode preferences
    if (mode === 'board' || mode === 'list') {
      // Store the last board/list mode separately
      localStorage.setItem('lastBoardListMode', mode)
      setLastBoardListMode(mode)
    }
    localStorage.setItem('lastViewMode', mode)

    navigate(newPath)
  }

  const handleTicketClick = (ticket: Ticket) => {
    const viewParam = viewMode !== 'board' ? `?view=${viewMode}` : ''
    navigate(`/prj/${projectCode}/ticket/${ticket.code}${viewParam}`)
  }

  const handleTicketClose = () => {
    const viewContext = searchParams.get('view') || 'board'
    const basePath = `/prj/${projectCode}`
    const targetPath = viewContext === 'board' ? basePath : `${basePath}/${viewContext}`
    navigate(targetPath)
  }

  if (projectsLoading) {
    return (
      <div data-testid="loading" className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return <RouteErrorModal error={error} />
  }

  return (
    <div className="App h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Navigation Bar */}
      <nav
        data-testid="main-nav"
        className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 shadow-sm"
      >
        <div className="px-1 sm:px-2 lg:px-2">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-1 sm:gap-4 min-w-0 flex-1 overflow-hidden">
              <div className="flex-shrink-0">
                <MobileLogo />
              </div>
              <ViewModeSwitcher
                currentMode={viewMode === 'documents' ? lastBoardListMode : viewMode}
                onModeChange={handleViewModeChange}
                isDocumentsView={viewMode === 'documents'}
              />
              <div className="min-w-0 flex-1">
                <ProjectSelector />
              </div>
            </div>
            <div className="flex items-center">
              <SecondaryHeader
                viewMode={viewMode}
                sortPreferences={(viewMode === 'board' || viewMode === 'list') ? localSortPreferences : undefined}
                onSortPreferencesChange={(viewMode === 'board' || viewMode === 'list') ? handleSortPreferencesChange : undefined}
                onAddProject={handleAddProject}
                onEditProject={handleEditProject}
                selectedProject={selectedProject}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        <ProjectView
          onTicketClick={handleTicketClick}
          selectedProject={selectedProject}
          tickets={tickets}
          viewMode={viewMode}
          sortPreferences={(viewMode === 'board' || viewMode === 'list') ? localSortPreferences : undefined}
        />
      </div>

      <TicketViewer
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={handleTicketClose}
      />

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

      {selectedProject && (
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
            crsPath: 'docs/CRs',
            description: selectedProject.project.description || '',
            repositoryUrl: '',
          }}
        />
      )}

      <EventHistory
        isOpen={eventHistoryOpen}
        onOpenChange={open => setEventHistoryState(open, false)}
        forceHidden={eventHistoryForceHidden}
      />

      <QuickSearchModal
        isOpen={showQuickSearch}
        onClose={() => setShowQuickSearch(false)}
        tickets={tickets}
        onSelectTicket={handleTicketClick}
      />

      <Toaster />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RedirectToCurrentProject />} />
        <Route path="/:ticketKey" element={<DirectTicketAccess />} />
        <Route path="/prj/:projectCode" element={<ProjectRouteHandler />} />
        <Route path="/prj/:projectCode/list" element={<ProjectRouteHandler />} />
        <Route path="/prj/:projectCode/documents" element={<ProjectRouteHandler />} />
        {/* MDT-094: Unified route for tickets with optional sub-document path */}
        <Route path="/prj/:projectCode/ticket/:ticketKey/*" element={<ProjectRouteHandler />} />
        <Route path="/prj/:projectCode/ticket/:ticketKey" element={<ProjectRouteHandler />} />
        <Route path="/ticket/:ticketKey" element={<DirectTicketAccess />} />
        {/* MDT-094: Direct ticket access with sub-document path */}
        <Route path="/ticket/:ticketKey/*" element={<DirectTicketAccess />} />
        <Route path="*" element={<RouteErrorModal error="Page not found" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
