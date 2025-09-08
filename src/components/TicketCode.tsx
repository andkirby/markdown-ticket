import React from 'react';

interface TicketCodeProps {
  code: string;
  className?: string;
}

export const TicketCode: React.FC<TicketCodeProps> = ({ code, className = '' }) => {
  return (
    <span className={`font-medium text-primary dark:text-blue-400 ${className}`}>
      {code}
    </span>
  );
};
