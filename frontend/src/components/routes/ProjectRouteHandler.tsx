import type { SortPreferences } from '../../config/sorting'
import { useCallback, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { useAuthSession } from '../../auth/AuthSessionContext'
import { BoardLayoutMode } from '../../config/boardLayoutMode'
import { getSortPreferences, setSortPreferences } from '../../config/sorting'
import { useBoardFilters } from '../../hooks/useBoardFilters'
import { useGlobalKeyboard } from '../../hooks/useGlobalKeyboard'
import {
  formatRootViewPageTitle,
  PageTitlePriority,
  usePageTitle,
} from '../../hooks/usePageTitle'
import { usePinRailPref } from '../../hooks/usePinRailPref'
import { usePins } from '../../hooks/usePins'
import { useProjectManager } from '../../hooks/useProjectManager'
import { buildTicketPath } from '../../routes'
import { countActiveFilters } from '../../utils/ticketFilters'
import { MobileLogo } from '../AppHeader'
import { AuthStatusAction } from '../AuthUnlock/AuthStatusAction'
import { AuthUnlockPanel } from '../AuthUnlock/AuthUnlockPanel'
import { BoardFilterBar } from '../BoardFilterBar'
import { useEventHistoryState } from '../DevTools/useEventHistoryState'
import { Header, HeaderContent } from '../Header'
import { PinRail } from '../PinRail'
import { PinRailToggle } from '../PinRail/PinRailToggle'
import { ProjectSelector } from '../ProjectSelector'
import ProjectView from '../ProjectView'
import { RouteErrorModal } from '../RouteErrorModal'
import { SecondaryHeader } from '../SecondaryHeader'
import { ViewModeSwitcher } from '../ViewModeSwitcher'
import { useAuthGate } from './hooks/useAuthGate'
import { useProjectRouteValidation } from './hooks/useProjectRouteValidation'
import { useTicketModalRoute } from './hooks/useTicketModalRoute'
import { useViewModeRouting } from './hooks/useViewModeRouting'
import { ProjectOverlays } from './ProjectOverlays'
import { deriveViewMode } from './viewModeDerivation'

export function ProjectRouteHandler() {
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

  // MDT-196: Board filter state lifted to App so the filter controls can render
  // inline in the app header's single row (no second line). Board consumes the
  // filtered tickets via props.
  const {
    filters: boardFilters,
    filteredTickets: boardFilteredTickets,
    facetOptions: boardFacetOptions,
    toggleFilter: toggleBoardFilter,
    setQuery: setBoardFilterQuery,
    clearAll: clearBoardFilters,
  } = useBoardFilters(tickets)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const {
    accessMode,
    accessIndicator,
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

  // MDT-197: pin rail state. canWriteTickets gates mutations (read-only blocks
  // pin/unpin). Pin metadata (title/status) is resolved from the current
  // project's tickets; cross-project pins resolve when their project is viewed.
  const pins = usePins(canWriteTickets)
  const pinRailPref = usePinRailPref()
  const resolvePinMetadata = useCallback(
    (pin: { projectCode: string, ticketCode: string }) => {
      if (!projectCode || pin.projectCode !== projectCode) {
        return null
      }
      const ticket = tickets.find(t => t.code === pin.ticketCode)
      if (!ticket) {
        return null
      }
      return { title: ticket.title, status: ticket.status, priority: ticket.priority }
    },
    [projectCode, tickets],
  )
  const handlePinOpen = useCallback(
    (pin: { projectCode: string, ticketCode: string }) => {
      // Open the ticket in its owning project. handleTicketClick takes the
      // project code as the second arg; the ticket object is reconstructed
      // minimally (only code/title/status are needed for the viewer route).
      const targetProject = pin.projectCode
      const code = pin.ticketCode.slice(pin.projectCode.length + 1)
      const fullCode = `${pin.projectCode}-${code}`
      navigate(`${buildTicketPath(targetProject, fullCode)}`)
    },
    [navigate],
  )

  const [eventHistoryOpen, eventHistoryForceHidden, setEventHistoryState]
    = useEventHistoryState()
  const [localSortPreferences, setLocalSortPreferences]
    = useState<SortPreferences>(getSortPreferences)
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showQuickSearch, setShowQuickSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Global keyboard shortcuts
  useGlobalKeyboard({
    onQuickSearch: () => setShowQuickSearch(true),
  })

  // MDT-206: derive board layout from the URL so /epics is a deep-linkable route.
  // When the URL carries /epics, the layout is swimlanes; the bare board path falls
  // back to the persisted preference. Derived at render time (no effect) to avoid
  // racing the flat-toggle's setBoardLayoutMode(FLAT) before navigation completes.
  // (3b: viewMode/onEpicsRoute are pure and stay here; effectiveBoardLayoutMode
  // is computed after the useViewModeRouting call — it reads the hook's
  // boardLayoutMode — preserving the pinned effect order, INV-6.)
  const viewMode = deriveViewMode(location.pathname, searchParams.get('view'))
  const onEpicsRoute = location.pathname.includes('/epics')
  const rootTitleArea
    = viewMode === 'list'
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

  // Auth gate (3d: effects 1–2, the refresh-once guard, the owner-unlock
  // modal state, and all four unlock/lock handlers own useAuthGate — called
  // exactly where effects 1–2 sat, FIRST of the route hooks, INV-6).
  // onBeforeLock preserves the original close-modals-then-lock ordering.
  const {
    unlockError,
    ownerUnlockError,
    showOwnerUnlock,
    setShowOwnerUnlock,
    authRefreshInFlight,
    handleUnlock,
    handleLock,
    handleUnlockClick,
    handleOwnerUnlock,
  } = useAuthGate({
    accessMode,
    sessionStatus,
    unlock,
    lock,
    markLocked,
    markOwnerAdmin,
    refreshProjects,
    onBeforeLock: () => {
      setShowAddProjectModal(false)
      setShowEditProjectModal(false)
      setShowSettings(false)
    },
  })

  // Handle project selection and validation (3a: effect + error state own
  // useProjectRouteValidation; called exactly where the effect sat — after the
  // auth-gate effects, before the view-mode redirect effect).
  const { error } = useProjectRouteValidation({
    projects,
    selectedProject,
    projectsLoading,
    authRefreshInFlight,
    accessMode,
    projectCode,
    markLocked,
    setSelectedProject,
  })

  // Default-view redirect + board-layout persistence (3b: effect and switch
  // handler own useViewModeRouting; called exactly where the redirect effect
  // sat — after useProjectRouteValidation, before the ticket-from-URL effect).
  const { boardLayoutMode, handleViewModeChange } = useViewModeRouting({
    projectCode,
    pathname: location.pathname,
    navigate,
  })
  const effectiveBoardLayoutMode = onEpicsRoute
    ? BoardLayoutMode.SWIMLANES
    : boardLayoutMode

  // Ticket modal from URL + open/close navigation (3c: effect, state, and
  // handlers own useTicketModalRoute; called exactly where the effect sat —
  // last of the five route effects, INV-6).
  const {
    selectedTicket,
    ticketError,
    handleTicketClick,
    handleTicketClose,
  } = useTicketModalRoute({
    pathname: location.pathname,
    tickets,
    projectsLoading,
    selectedProject,
    projectCode,
    viewParam: searchParams.get('view'),
    viewMode,
    navigate,
  })

  if (projectsLoading || authRefreshInFlight || accessMode === 'unknown') {
    return (
      <div
        data-testid="loading"
        className="min-h-[100dvh] bg-background flex items-center justify-center"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <RouteErrorModal
        title={
          error.includes('current access') ? 'Project Not Available' : undefined
        }
        error={error}
      />
    )
  }

  return (
    <div className="App h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Navigation Bar */}
      <Header>
        <HeaderContent
          leftSection={<MobileLogo />}
          centerSection={(
            <>
              <ViewModeSwitcher
                currentMode={
                  viewMode === 'board'
                    ? effectiveBoardLayoutMode === BoardLayoutMode.SWIMLANES ? 'swimlanes' : 'board'
                    : viewMode
                }
                onModeChange={handleViewModeChange}
              />
              {/* MDT-239: shrinkable (with min-w-0) — flex-shrink-0 here kept
                  the rail card at content width on narrow viewports, pushing
                  its title box over the hamburger button and intercepting
                  its clicks. The card title truncates instead. */}
              <div className="min-w-0 flex-shrink">
                <ProjectSelector />
              </div>
              {pinRailPref.enabled && (
                <PinRailToggle
                  pinned={pinRailPref.pinned}
                  onToggle={() => pinRailPref.setPinned(!pinRailPref.pinned)}
                />
              )}
              {(viewMode === 'board' || viewMode === 'list') && (
                <div className="hidden sm:flex flex-1 items-center justify-end min-w-0">
                  <BoardFilterBar
                    desktop
                    filters={boardFilters}
                    totalCount={tickets.length}
                    filteredCount={boardFilteredTickets.length}
                    facetOptions={boardFacetOptions}
                    onQueryChange={setBoardFilterQuery}
                    onToggle={toggleBoardFilter}
                    onRemove={(facet, value) => toggleBoardFilter(facet, value)}
                    onClearAll={clearBoardFilters}
                  />
                </div>
              )}
            </>
          )}
          rightSection={(
            <>
              <AuthStatusAction
                accessMode={accessMode}
                onUnlockClick={handleUnlockClick}
              />
              <SecondaryHeader
                viewMode={viewMode}
                sortPreferences={
                  viewMode === 'board' || viewMode === 'list'
                    ? localSortPreferences
                    : undefined
                }
                onSortPreferencesChange={
                  viewMode === 'board' || viewMode === 'list'
                    ? handleSortPreferencesChange
                    : undefined
                }
                onAddProject={handleAddProject}
                onEditProject={handleEditProject}
                selectedProject={selectedProject}
                onOpenSettings={() => setShowSettings(true)}
                onUnlockOwnerAccess={
                  accessMode === 'read-only' ? handleUnlockClick : undefined
                }
                onLock={handleLock}
                accessMode={accessMode}
                accessIndicator={accessIndicator}
                canManageProjects={canManageProjects}
                canManageSharing={canManageSharing}
                canUseOwnerEndpoints={canUseOwnerEndpoints}
                filterCount={countActiveFilters(boardFilters)}
                onOpenFilters={() => setMobileFilterOpen(true)}
              />
              {(viewMode === 'board' || viewMode === 'list') && (
                <div className="sm:hidden">
                  <BoardFilterBar
                    desktop={false}
                    filters={boardFilters}
                    totalCount={tickets.length}
                    filteredCount={boardFilteredTickets.length}
                    facetOptions={boardFacetOptions}
                    onQueryChange={setBoardFilterQuery}
                    onToggle={toggleBoardFilter}
                    onRemove={(facet, value) => toggleBoardFilter(facet, value)}
                    onClearAll={clearBoardFilters}
                    mobilePopoverOpen={mobileFilterOpen}
                    onMobilePopoverOpenChange={setMobileFilterOpen}
                  />
                </div>
              )}
            </>
          )}
        />
      </Header>

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
              <DndProvider backend={HTML5Backend}>
                <div className="relative flex h-full min-w-0">
                  <PinRail
                    pins={pins.pins}
                    canWrite={canWriteTickets}
                    enabled={pinRailPref.enabled}
                    pinned={pinRailPref.pinned}
                    currentProjectCode={projectCode ?? null}
                    resolveMetadata={resolvePinMetadata}
                    onPin={pins.addPin}
                    onUnpin={(pin) => { pins.removePin(pin.projectCode, pin.ticketCode) }}
                    onOpen={handlePinOpen}
                    onTogglePinned={() => pinRailPref.setPinned(!pinRailPref.pinned)}
                  />
                  <ProjectView
                    onTicketClick={handleTicketClick}
                    selectedProject={selectedProject}
                    tickets={tickets}
                    filteredTickets={boardFilteredTickets}
                    filters={boardFilters}
                    mobileFilters={boardFilters}
                    onRemoveMobileFilter={(facet, value) => toggleBoardFilter(facet, value)}
                    viewMode={viewMode}
                    boardLayoutMode={effectiveBoardLayoutMode}
                    sortPreferences={
                      viewMode === 'board' || viewMode === 'list'
                        ? localSortPreferences
                        : undefined
                    }
                    canWrite={canWriteTickets}
                  />
                </div>
              </DndProvider>
            )}
      </div>

      {/* Stage 4: overlay cluster moved verbatim to ProjectOverlays (props-only). */}
      <ProjectOverlays
        selectedTicket={selectedTicket}
        ticketError={ticketError}
        onTicketClose={handleTicketClose}
        projectConfig={projectConfig}
        canManageProjects={canManageProjects}
        showAddProjectModal={showAddProjectModal}
        setShowAddProjectModal={setShowAddProjectModal}
        showEditProjectModal={showEditProjectModal}
        setShowEditProjectModal={setShowEditProjectModal}
        refreshProjects={refreshProjects}
        selectedProject={selectedProject}
        eventHistoryOpen={eventHistoryOpen}
        eventHistoryForceHidden={eventHistoryForceHidden}
        setEventHistoryState={setEventHistoryState}
        accessMode={accessMode}
        showOwnerUnlock={showOwnerUnlock}
        setShowOwnerUnlock={setShowOwnerUnlock}
        ownerUnlockError={ownerUnlockError}
        onOwnerUnlock={handleOwnerUnlock}
        canManageSharing={canManageSharing}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        canUseOwnerEndpoints={canUseOwnerEndpoints}
        showQuickSearch={showQuickSearch}
        setShowQuickSearch={setShowQuickSearch}
        projects={projects}
        tickets={tickets}
        onTicketClick={handleTicketClick}
        navigate={navigate}
        projectCode={projectCode}
      />
    </div>
  )
}
