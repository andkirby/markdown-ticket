import type { SortPreferences } from './config/sorting'
import type { Ticket } from './types'
import { getTicketsPath } from '@mdt/shared/models/Project'
import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { authFetch, isBackendDownError, isBackendDownResponse } from './auth/authFetch'
import { useAuthSession } from './auth/AuthSessionContext'
import { AuthSessionProvider } from './auth/AuthSessionProvider'
import { AddProjectModal } from './components/AddProjectModal'
import { MobileLogo } from './components/AppHeader'
import { AuthStatusAction } from './components/AuthUnlock/AuthStatusAction'
import { AuthUnlockPanel } from './components/AuthUnlock/AuthUnlockPanel'
import { EventHistory } from './components/DevTools/EventHistory'
import { useEventHistoryState } from './components/DevTools/useEventHistoryState'
import { DirectTicketAccess } from './components/DirectTicketAccess'
import { ProjectSelector } from './components/ProjectSelector'
import ProjectView from './components/ProjectView'
import { QuickSearchModal } from './components/QuickSearch'
import { RedirectToCurrentProject } from './components/RedirectToCurrentProject'
import { RouteErrorModal } from './components/RouteErrorModal'
import { SecondaryHeader } from './components/SecondaryHeader'
import { SettingsModal } from './components/SettingsModal'
import TicketViewer from './components/TicketViewer'
import { Modal, ModalBody } from './components/ui/Modal'
import { Toaster } from './components/ui/sonner'
import { ViewModeSwitcher } from './components/ViewModeSwitcher'
import { getSortPreferences, setSortPreferences } from './config/sorting'
import { useGlobalKeyboard } from './hooks/useGlobalKeyboard'
import { formatRootViewPageTitle, PageTitlePriority, usePageTitle } from './hooks/usePageTitle'
import { useProjectManager } from './hooks/useProjectManager'
import { syncSSEAccessMode } from './services/sseClient'
import { getProjectCode } from './utils/projectUtils'
import { normalizeTicketKey, setCurrentProject, validateProjectCode } from './utils/routing'
import './utils/cache' // Import cache utilities for development

interface InviteExchangeResult {
  ok: boolean
  status: number
  backendDown: boolean
  projectRefs: string[]
}

const inviteExchangeCache = new Map<string, Promise<InviteExchangeResult>>()

