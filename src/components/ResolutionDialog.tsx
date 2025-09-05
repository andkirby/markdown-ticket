import React from 'react';
import { Status } from '../types';
import { getStatusLabel, getStatusDescription, getStatusColor } from '../config/statusConfig';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './UI/Modal';
import { Button } from './UI/Button';

interface ResolutionDialogProps {
  isOpen: boolean;
  ticketCode: string;
  ticketTitle: string;
  availableStatuses: Status[];
  onResolve: (status: Status) => void;
  onCancel: () => void;
}

export const ResolutionDialog: React.FC<ResolutionDialogProps> = ({
  isOpen,
  ticketCode,
  ticketTitle,
  availableStatuses,
  onResolve,
  onCancel,
}) => {
  const handleStatusClick = (status: Status) => {
    onResolve(status);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
    >
      <ModalHeader
        title="Choose Resolution Status"
        onClose={onCancel}
      />
      
      <ModalBody>
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>
              <strong className="text-gray-900 dark:text-white">{ticketCode}</strong>: {ticketTitle}
            </p>
            <p className="mt-2 text-gray-700 dark:text-gray-200">
              How would you like to mark this ticket as complete?
            </p>
          </div>

          <div className="space-y-3">
            {availableStatuses.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusClick(status)}
                className={`
                  w-full p-4 rounded-lg border-2 text-left transition-all
                  hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div 
                        className={`
                          w-4 h-4 rounded-full
                          ${getStatusColor(status) === 'teal' ? 'bg-teal-500' : ''}
                          ${getStatusColor(status) === 'indigo' ? 'bg-indigo-500' : ''}
                        `}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {getStatusDescription(status)}
                    </p>
                  </div>
                  <div className="ml-4">
                    <svg 
                      className="w-5 h-5 text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 5l7 7-7 7" 
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};