/**
 * Section Management Service
 * Phase 6: Uses new SectionManagement components with delegated operations
 */

import type { Project } from '@mdt/shared/models/Project.js';
import type { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js';
import type { CRService } from '../../services/crService.js';
import { SectionRepository } from './SectionRepository.js';
import { PathResolver } from './PathResolver.js';
import { SectionPresenter } from './SectionPresenter.js';
import { SectionEditor, type ModifyResult } from './SectionEditor.js';
import type { Operation } from './types.js';
import { Sanitizer } from '../../utils/sanitizer.js';

type MarkdownSectionServiceClass = typeof MarkdownSectionService;

/** Section Management Service - provides high-level API for section operations */
export class SectionService {
    private sectionRepository: SectionRepository;
    private pathResolver: PathResolver;
    private sectionEditor: SectionEditor;

    constructor(
        private crService: CRService,
        private markdownSectionService: MarkdownSectionServiceClass
    ) {
        this.sectionRepository = new SectionRepository(crService, markdownSectionService);
        this.pathResolver = new PathResolver(markdownSectionService);
        this.sectionEditor = new SectionEditor(crService, markdownSectionService);
    }

    /** List all sections in a CR */
    async listSections(project: Project, key: string): Promise<string> {
        const { title, markdownBody } = await this.sectionRepository.readCR(project, key);
        const sections = this.markdownSectionService.findSection(markdownBody, '');
        return SectionPresenter.formatList(key, title, sections);
    }

    /** Get a specific section's content */
    async getSection(project: Project, key: string, path: string): Promise<string> {
        const section = await this.sectionRepository.find(project, key, path);
        const content = Sanitizer.sanitizeText(section.content);
        return SectionPresenter.formatGet(key, section, content);
    }

    /** Modify a section (replace, append, or prepend) */
    async modifySection(
        project: Project,
        key: string,
        path: string,
        content: string,
        operation: Operation
    ): Promise<string> {
        if (operation !== 'replace' && operation !== 'append' && operation !== 'prepend') {
            throw new Error(`Invalid modify operation: ${operation}`);
        }

        this.pathResolver.validatePath(path);

        let result: ModifyResult;
        switch (operation) {
            case 'replace':
                result = await this.sectionEditor.replace(project, key, path, content);
                break;
            case 'append':
                result = await this.sectionEditor.append(project, key, path, content);
                break;
            case 'prepend':
                result = await this.sectionEditor.prepend(project, key, path, content);
                break;
            default:
                throw new Error(`Invalid operation: ${operation}`);
        }

        return SectionPresenter.formatModify(
            result.key,
            result.sectionPath,
            result.operation,
            result.contentLength,
            result.title,
            result.filePath,
            result.timestamp,
            result.contentModified,
            result.warningsCount
        );
    }

    /** Get the section repository instance (for testing/advanced operations) */
    getRepository(): SectionRepository {
        return this.sectionRepository;
    }

    /** Get the path resolver instance (for testing/advanced operations) */
    getPathResolver(): PathResolver {
        return this.pathResolver;
    }

    /** Get the section editor instance (for testing/advanced operations) */
    getEditor(): SectionEditor {
        return this.sectionEditor;
    }
}
