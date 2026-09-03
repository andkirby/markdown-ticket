import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthSessionProvider } from './auth/AuthSessionProvider'
import { DirectTicketAccess } from './components/DirectTicketAccess'
import { RedirectToCurrentProject } from './components/RedirectToCurrentProject'
import { RouteErrorModal } from './components/RouteErrorModal'
import { InviteRouteHandler } from './components/routes/InviteRouteHandler'
import { ProjectRouteHandler } from './components/routes/ProjectRouteHandler'
import { ShareRouteHandler } from './components/routes/ShareRouteHandler'
import { loadTicketKeyOptions } from './config/ticketKeyConfig'
import { useCardDensity } from './hooks/useCardDensity'
import {
  ROUTE_DIRECT_TICKET,
  ROUTE_DIRECT_TICKET_SUBDOC,
  ROUTE_PROJECT,
  ROUTE_PROJECT_DOCUMENTS,
  ROUTE_PROJECT_DOCUMENTS_WILDCARD,
  ROUTE_PROJECT_EPICS,
  ROUTE_PROJECT_LIST,
  ROUTE_TICKET,
  ROUTE_TICKET_SUBDOC,
} from './routes'
import './utils/cache' // Import cache utilities for development

function App() {
  useCardDensity()
  // MDT-244: one shared read of the ticket-key display options; defaults stand until it resolves.
  void loadTicketKeyOptions()
  return (
    <AuthSessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RedirectToCurrentProject />} />
          <Route path="/share/:shareId" element={<ShareRouteHandler />} />
          <Route path="/invite/:code" element={<InviteRouteHandler />} />
          <Route path="/:ticketKey" element={<DirectTicketAccess />} />
          <Route path={ROUTE_PROJECT} element={<ProjectRouteHandler />} />
          <Route path={ROUTE_PROJECT_LIST} element={<ProjectRouteHandler />} />
          <Route path={ROUTE_PROJECT_EPICS} element={<ProjectRouteHandler />} />
          <Route
            path={ROUTE_PROJECT_DOCUMENTS}
            element={<ProjectRouteHandler />}
          />
          {/* MDT-150: Path-style document routes for SmartLink resolution */}
          <Route
            path={ROUTE_PROJECT_DOCUMENTS_WILDCARD}
            element={<ProjectRouteHandler />}
          />
          {/* MDT-094: Unified route for tickets with optional sub-document path */}
          <Route path={ROUTE_TICKET_SUBDOC} element={<ProjectRouteHandler />} />
          <Route path={ROUTE_TICKET} element={<ProjectRouteHandler />} />
          <Route path={ROUTE_DIRECT_TICKET} element={<DirectTicketAccess />} />
          {/* MDT-094: Direct ticket access with sub-document path */}
          <Route
            path={ROUTE_DIRECT_TICKET_SUBDOC}
            element={<DirectTicketAccess />}
          />
          <Route
            path="*"
            element={<RouteErrorModal error="Page not found" />}
          />
        </Routes>
      </BrowserRouter>
    </AuthSessionProvider>
  )
}

export default App
