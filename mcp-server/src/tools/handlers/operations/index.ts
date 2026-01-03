/**
 * Strategy Pattern for Section Operations
 *
 * Defines the interface and registry for section manipulation operations.
 * Each operation (list, get, replace, append, prepend) implements this interface.
 */

import type { Project } from '@mdt/shared/models/Project.js';
import type { SectionMatch } from '@mdt/shared/services/MarkdownSectionService.js';
import { ListOperation } from './ListOperation.js';
export { ListOperation } from './ListOperation.js';
import { GetOperation } from './GetOperation.js';
export { GetOperation } from './GetOperation.js';
import { ModifyOperation } from './ModifyOperation.js';
export { ModifyOperation } from './ModifyOperation.js';
import type { CRFileReader } from '../../../utils/section/CRFileReader.js';
import type { SectionResolver } from '../../../utils/section/SectionResolver.js';
import { ValidationFormatter } from '../../../utils/section/ValidationFormatter.js';
import { Sanitizer } from '../../../utils/sanitizer.js';
import { SimpleContentProcessor } from '../../../utils/simpleContentProcessor.js';
import { SimpleSectionValidator } from '../../../utils/simpleSectionValidator.js';
import { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js';
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js';
import type { CRService } from '../../../services/crService.js';

/**
 * Result of a section operation execution
 */
export interface SectionOperationResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Strategy interface for section operations
 * All section operations must implement this interface
 */
export interface SectionOperation {
  /**
   * Execute the section operation
   *
   * @param project - Project configuration
   * @param key - CR key (e.g., "MDT-001")
   * @param section - Section identifier (optional for some operations)
   * @param content - Content to apply (optional for some operations)
   * @param options - Additional operation-specific options
   * @returns Updated CR content or operation result
   */
  execute(
    project: Project,
    key: string,
    section?: string,
    content?: string,
    options?: Record<string, unknown>
  ): Promise<string>;
}

/**
 * Operation registry for O(1) lookup
 */
export const operationRegistry = new Map<string, SectionOperation>();

/**
 * Register a section operation
 *
 * @param name - Operation name (e.g., "list", "get", "replace")
 * @param operation - Operation implementation
 */
export function registerOperation(name: string, operation: SectionOperation): void {
  operationRegistry.set(name, operation);
}

/**
 * Get a registered operation by name
 *
 * @param name - Operation name
 * @returns Operation or undefined if not found
 */
export function getOperation(name: string): SectionOperation | undefined {
  return operationRegistry.get(name);
}

/**
 * Factory: Create a ListOperation strategy instance
 *
 * @param crFileReader - File reading utility
 * @param sectionResolver - Section resolution utility
 * @returns Configured ListOperation instance
 */
export function createListOperation(
  crFileReader: CRFileReader,
  sectionResolver: SectionResolver
): ListOperation {
  return new ListOperation(crFileReader, sectionResolver);
}

/**
 * Factory: Create a GetOperation strategy instance
 *
 * @param crFileReader - File reading utility
 * @param sectionResolver - Section resolution utility
 * @returns Configured GetOperation instance
 */
export function createGetOperation(
  crFileReader: CRFileReader,
  sectionResolver: SectionResolver
): GetOperation {
  return new GetOperation(crFileReader, sectionResolver, ValidationFormatter, Sanitizer);
}

/**
 * Factory: Create a ModifyOperation strategy instance
 *
 * This is the COMPLEX strategy - requires all dependencies for modification operations.
 *
 * @param crFileReader - File reading utility
 * @param sectionResolver - Section resolution utility
 * @param crService - CR service
 * @returns Configured ModifyOperation instance
 */
export function createModifyOperation(
  crFileReader: CRFileReader,
  sectionResolver: SectionResolver,
  crService: CRService
): ModifyOperation {
  return new ModifyOperation(
    crFileReader,
    sectionResolver,
    ValidationFormatter,
    SimpleContentProcessor,
    SimpleSectionValidator,
    MarkdownSectionService,
    MarkdownService,
    crService,
    Sanitizer
  );
}
