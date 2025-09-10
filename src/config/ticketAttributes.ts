import { z } from 'zod';
import { AttributeConfig } from '../../shared/models/Config';

export type { AttributeConfig };

// CR Attribute Configuration using shared interface
export const CR_ATTRIBUTES: Record<string, AttributeConfig> = {
  // Required Core Attributes
  code: {
    type: 'string',
    pattern: '^[A-Z]{2,}-[A-Z]\\d{3}$',
    required: true
  },
  title: { 
    type: 'string', 
    required: true 
  },
  status: { 
    type: 'enum', 
    required: true,
    values: [
      'Proposed', 'Approved', 'In Progress', 'Implemented', 'On Hold',
      'Rejected', 'Superseded', 'Deprecated', 'Duplicate', 'Partially Implemented'
    ]
  },
  dateCreated: { 
    type: 'date', 
    required: true 
  },
  type: {
    type: 'enum',
    required: true,
    values: [
      'Feature Enhancement', 'Bug Fix', 'Technical Debt', 
      'Architecture', 'Documentation'
    ]
  },
  priority: {
    type: 'enum',
    required: true,
    values: ['Low', 'Medium', 'High', 'Critical']
  },
  phaseEpic: {
    type: 'enum',
    required: true,
    values: ['Phase A (Foundation)', 'Phase B (Enhancement)', 'Phase C', 'Phase D']
  },

  // Optional Attributes
  description: {
    type: 'string',
    required: false
  },
  rationale: {
    type: 'string',
    required: false
  },
  relatedTickets: {
    type: 'array<string>',
    pattern: '^[A-Z]{2,}-[A-Z]\\d{3}$',
    required: false
  },
  dependsOn: {
    type: 'array<string>',
    pattern: '^[A-Z]{2,}-[A-Z]\\d{3}$',
    required: false
  },
  blocks: {
    type: 'array<string>',
    pattern: '^[A-Z]{2,}-[A-Z]\\d{3}$',
    required: false
  },
  assignee: {
    type: 'string',
    required: false
  },
  implementationDate: {
    type: 'date',
    required: false
  },
  implementationNotes: {
    type: 'string',
    required: false
  }
};

// Validation Functions
export const validateAttribute = (attribute: string, value: any): { isValid: boolean; error?: string } => {
  const config = CR_ATTRIBUTES[attribute];
  if (!config) {
    return { isValid: false, error: `Unknown attribute: ${attribute}` };
  }

  // Check required
  if (config.required && (value === undefined || value === null || value === '')) {
    return { isValid: false, error: `${attribute} is required` };
  }

  // Skip validation if value is empty and not required
  if (!config.required && (value === undefined || value === null || value === '')) {
    return { isValid: true };
  }

  // Type validation
  switch (config.type) {
    case 'string':
      if (typeof value !== 'string') {
        return { isValid: false, error: `${attribute} must be a string` };
      }
      break;
    
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { isValid: false, error: `${attribute} must be a number` };
      }
      if (config.min !== undefined && value < config.min) {
        return { isValid: false, error: `${attribute} must be at least ${config.min}` };
      }
      if (config.max !== undefined && value > config.max) {
        return { isValid: false, error: `${attribute} must be at most ${config.max}` };
      }
      break;
    
    case 'date':
      if (!(value instanceof Date) && typeof value !== 'string') {
        return { isValid: false, error: `${attribute} must be a date` };
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { isValid: false, error: `${attribute} must be a valid date` };
        }
      }
      break;
    
    case 'enum':
      if (typeof value !== 'string') {
        return { isValid: false, error: `${attribute} must be a string` };
      }
      if (config.values && !config.values.includes(value)) {
        return { 
          isValid: false, 
          error: `${attribute} must be one of: ${config.values.join(', ')}` 
        };
      }
      break;
    
    case 'array<string>':
      if (!Array.isArray(value)) {
        return { isValid: false, error: `${attribute} must be an array` };
      }
      if (config.pattern) {
        for (const item of value) {
          if (typeof item !== 'string' || !new RegExp(config.pattern).test(item)) {
            return { 
              isValid: false, 
              error: `${attribute} items must match pattern: ${config.pattern}` 
            };
          }
        }
      }
      break;
  }

  // Pattern validation for strings
  if (config.pattern && typeof value === 'string') {
    if (!new RegExp(config.pattern).test(value)) {
      return { 
        isValid: false, 
        error: `${attribute} must match pattern: ${config.pattern}` 
      };
    }
  }

  return { isValid: true };
};

// Validate entire ticket
export const validateTicket = (ticket: Record<string, any>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  for (const [attribute, value] of Object.entries(ticket)) {
    const validation = validateAttribute(attribute, value);
    if (!validation.isValid) {
      errors.push(validation.error!);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get required attributes
export const getRequiredAttributes = (): string[] => {
  return Object.entries(CR_ATTRIBUTES)
    .filter(([_, config]) => config.required)
    .map(([key]) => key);
};

// Get optional attributes
export const getOptionalAttributes = (): string[] => {
  return Object.entries(CR_ATTRIBUTES)
    .filter(([_, config]) => !config.required)
    .map(([key]) => key);
};

// Get enum values for an attribute
export const getEnumValues = (attribute: string): string[] | undefined => {
  const config = CR_ATTRIBUTES[attribute];
  return config?.type === 'enum' ? config.values : undefined;
};

// Check if attribute is editable
export const isAttributeEditable = (attribute: string): boolean => {
  const editableAttributes = [
    'title', 'status', 'type', 'priority', 'phaseEpic',
    'description', 'rationale', 'relatedTickets', 
    'dependsOn', 'blocks', 'assignee', 'implementationNotes'
  ];
  return editableAttributes.includes(attribute);
};

// Check if attribute is read-only
export const isAttributeReadOnly = (attribute: string): boolean => {
  const readOnlyAttributes = [
    'code', 'dateCreated', 'implementationDate'
  ];
  return readOnlyAttributes.includes(attribute);
};

// Group attributes by section
export const attributeSections = {
  core: ['code', 'title', 'status', 'dateCreated', 'type', 'priority', 'phaseEpic'],
  optional: ['description', 'rationale', 'assignee'],
  relationships: ['relatedTickets', 'dependsOn', 'blocks'],
  implementation: ['implementationDate', 'implementationNotes']
} as const;

export type AttributeSection = keyof typeof attributeSections;