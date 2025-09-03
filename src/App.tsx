import React, { useState } from 'react';
import Board from './components/Board';
import MultiProjectDashboard from './components/MultiProjectDashboard';
import TicketViewer from './components/TicketViewer';
import { Ticket } from './types';

type ViewMode = 'single-project' | 'multi-project';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('single-project');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsViewerOpen(true);
  };

  const handleViewerClose = () => {
    setIsViewerOpen(false);
    setSelectedTicket(null);
  };

  // If we're in multi-project mode, skip loading/error states from single project
  if (viewMode === 'multi-project') {
    return (
      <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f7fafc' }}>
        {/* Navigation Bar */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <div className="flex-shrink-0">
                  <img src="/logo.jpeg" alt="Logo" className="w-auto" style={{ height: '3.8rem' }} />
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setViewMode('single-project')}
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                  >
                    Single Project
                  </button>
                  <button
                    onClick={() => setViewMode('multi-project')}
                    className="px-3 py-2 text-sm font-medium bg-blue-100 text-blue-800 rounded-md"
                  >
                    Multi Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <MultiProjectDashboard />
        <TicketViewer 
          ticket={selectedTicket} 
          isOpen={isViewerOpen} 
          onClose={handleViewerClose} 
        />
      </div>
    );
  }

  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f7fafc' }}>
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                <img src="/logo.jpeg" alt="Logo" className="w-auto" style={{ height: '3.8rem' }} />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setViewMode('single-project')}
                  className="px-3 py-2 text-sm font-medium bg-blue-100 text-blue-800 rounded-md"
                >
                  Single Project
                </button>
                <button
                  onClick={() => setViewMode('multi-project')}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                >
                  Multi Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <Board onTicketClick={handleTicketClick} enableProjectSwitching={true} />
      <TicketViewer 
        ticket={selectedTicket} 
        isOpen={isViewerOpen} 
        onClose={handleViewerClose} 
      />
    </div>
  );
}

export default App;