# Tailwind CSS Examples for md-ticket-board

This file provides practical examples of how to use the Tailwind CSS template with your existing md-ticket-board components.

## Component Examples

### 1. TicketCard Component

```tsx
// src/components/TicketCard.tsx
import React from 'react';
import { Ticket } from '../types';

interface TicketCardProps {
  ticket: Ticket;
  onMove: (newStatus: string) => void;
  onEdit: () => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onMove, onEdit }) => {
  return (
    <div className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="card-title text-lg font-semibold">{ticket.title}</h3>
          <span className="badge badge-primary">{ticket.code}</span>
        </div>
        
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-sm text-gray-600">{ticket.type}</span>
          <span className="text-sm text-gray-400">•</span>
          <span className="text-sm text-gray-600">{ticket.priority}</span>
        </div>
        
        <div className="mb-3">
          <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
            {ticket.status}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <button 
            onClick={() => onEdit()}
            className="btn btn-sm btn-outline"
          >
            Edit
          </button>
          <div className="text-xs text-gray-500">
            {ticket.dateCreated.toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Proposed': return 'badge-secondary';
    case 'Approved': return 'badge-success';
    case 'In Progress': return 'badge-primary';
    case 'Implemented': return 'badge-success';
    case 'On Hold': return 'badge-warning';
    case 'Rejected': return 'badge-error';
    default: return 'badge-secondary';
  }
}

export default TicketCard;
```

### 2. Column Component

```tsx
// src/components/Column.tsx
import React from 'react';
import { Ticket, Status } from '../types';
import { useDrag, useDrop } from 'react-dnd';
import { TicketCard } from './TicketCard';

interface ColumnProps {
  column: {
    label: string;
    status: Status;
    color: string;
  };
  tickets: Ticket[];
  onDrop: (status: Status, ticket: Ticket) => void;
  onTicketEdit: (ticket: Ticket) => void;
}

interface TicketItem {
  ticket: Ticket;
  index: number;
}

const DraggableTicketCard: React.FC<{ item: TicketItem }> = ({ item }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ticket',
    item: { ticket: item.ticket, index: item.index },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <TicketCard 
        ticket={item.ticket} 
        onMove={() => {}} 
        onEdit={() => {}} 
      />
    </div>
  );
};

const Column: React.FC<ColumnProps> = ({ column, tickets, onDrop, onTicketEdit }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ticket',
    drop: (item: TicketItem) => {
      console.log('Dropped ticket:', item.ticket, 'on column:', column.status);
      onDrop(column.status, item.ticket);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div 
      ref={drop}
      className={`card ${isOver ? 'ring-2 ring-blue-500' : ''}`}
    >
      <div className="card-header">
        <h2 className="card-title text-lg font-semibold">{column.label}</h2>
        <span className="badge badge-outline">{tickets.length}</span>
      </div>
      
      <div className="card-body p-4 space-y-3 min-h-[400px]">
        {tickets.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No tickets in this column</p>
          </div>
        ) : (
          tickets.map((ticket, index) => (
            <DraggableTicketCard 
              key={ticket.code} 
              item={{ ticket, index }} 
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Column;
```

### 3. Board Component

