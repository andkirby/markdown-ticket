import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const selectVariants = cva(
  'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: '',
        outline: '',
        filled: 'bg-gray-50 border-gray-200',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
      state: {
        default: '',
        error: 'border-error-500 focus-visible:ring-error-500',
        success: 'border-success-500 focus-visible:ring-success-500',
        warning: 'border-warning-500 focus-visible:ring-warning-500',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'default',
    },
  }
);

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  loading?: boolean;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({
    className,
    variant,
    size,
    state,
    options,
    placeholder,
    searchable = false,
    clearable = false,
    loading = false,
    error,
    helperText,
    leftIcon,
    rightIcon,
    value,
    onChange,
    disabled,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedValue, setSelectedValue] = useState(value);
    const selectRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      setSelectedValue(value);
    }, [value]);

    const handleClear = () => {
      setSelectedValue('');
      onChange?.({ target: { value: '' } } as React.ChangeEvent<HTMLSelectElement>);
    };

    const handleSelect = (optionValue: string) => {
      setSelectedValue(optionValue);
      onChange?.({ target: { value: optionValue } } as React.ChangeEvent<HTMLSelectElement>);
      setIsOpen(false);
      setSearchTerm('');
    };

    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedOptions = filteredOptions.reduce((acc, option) => {
      if (!option.group) {
        acc.default = acc.default || [];
        acc.default.push(option);
      } else {
        if (!acc[option.group]) {
          acc[option.group] = [];
        }
        acc[option.group].push(option);
      }
      return acc;
    }, {} as Record<string, SelectOption[]>);

    const selectedOption = options.find(option => option.value === selectedValue);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div className="relative w-full" ref={selectRef}>
        <div className="relative">
          {/* Select input */}
          <div
            className={selectVariants({ variant, size, state, className })}
            onClick={() => !disabled && setIsOpen(!isOpen)}
          >
            {leftIcon && (
              <span className="mr-2 text-gray-500">
                {leftIcon}
              </span>
            )}
            
            <div className="flex-1 min-w-0">
              {selectedValue ? (
                <span className="block truncate">
                  {selectedOption?.label}
                </span>
              ) : (
                <span className="block text-gray-500">
                  {placeholder || 'Select an option'}
                </span>
              )}
            </div>

            {clearable && selectedValue && (
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-gray-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {rightIcon || (
              <svg
                className={`ml-2 h-4 w-4 text-gray-400 transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </div>

          {/* Dropdown menu */}
          {isOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-200">
              {/* Search input */}
              {searchable && (
                <div className="p-2 border-b border-gray-200">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
              )}

              {/* Options */}
              <div className="max-h-60 overflow-y-auto">
                {Object.entries(groupedOptions).map(([group, groupOptions]) => (
                  <div key={group}>
                    {group !== 'default' && (
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-50">
                        {group}
                      </div>
                    )}
                    {groupOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                          option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          selectedValue === option.value
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700'
                        }`}
                        onClick={() => !option.disabled && handleSelect(option.value)}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                ))}
                
                {filteredOptions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                    No options found
                  </div>
                )}
              </div>

              {loading && (
                <div className="px-3 py-2 text-sm text-gray-500 text-center border-t border-gray-200">
                  Loading...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Helper text and error */}
        {helperText && (
          <p className={`mt-1 text-xs ${error ? 'text-error-600' : 'text-gray-500'}`}>
            {helperText}
          </p>
        )}
        {error && (
          <p className="mt-1 text-xs text-error-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select, selectVariants };