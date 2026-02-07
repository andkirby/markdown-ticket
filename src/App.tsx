import type { Project } from '@mdt/shared/models/Project'
import type { Ticket } from './types'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EventHistory } from './components/DevTools/EventHistory'
import { useEventHistoryState } from './components/DevTools/useEventHistoryState'
import { DirectTicketAccess } from './components/DirectTicketAccess'
import { ProjectSelector } from './components/ProjectSelector'
import ProjectView from './components/ProjectView'
import { RedirectToCurrentProject } from './components/RedirectToCurrentProject'
import { RouteErrorModal } from './components/RouteErrorModal'
import TicketViewer from './components/TicketViewer'
import { Toaster } from './components/UI/sonner'
import { useProjectManager } from './hooks/useProjectManager'
import { useTheme } from './hooks/useTheme'
import { getProjectCode } from './utils/projectUtils'
import { normalizeTicketKey, setCurrentProject, validateProjectCode } from './utils/routing'
import './utils/cache' // Import cache utilities for development
import './services/sseClient' // Initialize SSE connection

interface ViewModeSwitcherProps {
  viewMode: 'board' | 'list' | 'documents'
  onViewModeChange: (mode: 'board' | 'list' | 'documents') => void
}

function ViewModeSwitcher({ viewMode, onViewModeChange }: ViewModeSwitcherProps) {
  return (
    <div className="flex space-x-1">
      <button
        onClick={() => onViewModeChange('board')}
        className={`h-12 w-12 rounded-md transition-all ${
          viewMode === 'board'
            ? 'border-2 border-primary'
            : 'border-2 border-transparent hover:border-muted-foreground/30'
        }`}
        title="Board View"
      >
        <img
          src="/icon_board_col_64.webp"
          alt="Board"
          className="w-8 h-8 mx-auto dark:invert"
        />
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={`h-12 w-12 rounded-md transition-all ${
          viewMode === 'list'
            ? 'border-2 border-primary'
            : 'border-2 border-transparent hover:border-muted-foreground/30'
        }`}
        title="List View"
      >
        <img
          src="/icon_list_64.webp"
          alt="List"
          className="w-8 h-8 mx-auto dark:invert"
        />
      </button>
      <button
        onClick={() => onViewModeChange('documents')}
        className={`h-12 w-12 rounded-md transition-all ${
          viewMode === 'documents'
            ? 'border-2 border-primary'
            : 'border-2 border-transparent hover:border-muted-foreground/30'
        }`}
        title="Documents View"
      >
        <img
          src="/icon_docs_64.webp"
          alt="Documents"
          className="w-8 h-8 mx-auto dark:invert"
        />
      </button>
    </div>
  )
}

function ProjectRouteHandler() {
  const { projectCode } = useParams<{ projectCode: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { theme, toggleTheme } = useTheme()

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
    if (location.pathname.includes('/list'))
      return 'list'
    if (location.pathname.includes('/documents'))
      return 'documents'
    return 'board'
  }

  const viewMode = getCurrentViewMode()

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
    // Store current view mode preference
    localStorage.setItem('lastViewMode', mode)
    navigate(newPath)
  }

  const handleProjectSelect = (project: Project) => {
    // Preserve current view mode when switching projects
    const lastViewMode = localStorage.getItem('lastViewMode') || 'board'
    const projectCode = getProjectCode(project)
    const basePath = `/prj/${projectCode}`
    const newPath = lastViewMode === 'board' ? basePath : `${basePath}/${lastViewMode}`
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return <RouteErrorModal error={error} />
  }

  return (
    <div className="App h-screen flex flex-col bg-background overflow-hidden">
      {/* Navigation Bar */}
      <nav className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4 min-w-0 flex-1 overflow-hidden">
              <div className="flex-shrink-0">
                <img src="/logo.jpeg" alt="Logo" className="h-14 w-auto dark:invert" />
              </div>
              <ViewModeSwitcher viewMode={viewMode} onViewModeChange={handleViewModeChange} />
              <div className="min-w-0 flex-1">
                <ProjectSelector
                  projects={projects}
                  selectedProject={selectedProject}
                  onProjectSelect={handleProjectSelect}
                  loading={projectsLoading}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <button
                onClick={toggleTheme}
                className="btn btn-ghost p-2 h-10 w-10"
                aria-label="Toggle theme"
              >
                {theme === 'dark'
                  ? (
                      <Sun className="h-5 w-5" />
                    )
                  : (
                      <Moon className="h-5 w-5" />
                    )}
              </button>
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
          refreshProjects={refreshProjects}
        />
      </div>

      <TicketViewer
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={handleTicketClose}
      />

      <EventHistory
        isOpen={eventHistoryOpen}
        onOpenChange={open => setEventHistoryState(open, false)}
        forceHidden={eventHistoryForceHidden}
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
        <Route path="/prj/:projectCode/ticket/:ticketKey" element={<ProjectRouteHandler />} />
        <Route path="*" element={<RouteErrorModal error="Page not found" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
