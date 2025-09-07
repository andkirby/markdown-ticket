import React from 'react';
import { Button } from './UI/index';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestModal: React.FC<TestModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      padding: '0',
      zIndex: 999999
    }}>
      <div 
        style={{
          width: '148px', // 100px + 24px padding on each side
          height: '148px',
          backgroundColor: 'red',
          cursor: 'crosshair',
          padding: '24px', // Move padding here
          boxSizing: 'border-box'
        }}
        onClick={() => console.log('Square clicked!')}
      >
        Click anywhere
      </div>
    </div>
  );
};
