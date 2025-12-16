/**
 * ValidationRules Integration Tests
 *
 * Demonstrates how ValidationRules can be integrated with other components
 */

import { ValidationRules } from './validation-rules';
import { TestCRData } from '../types/project-factory-types';

describe('ValidationRules Integration', () => {
  describe('with ProjectFactory', () => {
    it('demonstrates project code validation workflow', () => {
      // Simulate user input
      const userInput = 'Test123';

      // Validate and sanitize in one step
      const validationResult = ValidationRules.validateAndSanitizeProjectCode(userInput);

      if (!validationResult.valid) {
        console.error('Validation errors:', validationResult.errors);
        // In real implementation, would show these errors to user
        expect(validationResult.errors).toHaveLength(1);
        expect(validationResult.errors[0].code).toBe('PROJECT_CODE_INVALID_FORMAT');
      }

      // Use the sanitized value
      expect(validationResult.sanitized).toBe('TEST');
    });

    it('demonstrates CR data validation workflow', () => {
      // Simulate CR data from form
      const crData: TestCRData = {
        title: '  <script>alert("xss")</script>Test CR  ',
        type: 'Feature Enhancement',
        content: 'Test content without required sections'
      };

      // Validate and sanitize
      const validationResult = ValidationRules.validateAndSanitizeCRData(crData);

      // Check validation results
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0].code).toBe('CR_CONTENT_MISSING_SECTIONS');

      // Check sanitized values
      expect(validationResult.sanitized.title).toBe('Test CR');
    });

    it('demonstrates batch validation workflow', () => {
      const projects = ['TEST', 'test123', 'TOOLONGCODE', '', 'VALID'];

      const results = projects.map(code => ({
        original: code,
        ...ValidationRules.validateAndSanitizeProjectCode(code)
      }));

      const validResults = results.filter(r => r.valid);
      const invalidResults = results.filter(r => !r.valid);

      // Check results - most will be valid after sanitization except empty string
      expect(validResults).toHaveLength(4);
      expect(invalidResults).toHaveLength(1);

      // All valid results should have sanitized codes
      validResults.forEach(result => {
        expect(result.sanitized).toMatch(/^[A-Z]{2,10}$/);
      });

      // Empty string should be invalid
      expect(invalidResults[0].original).toBe('');
    });
  });

  describe('warning handling', () => {
    it('demonstrates handling validation warnings', () => {
      const projectName = 'javascript:alert("xss")My Project';

      // First validate to see warnings
      const validationResult = ValidationRules.validateProjectName(projectName);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.warnings).toHaveLength(1);
      expect(validationResult.warnings[0].code).toBe('PROJECT_NAME_SUSPICIOUS_CONTENT');

      // Then sanitize to get clean version
      const sanitized = ValidationRules.sanitizeProjectName(projectName);
      expect(sanitized).toBe('alert("xss")My Project');

      // Using validateAndSanitizeProjectName does both in one step
      const result = ValidationRules.validateAndSanitizeProjectName(projectName);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('alert("xss")My Project');
    });
  });

  describe('custom validation scenarios', () => {
    it('validates CR content with multiple issues', () => {
      const crData: TestCRData = {
        title: '',
        type: '',
        content: 'Invalid content without sections'
      };

      const result = ValidationRules.validateAndSanitizeCRData(crData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3); // title, type, missing sections
      expect(result.errors.map(e => e.code)).toEqual(
        expect.arrayContaining([
          'CR_TITLE_REQUIRED',
          'CR_TYPE_REQUIRED',
          'CR_CONTENT_MISSING_SECTIONS'
        ])
      );
    });
  });
});