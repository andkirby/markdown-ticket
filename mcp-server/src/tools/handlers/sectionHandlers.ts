/**
 * Section handlers for MCP tools
 * Handles all section-related operations for CRs
 */

import { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js';
import { Project } from '@mdt/shared/models/Project.js';
import { CRService } from '../../services/crService.js';
import { validateCRKey, validateRequired, validateOperation } from '../../utils/validation.js';
import { ToolError, JsonRpcErrorCode } from '../../utils/toolError.js';
import { CRFileReader } from '../../utils/section/CRFileReader.js';
import { SectionResolver } from '../../utils/section/SectionResolver.js';
import {
    ListOperation,
    createListOperation,
    createGetOperation,
    createModifyOperation,
    type GetOperation,
    type ModifyOperation
} from './operations/index.js';

export interface SectionOperationResult {
    success: boolean;
    message: string;
    data?: any;
}

export class SectionHandlers {
    private crFileReader: CRFileReader;
    private sectionResolver: SectionResolver;
    private listOperation: ListOperation;
    private getOperation: GetOperation;
    private modifyOperation: ModifyOperation;

    constructor(
        private crService: CRService,
        private markdownSectionService: typeof MarkdownSectionService
    ) {
        this.crFileReader = new CRFileReader(crService);
        this.sectionResolver = new SectionResolver(this.markdownSectionService);
        this.listOperation = createListOperation(this.crFileReader, this.sectionResolver);
        this.getOperation = createGetOperation(this.crFileReader, this.sectionResolver);
        this.modifyOperation = createModifyOperation(this.crFileReader, this.sectionResolver, crService);
    }

    /**
     * Handle manage_cr_sections tool calls
     */
    async handleManageCRSections(
        project: Project,
        key: string,
        operation: string,
        section?: string,
        content?: string
    ): Promise<string> {

        // Validate CR key format
        const keyValidation = validateCRKey(key);
        if (!keyValidation.valid) {
            throw ToolError.protocol(keyValidation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
        }

        // Backward compatibility: map legacy 'update' operation to 'replace'
        if (operation === 'update') {
            operation = 'replace';
        }

        // Validate operation parameter
        const operationValidation = validateOperation(operation, ['list', 'get', 'replace', 'append', 'prepend']);
        if (!operationValidation.valid) {
            throw ToolError.protocol(operationValidation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
        }

        switch (operationValidation.value) {
            case 'list':
                return await this.listOperation.execute(project, keyValidation.value);

            case 'get':
                const sectionValidation1 = validateRequired(section, 'section');
                if (!sectionValidation1.valid) {
                    throw ToolError.protocol(sectionValidation1.message || "Validation error", JsonRpcErrorCode.InvalidParams);
                }
                return await this.getOperation.execute(project, keyValidation.value, sectionValidation1.value);

            case 'replace':
            case 'append':
            case 'prepend':
                const sectionValidation2 = validateRequired(section, 'section');
                if (!sectionValidation2.valid) {
                    throw ToolError.protocol(sectionValidation2.message || "Validation error", JsonRpcErrorCode.InvalidParams);
                }

                const contentValidation = validateRequired(content, 'content');
                if (!contentValidation.valid) {
                    throw ToolError.protocol(contentValidation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
                }

                return await this.modifyOperation.execute(
                    project,
                    keyValidation.value,
                    sectionValidation2.value,
                    contentValidation.value,
                    {operation: operationValidation.value as 'replace' | 'append' | 'prepend'}
                );

            default:
                throw ToolError.protocol(`Invalid operation '${operation}'. Must be: list, get, replace, append, or prepend`, JsonRpcErrorCode.InvalidParams);
        }
    }
}