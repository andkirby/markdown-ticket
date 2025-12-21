/**
 * Schema Business Rules Tests
 * Testing OUR enum definitions, not Zod's enum functionality
 */

import {
  CRStatusSchema,
  CRTypeSchema,
  CRPrioritySchema,
} from '../schema';

describe('CRStatusSchema', () => {
  // Testing OUR defined status values
  it('accepts all defined statuses', () => {
    const statuses = ['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected'];

    statuses.forEach(status => {
      const result = CRStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(status);
      }
    });
  });

  // Testing OUR design choice - these are the ONLY valid values
  it('rejects undefined status "New"', () => {
    const result = CRStatusSchema.safeParse('New');
    expect(result.success).toBe(false);
  });

  it('rejects undefined status "Ready"', () => {
    const result = CRStatusSchema.safeParse('Ready');
    expect(result.success).toBe(false);
  });

  it('rejects case variants', () => {
    const result = CRStatusSchema.safeParse('proposed');
    expect(result.success).toBe(false);
  });
});

describe('CRTypeSchema', () => {
  // Testing OUR defined type values
  it('accepts all defined types', () => {
    const types = ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'];

    types.forEach(type => {
      const result = CRTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(type);
      }
    });
  });

  // Testing OUR design choice - these are the ONLY valid values
  it('rejects abbreviated "Feature"', () => {
    const result = CRTypeSchema.safeParse('Feature');
    expect(result.success).toBe(false);
  });

  it('rejects abbreviated "Bug"', () => {
    const result = CRTypeSchema.safeParse('Bug');
    expect(result.success).toBe(false);
  });
});

describe('CRPrioritySchema', () => {
  // Testing OUR defined priority values
  it('accepts all defined priorities', () => {
    const priorities = ['Low', 'Medium', 'High', 'Critical'];

    priorities.forEach(priority => {
      const result = CRPrioritySchema.safeParse(priority);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(priority);
      }
    });
  });

  // Testing OUR design choice - these are the ONLY valid values
  it('rejects undefined priority "Urgent"', () => {
    const result = CRPrioritySchema.safeParse('Urgent');
    expect(result.success).toBe(false);
  });

  it('rejects undefined priority "Normal"', () => {
    const result = CRPrioritySchema.safeParse('Normal');
    expect(result.success).toBe(false);
  });
});