function ProjectRouteHandler() {
  const { projectCode } = useParams<{ projectCode: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const {
    projects,
    selectedProject,
    projectConfig,
    setSelectedProject,
    tickets,
    refreshProjects,
    loading: projectsLoading,
  } = useProjectManager({ autoSelectFirst: false, handleSSEEvents: true })
  const {
    accessMode,
    sessionStatus,
    canWriteTickets,
    canManageProjects,
    canManageSharing,
    canUseOwnerEndpoints,
    unlock,
    lock,
    markLocked,
    markOwnerAdmin,
  } = useAuthSession()

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [ticketError, setTicketError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [authRefreshInFlight, setAuthRefreshInFlight] = useState(false)
  const [eventHistoryOpen, eventHistoryForceHidden, setEventHistoryState] = useEventHistoryState()
  const [localSortPreferences, setLocalSortPreferences] = useState<SortPreferences>(getSortPreferences)
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [lastBoardListMode, setLastBoardListMode] = useState<'board' | 'list'>(() => (localStorage.getItem('lastBoardListMode') as 'board' | 'list') || 'board')
  const [showQuickSearch, setShowQuickSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showOwnerUnlock, setShowOwnerUnlock] = useState(false)
  const [ownerUnlockError, setOwnerUnlockError] = useState<string | null>(null)

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
  const ownerRefreshRef = useRef(false)

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
  const rootTitleArea = viewMode === 'list'
    ? 'Listing'
    : viewMode === 'documents'
      ? 'Documents'
      : 'Board'
  const rootPageTitle = projectCode
    ? formatRootViewPageTitle(projectCode, rootTitleArea)
    : null

  usePageTitle(rootPageTitle, PageTitlePriority.ROOT_VIEW)

  const handleSortPreferencesChange = (newPreferences: SortPreferences) => {
    setLocalSortPreferences(newPreferences)
    setSortPreferences(newPreferences)
  }

  const handleAddProject = () => {
    if (!canManageProjects)
      return

    setShowAddProjectModal(true)
  }

  const handleEditProject = () => {
    if (!canManageProjects)
      return

    setShowEditProjectModal(true)
  }

  const handleUnlock = async (token: string) => {
    setUnlockError(null)
    await unlock(token)
  }

  const handleLock = async () => {
    setShowAddProjectModal(false)
    setShowEditProjectModal(false)
    setShowSettings(false)
    await lock()
  }

  const handleUnlockClick = () => {
    if (accessMode === 'read-only') {
      setOwnerUnlockError(null)
      setShowOwnerUnlock(true)
      return
    }

    const tokenInput = document.querySelector<HTMLInputElement>('[data-testid="auth-token-input"]')
    if (tokenInput) {
      tokenInput.focus()
      return
    }

    markLocked()
  }

  const handleOwnerUnlock = async (token: string) => {
    setOwnerUnlockError(null)
    try {
      const response = await authFetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        setOwnerUnlockError('Owner token was not accepted.')
        return
      }

      markOwnerAdmin()
      syncSSEAccessMode('owner-admin', { forceReconnect: true })
      setShowOwnerUnlock(false)
    }
    catch {
      setOwnerUnlockError('Owner token was not accepted.')
    }
  }

  useEffect(() => {
    if (accessMode !== 'owner-admin') {
      ownerRefreshRef.current = false
      return
    }

    if (ownerRefreshRef.current)
      return

    ownerRefreshRef.current = true
    setAuthRefreshInFlight(true)
    refreshProjects()
      .catch((err) => {
        console.error('Failed to refresh projects after unlock:', err)
      })
      .finally(() => setAuthRefreshInFlight(false))
  }, [accessMode, refreshProjects])

  useEffect(() => {
    if (accessMode === 'locked' && sessionStatus === 'error') {
      setUnlockError('Token was not accepted.')
      return
    }

    if (sessionStatus !== 'error') {
      setUnlockError(null)
    }
  }, [accessMode, sessionStatus])

  // Handle project selection and validation
  useEffect(() => {
    if (projectsLoading || authRefreshInFlight || accessMode === 'unknown' || accessMode === 'locked' || accessMode === 'backend-down') {
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
  }, [accessMode, authRefreshInFlight, projectCode, projects, projectsLoading, selectedProject, setSelectedProject])

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
        setTicketError(null)
      }
      else if (!projectsLoading && selectedProject) {
        // Ticket not found — set inline error, don't block the entire page
        setSelectedTicketRef.current(null)
        setTicketError(`Ticket '${ticketMatch[1]}' not found`)
      }
    }
    else {
      setSelectedTicketRef.current(null)
      setTicketError(null)
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

  const handleTicketClick = (ticket: Ticket, targetProjectCode?: string) => {
    const ticketProject = targetProjectCode || projectCode
    const viewParam = viewMode !== 'board' ? `?view=${viewMode}` : ''
    navigate(`/prj/${ticketProject}/ticket/${ticket.code}${viewParam}`)
  }

  const handleTicketClose = () => {
    const viewContext = searchParams.get('view') || 'board'
    const basePath = `/prj/${projectCode}`
    const targetPath = viewContext === 'board' ? basePath : `${basePath}/${viewContext}`
    navigate(targetPath)
  }

  if (projectsLoading || authRefreshInFlight || accessMode === 'unknown') {
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
              {(accessMode === 'read-only' || selectedProject?.project.path === '') && (
                <span data-testid="sharing-readonly-badge" className="mr-2 rounded-full border border-border px-2 py-1 text-xs">
                  Read only
                </span>
              )}
              <AuthStatusAction
                accessMode={accessMode}
                onLock={handleLock}
                onUnlockClick={handleUnlockClick}
              />
              <SecondaryHeader
                viewMode={viewMode}
                sortPreferences={(viewMode === 'board' || viewMode === 'list') ? localSortPreferences : undefined}
                onSortPreferencesChange={(viewMode === 'board' || viewMode === 'list') ? handleSortPreferencesChange : undefined}
                onAddProject={handleAddProject}
                onEditProject={handleEditProject}
                selectedProject={selectedProject}
                onOpenSettings={() => setShowSettings(true)}
                onUnlockOwnerAccess={accessMode === 'read-only' ? handleUnlockClick : undefined}
                canManageProjects={canManageProjects}
                canManageSharing={canManageSharing}
                canUseOwnerEndpoints={canUseOwnerEndpoints}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        {accessMode === 'locked'
          ? (
              <div className="flex h-full items-center justify-center p-6">
                <AuthUnlockPanel
                  error={unlockError}
                  unlocking={sessionStatus === 'unlocking'}
                  onUnlock={handleUnlock}
                />
              </div>
            )
          : (
              <ProjectView
                onTicketClick={handleTicketClick}
                selectedProject={selectedProject}
                tickets={tickets}
                viewMode={viewMode}
                sortPreferences={(viewMode === 'board' || viewMode === 'list') ? localSortPreferences : undefined}
                canWrite={canWriteTickets}
              />
            )}
      </div>

      <TicketViewer
        ticket={selectedTicket}
        isOpen={!!selectedTicket || !!ticketError}
        ticketError={ticketError}
        onClose={handleTicketClose}
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

      <Modal
        isOpen={showOwnerUnlock && accessMode === 'read-only'}
        onClose={() => setShowOwnerUnlock(false)}
        size="sm"
        data-testid="sharing-owner-unlock-dialog"
      >
        <ModalBody>
          <AuthUnlockPanel
            title="Unlock access"
            description="Enter an owner token to manage projects. Your read-only session stays available if the token is not accepted."
            error={ownerUnlockError}
            errorTestId="sharing-owner-unlock-error"
            panelTestId="sharing-owner-unlock-panel"
            onUnlock={handleOwnerUnlock}
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
        />
      )}

      <QuickSearchModal
        isOpen={showQuickSearch}
        onClose={() => setShowQuickSearch(false)}
        tickets={tickets}
        onSelectTicket={handleTicketClick}
        currentProjectCode={projectCode}
        projects={projects}
      />

      <Toaster />
    </div>
  )
}

