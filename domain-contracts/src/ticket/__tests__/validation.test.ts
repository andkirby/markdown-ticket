/**
 * Ticket Validation Function Behavior Tests
 * Testing function behavior, not schema validation
 */

import {
  validateTicket,
  validateCR,
  safeValidateTicket,
  safeValidateCR,
} from '../validation';

describe('validateTicket', () => {
  it('returns typed ticket on valid input', () => {
    const result = validateTicket({
      code: 'MDT-101',
      title: 'Test Ticket',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
    });

    expect(result.code).toBe('MDT-101');
    expect(result.title).toBe('Test Ticket');
    expect(typeof result).toBe('object');
  });

  it('throws on invalid input', () => {
    expect(() => validateTicket({
      code: 'invalid-code',
      title: 'Test',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
    })).toThrow();
  });
});

describe('validateCR', () => {
  it('returns typed CR on valid input', () => {
    const result = validateCR({
      code: 'MDT-101',
      title: 'Test CR',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
      content: '# Test Content',
    });

    expect(result.code).toBe('MDT-101');
    expect(result.title).toBe('Test CR');
    expect(result.content).toBe('# Test Content');
    expect(typeof result).toBe('object');
  });

  it('throws on invalid input', () => {
    expect(() => validateCR({
      code: 'invalid',
      title: 'Test',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
    })).toThrow();
  });
});

describe('safeValidateTicket', () => {
  it('returns success: true on valid input', () => {
    const result = safeValidateTicket({
      code: 'MDT-101',
      title: 'Test Ticket',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('MDT-101');
    }
  });

  it('returns success: false on invalid input', () => {
    const result = safeValidateTicket({
      code: 'mdt-101', // lowercase - should fail our rule
      title: 'Test Ticket',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  // Test error structure if user-facing
  it('provides helpful error for invalid code', () => {
    const result = safeValidateTicket({
      code: 'MDT', // missing dash and numbers - should fail our rule
      title: 'Test Ticket',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const codeError = result.error.issues.find(i => i.path[0] === 'code');
      expect(codeError?.message).toMatch(/PREFIX-123/);
    }
  });
});

describe('safeValidateCR', () => {
  it('returns success: true on valid input', () => {
    const result = safeValidateCR({
      code: 'MDT-101',
      title: 'Test CR',
      status: 'In Progress',
      type: 'Bug Fix',
      priority: 'High',
      assignee: 'user@example.com',
      implementationDate: '2025-12-21',
    });

    expect(result.success).toBe(true);
  });

  it('returns success: false on invalid input', () => {
    const result = safeValidateCR({
      code: 'INVALID', // wrong format
      title: '', // empty title
      status: 'Invalid Status', // invalid enum
      type: 'Feature Enhancement',
      priority: 'Medium',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(1);
    }
  });

  it('validates email format when provided', () => {
    const result = safeValidateCR({
      code: 'MDT-101',
      title: 'Test CR',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
      assignee: 'not-an-email', // invalid email
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find(i => i.path[0] === 'assignee');
      expect(emailError?.message).toMatch(/Invalid email format/);
    }
  });

  it('validates date format when provided', () => {
    const result = safeValidateCR({
      code: 'MDT-101',
      title: 'Test CR',
      status: 'Implemented',
      type: 'Feature Enhancement',
      priority: 'Medium',
      implementationDate: '21-12-2025', // wrong format
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const dateError = result.error.issues.find(i => i.path[0] === 'implementationDate');
      expect(dateError?.message).toMatch(/YYYY-MM-DD/);
    }
  });
});