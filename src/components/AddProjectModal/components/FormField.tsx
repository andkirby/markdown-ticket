import React, { useState } from 'react';
import { HelpCircle, FolderOpen, Folder, Check, CircleX } from 'lucide-react';
import { Button } from '../../ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import FolderBrowserModal from './FolderBrowserModal';

export interface FormFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  type?: 'text' | 'textarea' | 'url';
  tooltip?: string;
  className?: string;
  children?: React.ReactNode;
  showFolderBrowser?: boolean;
  onFolderSelect?: (path: string) => void;
  showSuccessIndicator?: boolean;
  containerClassName?: string;
  pathExists?: boolean;
  showPathStatus?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  readOnly = false,
  type = 'text',
  tooltip,
  className = '',
  children,
  showFolderBrowser = false,
  onFolderSelect,
  showSuccessIndicator = false,
  containerClassName = '',
  pathExists = false,
  showPathStatus = false
}) => {
  const inputId = label ? label.toLowerCase().replace(/\s+/g, '-') : `field-${Math.random().toString(36).substr(2, 9)}`;
  const [showFolderModal, setShowFolderModal] = useState(false);

  const handleFolderBrowse = () => {
    setShowFolderModal(true);
  };

  const handleFolderSelected = (selectedPath: string) => {
    if (onFolderSelect) {
      onFolderSelect(selectedPath);
    } else {
      onChange(selectedPath);
    }
  };

  const baseInputClasses = `
    px-3 py-2 border rounded-md
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' :
      showPathStatus ? (pathExists ? 'border-green-500 focus:ring-green-500 focus:border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50 dark:bg-red-900/20') :
      showSuccessIndicator ? 'border-green-500 focus:ring-green-500 focus:border-green-500 bg-green-50 dark:bg-green-900/20' :
      'border-gray-300 dark:border-gray-600'}
    ${readOnly ? 'bg-gray-50 dark:bg-gray-700 cursor-not-allowed' :
      showPathStatus ? (pathExists ? 'bg-green-50 dark:bg-green-900/20 text-gray-900 dark:text-white' : 'bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white') :
      showSuccessIndicator ? 'bg-green-50 dark:bg-green-900/20 text-gray-900 dark:text-white' : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white'}
    ${showFolderBrowser ? 'flex-1' : 'w-full'}
    ${className}
  `;

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={baseInputClasses}
          rows={3}
        />
      );
    }

    return (
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={baseInputClasses}
      />
    );
  };

  return (
    <div className="mb-4">
      {label && label.trim() && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {tooltip && (
            <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle
                  className="inline-block w-4 h-4 ml-1 text-gray-400 cursor-help"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm max-w-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </label>
      )}

      {children ? (
        <div className={`relative ${containerClassName}`}>
          {children}
        </div>
      ) : (
        <div className={`relative ${showFolderBrowser ? 'flex gap-2' : ''} ${containerClassName}`}>
          <div className={`${showFolderBrowser ? 'flex-1' : 'w-full'} relative`}>
            {renderInput()}
            {showPathStatus && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {pathExists ? (
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <CircleX className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
            )}
            {showSuccessIndicator && !showPathStatus && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            )}
          </div>
          {showFolderBrowser && !readOnly && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFolderBrowse}
                    disabled={disabled}
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    <Folder className="h-4 w-4" />
                    Browse
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Browse for folder</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Folder Browser Modal */}
      {showFolderBrowser && (
        <FolderBrowserModal
          isOpen={showFolderModal}
          onClose={() => setShowFolderModal(false)}
          onFolderSelected={handleFolderSelected}
          initialPath={typeof value === 'string' ? value : ''}
          title={`Select ${label.toLowerCase().replace(/\*\s*/, '')} Folder`}
        />
      )}
    </div>
  );
};