function ShareRouteHandler() {
  const { shareId } = useParams<{ shareId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { markReadOnly, markBackendDown } = useAuthSession()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function exchangeShareSession(): Promise<void> {
      if (!shareId) {
        setError('Invalid share link')
        return
      }

      if (searchParams.has('code')) {
        window.history.replaceState(null, '', `/share/${encodeURIComponent(shareId)}`)
      }

      try {
        const response = await authFetch(`/api/share/${encodeURIComponent(shareId)}/session`, { method: 'POST' })

        if (cancelled) {
          return
        }

        if (!response.ok) {
          if (isBackendDownResponse(response)) {
            markBackendDown()
            return
          }

          setError(response.status === 404 ? 'Share link not found' : 'Share link could not be opened')
          return
        }

        const data = await response.json() as { project?: { id?: string, project?: { code?: string } } }
        const projectCode = data.project?.project?.code || data.project?.id

        if (!projectCode) {
          setError('Share link returned no project')
          return
        }

        markReadOnly()
        syncSSEAccessMode('read-only', { forceReconnect: true })
        navigate(`/prj/${projectCode}`, { replace: true })
      }
      catch (err) {
        if (cancelled) {
          return
        }

        if (isBackendDownError(err)) {
          markBackendDown()
          return
        }

        setError('Share link could not be opened')
      }
    }

    void exchangeShareSession()

    return () => {
      cancelled = true
    }
  }, [markBackendDown, markReadOnly, navigate, searchParams, shareId])

  if (error) {
    return <RouteErrorModal error={error} />
  }

  return (
    <div data-testid="share-loading" className="min-h-[100dvh] bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

function InviteRouteHandler() {
  const { code: pathCode } = useParams<{ code: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { markReadOnly, markBackendDown } = useAuthSession()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function exchangeInviteSession(): Promise<void> {
      const code = searchParams.get('code') || pathCode
      if (!code) {
        setError('Invite link was not accepted')
        return
      }

      try {
        const response = await exchangeInviteCode(code)

        if (cancelled) {
          return
        }

        if (!response.ok) {
          if (response.backendDown) {
            markBackendDown()
            return
          }

          window.history.replaceState(null, '', '/invite/error')
          setError(`Invite link was not accepted (${response.status})`)
          return
        }

        const projectCode = response.projectRefs[0]
        if (!projectCode) {
          setError('Invite link returned no project')
          return
        }

        markReadOnly()
        syncSSEAccessMode('read-only', { forceReconnect: true })
        navigate(`/prj/${projectCode}`, { replace: true })
      }
      catch (err) {
        if (cancelled) {
          return
        }

        if (isBackendDownError(err)) {
          markBackendDown()
          return
        }

        setError('Invite link was not accepted')
      }
    }

    void exchangeInviteSession()

    return () => {
      cancelled = true
    }
  }, [markBackendDown, markReadOnly, navigate, pathCode, searchParams])

  if (error) {
    return (
      <div data-testid="sharing-invite-error" className="min-h-[100dvh] bg-background flex items-center justify-center p-6 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div data-testid="invite-loading" className="min-h-[100dvh] bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

function exchangeInviteCode(code: string): Promise<InviteExchangeResult> {
  const existingExchange = inviteExchangeCache.get(code)
  if (existingExchange) {
    return existingExchange
  }

  const exchange = authFetch(`/api/read-tokens/invites/${encodeURIComponent(code)}/session`, { method: 'POST' })
    .then(async (response): Promise<InviteExchangeResult> => {
      if (!response.ok) {
        inviteExchangeCache.delete(code)
        return {
          ok: false,
          status: response.status,
          backendDown: isBackendDownResponse(response),
          projectRefs: [],
        }
      }

      const data = await response.json() as { projectRefs?: string[] }
      return {
        ok: true,
        status: response.status,
        backendDown: false,
        projectRefs: data.projectRefs ?? [],
      }
    })
    .catch((error): InviteExchangeResult => {
      inviteExchangeCache.delete(code)
      return {
        ok: false,
        status: 0,
        backendDown: isBackendDownError(error),
        projectRefs: [],
      }
    })

  inviteExchangeCache.set(code, exchange)
  return exchange
}

function App() {
  return (
    <AuthSessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RedirectToCurrentProject />} />
          <Route path="/share/:shareId" element={<ShareRouteHandler />} />
          <Route path="/invite/:code" element={<InviteRouteHandler />} />
          <Route path="/:ticketKey" element={<DirectTicketAccess />} />
          <Route path="/prj/:projectCode" element={<ProjectRouteHandler />} />
          <Route path="/prj/:projectCode/list" element={<ProjectRouteHandler />} />
          <Route path="/prj/:projectCode/documents" element={<ProjectRouteHandler />} />
          {/* MDT-150: Path-style document routes for SmartLink resolution */}
          <Route path="/prj/:projectCode/documents/*" element={<ProjectRouteHandler />} />
          {/* MDT-094: Unified route for tickets with optional sub-document path */}
          <Route path="/prj/:projectCode/ticket/:ticketKey/*" element={<ProjectRouteHandler />} />
          <Route path="/prj/:projectCode/ticket/:ticketKey" element={<ProjectRouteHandler />} />
          <Route path="/ticket/:ticketKey" element={<DirectTicketAccess />} />
          {/* MDT-094: Direct ticket access with sub-document path */}
          <Route path="/ticket/:ticketKey/*" element={<DirectTicketAccess />} />
          <Route path="*" element={<RouteErrorModal error="Page not found" />} />
        </Routes>
      </BrowserRouter>
    </AuthSessionProvider>
  )
}

export default App
