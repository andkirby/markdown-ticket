/**
 * Validation Rules Tests
 *
 * TDD tests for ValidationRules utility class
 */

import { ValidationRules } from './validation-rules';
import { TestCRData } from '../types/project-factory-types';

describe('ValidationRules', () => {
  describe('validateProjectCode', () => {
    it('GIVEN valid project code WHEN validating THEN returns valid', () => {
      const result = ValidationRules.validateProjectCode('TEST');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('GIVEN valid 2-letter project code WHEN validating THEN returns valid', () => {
      const result = ValidationRules.validateProjectCode('AB');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('GIVEN valid 10-letter project code WHEN validating THEN returns valid', () => {
      const result = ValidationRules.validateProjectCode('ABCDEFGHIJ');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('GIVEN empty project code WHEN validating THEN returns error', () => {
      const result = ValidationRules.validateProjectCode('');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PROJECT_CODE_REQUIRED');
      expect(result.errors[0].field).toBe('projectCode');
    });

    it('GIVEN lowercase project code WHEN validating THEN returns error', () => {
      const result = ValidationRules.validateProjectCode('test');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PROJECT_CODE_INVALID_FORMAT');
      expect(result.errors[0].value).toBe('test');
    });

    it('GIVEN project code with numbers WHEN validating THEN returns error', () => {
      const result = ValidationRules.validateProjectCode('TEST1');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PROJECT_CODE_INVALID_FORMAT');
    });

    it('GIVEN too long project code WHEN validating THEN returns error', () => {
      const result = ValidationRules.validateProjectCode('TOOLONGCODE');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PROJECT_CODE_INVALID_FORMAT');
    });
  });

  describe('validateProjectName', () => {
    it('GIVEN valid project name WHEN validating THEN returns valid', () => {
      const result = ValidationRules.validateProjectName('Test Project');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('GIVEN empty project name WHEN validating THEN returns error', () => {
      const result = ValidationRules.validateProjectName('');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PROJECT_NAME_REQUIRED');
    });

    it('GIVEN whitespace-only project name WHEN validating THEN returns error', () => {
      const result = ValidationRules.validateProjectName('   ');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PROJECT_NAME_REQUIRED');
    });

    it('GIVEN too long project name WHEN validating THEN returns error', () => {
      const longName = 'A'.repeat(101);
      const result = ValidationRules.validateProjectName(longName);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PROJECT_NAME_TOO_LONG');
    });

    it('GIVEN project name with script tag WHEN validating THEN returns warning', () => {
      const result = ValidationRules.validateProjectName('<script>alert("xss")</script>');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('PROJECT_NAME_SUSPICIOUS_CONTENT');
    });

    it('GIVEN project name with javascript WHEN validating THEN returns warning', () => {
      const result = ValidationRules.validateProjectName('javascript:alert("xss")');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('PROJECT_NAME_SUSPICIOUS_CONTENT');
    });
  });

  describe('validateCRData', () => {
    const validCRData: TestCRData = {
      title: 'Test CR',
      type: 'Feature Enhancement',
      content: '## 1. Description\nTest content\n\n## 2. Rationale\nTest rationale'
    };

    it('GIVEN valid CR data WHEN validating THEN returns valid', () => {
      const result = ValidationRules.validateCRData(validCRData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('GIVEN CR with missing title WHEN validating THEN returns error', () => {
      const crData = { ...validCRData, title: '' };
      const result = ValidationRules.validateCRData(crData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CR_TITLE_REQUIRED');
      expect(result.errors[0].field).toBe('title');
    });

    it('GIVEN CR with too long title WHEN validating THEN returns error', () => {
      const longTitle = 'A'.repeat(201);
      const crData = { ...validCRData, title: longTitle };
      const result = ValidationRules.validateCRData(crData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CR_TITLE_TOO_LONG');
    });

    it('GIVEN CR with missing type WHEN validating THEN returns error', () => {
      const crData = { ...validCRData, type: '' as any };
      const result = ValidationRules.validateCRData(crData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CR_TYPE_REQUIRED');
      expect(result.errors[0].field).toBe('type');
    });

    it('GIVEN CR with missing content WHEN validating THEN returns error', () => {
      const crData = { ...validCRData, content: '' };
      const result = ValidationRules.validateCRData(crData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CR_CONTENT_REQUIRED');
    });

    it('GIVEN CR with missing Description section WHEN validating THEN returns error', () => {
      const crData = {
        ...validCRData,
        content: '## 2. Rationale\nTest rationale'
      };
      const result = ValidationRules.validateCRData(crData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CR_CONTENT_MISSING_SECTIONS');
      expect(result.errors[0].value).toContain('## 1. Description');
    });

    it('GIVEN CR with missing Rationale section WHEN validating THEN returns error', () => {
      const crData = {
        ...validCRData,
        content: '## 1. Description\nTest content'
      };
      const result = ValidationRules.validateCRData(crData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CR_CONTENT_MISSING_SECTIONS');
      expect(result.errors[0].value).toContain('## 2. Rationale');
    });

    it('GIVEN CR with unclosed code block WHEN validating THEN returns warning', () => {
      const crData = {
        ...validCRData,
        content: '## 1. Description\n```javascript\nconst x = 1;\n\n## 2. Rationale\nTest rationale'
      };
      const result = ValidationRules.validateCRData(crData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('CR_CONTENT_UNCLOSED_CODE_BLOCK');
    });
  });

  describe('sanitizeInput', () => {
    it('GIVEN normal input WHEN sanitizing THEN returns unchanged', () => {
      const input = 'Normal text input';
      const result = ValidationRules.sanitizeInput(input);

      expect(result).toBe(input);
    });

    it('GIVEN input with script tag WHEN sanitizing THEN removes script', () => {
      const input = '<script>alert("xss")</script>Normal text';
      const result = ValidationRules.sanitizeInput(input);

      expect(result).toBe('Normal text');
    });

    it('GIVEN input with javascript protocol WHEN sanitizing THEN removes protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = ValidationRules.sanitizeInput(input);

      expect(result).toBe('alert("xss")');
    });

    it('GIVEN input with event handler WHEN sanitizing THEN removes handler', () => {
      const input = '<div onclick="alert(\'xss\')">Click me</div>';
      const result = ValidationRules.sanitizeInput(input);

      expect(result).toBe('<div>Click me</div>');
    });

    it('GIVEN empty input WHEN sanitizing THEN returns empty', () => {
      const result = ValidationRules.sanitizeInput('');

      expect(result).toBe('');
    });

    it('GIVEN null input WHEN sanitizing THEN returns empty', () => {
      const result = ValidationRules.sanitizeInput(null as any);

      expect(result).toBeNull();
    });
  });

  describe('sanitizeProjectCode', () => {
    it('GIVEN mixed input WHEN sanitizing project code THEN returns uppercase letters', () => {
      const result = ValidationRules.sanitizeProjectCode('Te1st-2_Co!de');

      expect(result).toBe('TESTCODE');
    });

    it('GIVEN long input WHEN sanitizing project code THEN truncates to 10 chars', () => {
      const result = ValidationRules.sanitizeProjectCode('VERYLONGPROJECTCODE');

      expect(result).toBe('VERYLONGPR');
    });

    it('GIVEN empty input WHEN sanitizing project code THEN returns empty', () => {
      const result = ValidationRules.sanitizeProjectCode('');

      expect(result).toBe('');
    });
  });

  describe('validateAndSanitizeProjectCode', () => {
    it('GIVEN invalid input WHEN validating and sanitizing THEN returns sanitized and valid', () => {
      const result = ValidationRules.validateAndSanitizeProjectCode('te1st-code');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toBe('TESTCODE');
    });

    it('GIVEN input that becomes empty WHEN validating and sanitizing THEN returns error', () => {
      const result = ValidationRules.validateAndSanitizeProjectCode('123-!@#');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.sanitized).toBe('');
    });
  });

  describe('validateAndSanitizeProjectName', () => {
    it('GIVEN name with XSS WHEN validating and sanitizing THEN returns sanitized', () => {
      const result = ValidationRules.validateAndSanitizeProjectName('<script>alert("xss")</script>Test');

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Test');
    });
  });

  describe('validateAndSanitizeCRData', () => {
    const validCRData: TestCRData = {
      title: 'Test CR',
      type: 'Feature Enhancement',
      content: '## 1. Description\nTest content\n\n## 2. Rationale\nTest rationale'
    };

    it('GIVEN CR data with XSS WHEN validating and sanitizing THEN returns sanitized', () => {
      const crDataWithXss: TestCRData = {
        ...validCRData,
        title: '<script>alert("xss")</script>Test CR',
        assignee: 'javascript:alert("xss")User'
      };

      const result = ValidationRules.validateAndSanitizeCRData(crDataWithXss);

      expect(result.valid).toBe(true);
      expect(result.sanitized.title).toBe('Test CR');
      expect(result.sanitized.assignee).toBe('alert("xss")User');
    });
  });
});