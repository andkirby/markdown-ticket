import React from 'react';
import Board from './components/Board';
import { Ticket } from './types';
import { useTicketData } from './hooks/useTicketData';

function App() {
  const { tickets, loading, error } = useTicketData({
    autoRefresh: true,
    pollingInterval: 5000,
    enableFileWatcher: true
  });

  // Handle loading and error states
  if (loading) {
    return (
      <div className="App" style={{
        minHeight: '100vh',
        backgroundColor: '#f7fafc',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div>Loading tickets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App" style={{
        minHeight: '100vh',
        backgroundColor: '#f7fafc',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
      }}>
        <div>Error loading tickets: {error.message}</div>
      </div>
    );
  }

  const handleTicketClick = (ticket: Ticket) => {
    // In a real application, this would open a modal or navigate to a detail page
    console.log('Ticket clicked:', ticket);
    alert(`Editing ticket: ${ticket.code}\n\nThis would open an edit form in a real application.`);
  };

  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f7fafc' }}>
      <Board onTicketClick={handleTicketClick} />
    </div>
  );
}

export default App;