```tsx
// src/components/Board.tsx
import React from 'react';
import { Ticket, Status } from '../types';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Column from './Column';
import { Button } from './UI/index';

interface BoardProps {
  onTicketClick: (ticket: Ticket) => void;
}

const BoardContent: React.FC<BoardProps> = ({ onTicketClick }) => {
  // Mock data - replace with your actual data
  const tickets: Ticket[] = [
    {
      code: 'CR-001',
      title: 'Implement user authentication',
      status: 'In Progress',
      dateCreated: new Date(),
      type: 'Feature Enhancement',
      priority: 'High',
      phaseEpic: 'Phase A (Foundation)',
      filePath: '',
      lastModified: new Date(),
      content: ''
    }
  ];

  const handleDrop = async (status: Status, ticket: Ticket) => {
    console.log('Board: handleDrop called with:', { status, ticketCode: ticket.code });
    // Implement your ticket moving logic here
  };

  const handleTicketEdit = (ticket: Ticket) => {
    onTicketClick(ticket);
  };

  // Mock column configuration
  const columns = [
    { label: 'Proposed', status: 'Proposed' as Status, color: 'gray' },
    { label: 'Approved', status: 'Approved' as Status, color: 'green' },
    { label: 'In Progress', status: 'In Progress' as Status, color: 'blue' },
    { label: 'Implemented', status: 'Implemented' as Status, color: 'teal' },
  ];

  // Group tickets by column
  const ticketsByColumn = columns.reduce((acc, column) => {
    acc[column.label] = tickets.filter(ticket => ticket.status === column.status);
    return acc;
  }, {} as Record<string, Ticket[]>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Change Request Board</h1>
          <p className="text-sm text-gray-600 font-normal">Track and manage your change requests</p>
        </div>
        <div className="flex space-x-4">
          <Button className="btn btn-secondary">Refresh</Button>
          <Button className="btn btn-primary">Add Ticket</Button>
        </div>
      </div>

      {/* Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full overflow-x-auto">
        {columns.map((column) => (
          <Column
            key={column.label}
            column={column}
            tickets={ticketsByColumn[column.label] || []}
            onDrop={handleDrop}
            onTicketEdit={handleTicketEdit}
          />
        ))}
      </div>
    </div>
  );
};

const Board: React.FC<BoardProps> = ({ onTicketClick }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <BoardContent onTicketClick={onTicketClick} />
    </DndProvider>
  );
};

export default Board;
```

### 4. Modal Component

```tsx
// src/components/Modal.tsx
import React from 'react';
import { Button } from './UI/index';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title text-lg font-semibold">{title}</h3>
          <Button 
            onClick={onClose}
            className="btn btn-sm btn-outline"
          >
            Close
          </Button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
```

### 5. Form Components

```tsx
// src/components/Form.tsx
import React from 'react';
import { Button } from './UI/index';

interface FormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  title: string;
  children: React.ReactNode;
}

const Form: React.FC<FormProps> = ({ onSubmit, onCancel, title, children }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title text-lg font-semibold">{title}</h2>
        </div>
        <div className="card-body">
          {children}
        </div>
        <div className="card-footer">
          <div className="flex justify-end space-x-3">
            <Button 
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="btn btn-primary"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

// Form Field Component
interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  error?: string;
}

const FormField: React.FC<FormFieldProps> = ({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  required = false,
  error 
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className={`label ${required ? 'label-required' : ''}`}>
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={`input ${error ? 'input-error' : ''}`}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export { Form, FormField };
```

## Usage Examples

### 1. Basic Button Usage

```tsx
import { Button } from './components/UI/index';

function MyComponent() {
  return (
    <div className="space-x-4">
      <Button className="btn btn-primary">Primary</Button>
      <Button className="btn btn-secondary">Secondary</Button>
      <Button className="btn btn-outline">Outline</Button>
      <Button className="btn btn-danger">Danger</Button>
    </div>
  );
}
```

### 2. Card Layout

```tsx
import { Card } from './components/UI/index';

function MyComponent() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <div className="card-header">
          <h3 className="card-title">Card Title</h3>
        </div>
        <div className="card-body">
          <p className="card-description">Card description goes here</p>
        </div>
        <div className="card-footer">
          <Button className="btn btn-primary">Action</Button>
        </div>
      </Card>
    </div>
  );
}
```

### 3. Responsive Grid

```tsx
function ResponsiveGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Grid items */}
    </div>
  );
}
```

### 4. Dark Mode Toggle

```tsx
import { useState, useEffect } from 'react';

function DarkModeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <button
      onClick={() => setIsDarkMode(!isDarkMode)}
      className="btn btn-outline"
    >
      {isDarkMode ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
```

## Integration Tips

1. **Replace existing CSS** with Tailwind utility classes
2. **Use semantic HTML** elements with appropriate styling
3. **Leverage responsive prefixes** for mobile-first design
4. **Implement dark mode** for better accessibility
5. **Test on multiple devices** to ensure responsive behavior

## Performance Considerations

1. **Use JIT compilation** - Tailwind CSS v3 includes Just-In-Time compilation
2. **Minimize custom CSS** - Use utility classes when possible
3. **Tree-shaking** - Only used classes are included in the final CSS
4. **Optimize images** - Use appropriate formats and sizes

This template provides a solid foundation for building modern, responsive, and accessible UI components for your md-ticket-board application.