/**
 * Document Fixtures - MDT-106
 * Test data fixtures for document-related API tests using ProjectFactory.
 */

import type { ProjectFactory } from '@mdt/shared/test-lib';

// Valid markdown document with YAML frontmatter
export const validDocumentWithFrontmatter =
  '---\ntitle: API Documentation\nauthor: John Doe\ntags: [api, rest]\n---\n\n# API Documentation\n\nThis document describes the REST API endpoints.';

// Valid markdown document without frontmatter
export const validDocumentNoFrontmatter =
  '# Project Overview\n\nThis is a simple markdown document without YAML frontmatter.\n\n## Features\n\n- Feature 1\n- Feature 2\n- Feature 3';

// Empty document (edge case for testing)
export const emptyDocument = '';

// Document with special characters in content
export const documentWithSpecialChars =
  '---\ntitle: Special Characters & Symbols\n---\n\n# Special Characters Test\n\n\' " `code` & < > | @ # $ © ® ™ 🎉';

// Document with complex YAML frontmatter
export const documentWithComplexFrontmatter =
  '---\ntitle: Complex Frontmatter\nauthor: Jane Smith\nversion: 1.0.0\ntags: [documentation, example]\nmetadata:\n  priority: high\n  status: draft\n  reviewers: [alice@example.com, bob@example.com]\nrelated: [DOC-001, DOC-002]\n---\n\n# Complex Document\n\nThis demonstrates nested YAML structures.';

// Document with code blocks
export const documentWithCodeBlocks =
  '# Code Examples\n\n```javascript\nfunction greet(name) { return \'Hello, ${name}!\'; }\n```\n\n```typescript\ninterface User { id: number; name: string; }\n```';

// Document with tables
export const documentWithTables =
  '# Data Reference\n\n| Role | Description | Permissions |\n|------|-------------|--------------|\n| Admin | Full access | CRUD |\n| Editor | Content | CRU |';

// Document fixtures collection
export const documentFixtures = {
  withFrontmatter: validDocumentWithFrontmatter,
  withoutFrontmatter: validDocumentNoFrontmatter,
  empty: emptyDocument,
  specialChars: documentWithSpecialChars,
  complexFrontmatter: documentWithComplexFrontmatter,
  codeBlocks: documentWithCodeBlocks,
  tables: documentWithTables,
};

// Document file path fixtures (relative to project root)
export const documentPaths = {
  readme: 'README.md',
  api: 'docs/api/README.md',
  guide: 'docs/guide/getting-started.md',
  examples: 'docs/examples/code-samples.md',
  reference: 'docs/reference/data-tables.md',
};

// Create a test document file in project using ProjectFactory
export async function createTestDocument(
  projectFactory: ProjectFactory,
  projectCode: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const projectPath = path.join(projectFactory['projectsDir'], projectCode);
  const filePath = path.join(projectPath, relativePath);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// Create multiple test documents for a project
export async function createTestDocumentSet(
  projectFactory: ProjectFactory,
  projectCode: string,
): Promise<void> {
  await createTestDocument(projectFactory, projectCode, documentPaths.readme, validDocumentNoFrontmatter);
  await createTestDocument(projectFactory, projectCode, documentPaths.api, validDocumentWithFrontmatter);
  await createTestDocument(projectFactory, projectCode, documentPaths.guide, documentWithComplexFrontmatter);
}
