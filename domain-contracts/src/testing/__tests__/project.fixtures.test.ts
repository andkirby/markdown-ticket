/**
 * Test that project fixtures create valid data
 */

import {
  buildProject,
  buildProjectConfig,
  buildCreateProjectInput,
  buildUpdateProjectInput,
  buildMinimalProject,
  buildProjectWithComplexDocumentConfig,
  buildProjects,
  invalidFixtures,
} from '../project.fixtures';
import {
  validateProject,
  validateProjectConfig,
  validateCreateProjectInput,
  validateUpdateProjectInput,
  safeValidateProject,
  safeValidateProjectConfig,
  safeValidateCreateProjectInput,
  safeValidateUpdateProjectInput,
} from '../../project/index';

describe('Project Fixtures', () => {
  describe('buildProject', () => {
    it('creates valid project by default', () => {
      const project = buildProject();
      const validated = validateProject(project);
      expect(validated).toBeDefined();
      expect(validated.code).toBe('MDT');
      expect(validated.name).toBe('Markdown Ticket');
      expect(validated.active).toBe(true);
    });

    it('accepts overrides', () => {
      const project = buildProject({
        code: 'WEB',
        name: 'Web App',
        active: false,
      });
      const validated = validateProject(project);
      expect(validated.code).toBe('WEB');
      expect(validated.name).toBe('Web App');
      expect(validated.active).toBe(false);
    });
  });

  describe('buildProjectConfig', () => {
    it('creates valid project config by default', () => {
      const config = buildProjectConfig();
      const validated = validateProjectConfig(config);
      expect(validated).toBeDefined();
      expect(validated.project.code).toBe('MDT');
      expect(validated['project.document'].paths).toContain('docs/**/*.md');
    });

    it('accepts overrides for both sections', () => {
      const config = buildProjectConfig(
        { code: 'API' },
        { maxDepth: 5 }
      );
      const validated = validateProjectConfig(config);
      expect(validated.project.code).toBe('API');
      expect(validated['project.document'].maxDepth).toBe(5);
    });
  });

  describe('buildCreateProjectInput', () => {
    it('creates valid create input by default', () => {
      const input = buildCreateProjectInput();
      const validated = validateCreateProjectInput(input);
      expect(validated).toBeDefined();
      expect(validated.code).toBe('WEB');
      expect(validated.name).toBe('Web Application');
    });
  });

  describe('buildUpdateProjectInput', () => {
    it('creates valid update input by default', () => {
      const input = buildUpdateProjectInput();
      const validated = validateUpdateProjectInput(input);
      expect(validated).toBeDefined();
      expect(validated.name).toBe('Updated Project Name');
    });

    it('accepts partial updates', () => {
      const input = buildUpdateProjectInput({
        active: false,
        description: 'Updated description',
      });
      const validated = validateUpdateProjectInput(input);
      expect(validated.active).toBe(false);
      expect(validated.description).toBe('Updated description');
    });
  });

  describe('specialized builders', () => {
    it('buildMinimalProject creates valid minimal project', () => {
      const project = buildMinimalProject();
      const validated = validateProject(project);
      expect(validated.code).toBe('A1');
      expect(validated.name).toBe('ABC');
      expect(validated.id).toBe('a');
      expect(validated.ticketsPath).toBe('t');
    });

    it('buildProjectWithComplexDocumentConfig creates valid config', () => {
      const config = buildProjectWithComplexDocumentConfig();
      const validated = validateProjectConfig(config);
      expect(validated['project.document'].paths.length).toBeGreaterThan(2);
      expect(validated['project.document'].excludeFolders.length).toBeGreaterThan(2);
    });

    it('buildProjects creates array of valid projects', () => {
      const projects = buildProjects(3, 'APP');
      expect(projects).toHaveLength(3);

      projects.forEach((project, i) => {
        const validated = validateProject(project);
        expect(validated.code).toBe(`APP${(i + 1).toString().padStart(2, '0')}`);
        expect(validated.id).toBe(`app-${i + 1}`);
        expect(validated.name).toBe(`Project ${i + 1}`);
      });
    });
  });

  describe('invalid fixtures', () => {
    it('provides invalid project fixtures', () => {
      const invalidProject = invalidFixtures.project.invalidCode;
      const result = safeValidateProject(invalidProject);
      expect(result.success).toBe(false);

      const emptyName = invalidFixtures.project.emptyName;
      const emptyResult = safeValidateProject(emptyName);
      expect(emptyResult.success).toBe(false);
    });

    it('provides invalid create input fixtures', () => {
      const invalidInput = invalidFixtures.createInput.invalidCode;
      const result = safeValidateCreateProjectInput(invalidInput);
      expect(result.success).toBe(false);
    });

    it('provides invalid update input fixtures', () => {
      const emptyUpdate = invalidFixtures.updateInput.emptyUpdate;
      const result = safeValidateUpdateProjectInput(emptyUpdate);
      expect(result.success).toBe(false);
    });
  });
});