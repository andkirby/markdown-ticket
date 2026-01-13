/**
 * Common validation utilities for MCP handlers
 * Consolidates validation patterns to prevent duplication
 */

export interface ValidationResult {
  valid: boolean;
  message?: string;
  value?: any;
}

/**
 * Validate project key format (e.g., "MDT", "API", "WEB", "GLO1")
 * Pattern: 2-5 uppercase letters and numbers
 */
export function validateProjectKey(key: string): ValidationResult {
  if (!key || typeof key !== 'string') {
    return { valid: false, message: 'Project key is required and must be a string' };
  }

  const normalized = key.trim().toUpperCase();
  const pattern = /^[A-Z0-9]{2,5}$/;

  if (!pattern.test(normalized)) {
    return {
      valid: false,
      message: `Project key '${key}' is invalid. Must be 2-5 characters (uppercase letters and numbers) (e.g., MDT, API, GLO1)`
    };
  }

  return { valid: true, value: normalized };
}

/**
 * Validate CR key format (e.g., "MDT-001", "GLO1-123")
 * Pattern: Project code + dash + 3+ digits
 */
export function validateCRKey(key: string): ValidationResult {
  if (!key || typeof key !== 'string') {
    return { valid: false, message: 'CR key is required and must be a string' };
  }

  const trimmed = key.trim();
  const pattern = /^[A-Z0-9]{2,5}-\d{3,}$/;

  if (!pattern.test(trimmed)) {
    return {
      valid: false,
      message: `CR key '${key}' is invalid. Must be format: PROJECTCODE-### (e.g., MDT-001, API-123, GLO1-456)`
    };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validate required parameter exists and is non-empty
 */
export function validateRequired(value: any, name: string): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: false, message: `${name} is required` };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, message: `${name} cannot be empty` };
  }

  return { valid: true, value };
}

/**
 * Validate string parameter with optional min/max length
 */
export function validateString(
  value: any,
  name: string,
  options?: { min?: number; max?: number }
): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, message: `${name} must be a string` };
  }

  const trimmed = value.trim();

  if (options?.min && trimmed.length < options.min) {
    return {
      valid: false,
      message: `${name} must be at least ${options.min} characters long`
    };
  }

  if (options?.max && trimmed.length > options.max) {
    return {
      valid: false,
      message: `${name} must be no more than ${options.max} characters long`
    };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validate operation parameter against allowed values
 */
export function validateOperation(
  operation: string,
  allowed: string[],
  name: string = 'operation'
): ValidationResult {
  const result = validateRequired(operation, name);
  if (!result.valid) return result;

  if (!allowed.includes(operation)) {
    return {
      valid: false,
      message: `Invalid ${name} '${operation}'. Must be: ${allowed.join(', ')}`
    };
  }

  return { valid: true, value: operation };
}

/**
 * Validate and sanitize file path parameter
 */
function validatePath(path: string, name: string = 'path'): ValidationResult {
  const result = validateRequired(path, name);
  if (!result.valid) return result;

  if (typeof path !== 'string') {
    return { valid: false, message: `${name} must be a string` };
  }

  // Basic path sanitization
  const sanitized = path.trim();

  // Prevent path traversal
  if (sanitized.includes('..') || sanitized.includes('~')) {
    return {
      valid: false,
      message: `${name} contains invalid characters or path traversal`
    };
  }

  return { valid: true, value: sanitized };
}