/** Section handlers for MCP tools - MDT-114 Phase 6: Thin wrapper for validation and routing */
import { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js';
import { Project } from '@mdt/shared/models/Project.js';
import { CRService } from '../../services/crService.js';
import { validateCRKey, validateRequired, validateOperation } from '../../utils/validation.js';
import { ToolError, JsonRpcErrorCode } from '../../utils/toolError.js';
import { SectionService } from '../../services/SectionManagement/SectionService.js';

export class SectionHandlers {
    private sectionService: SectionService;

    constructor(
        private crService: CRService,
        private markdownSectionService: typeof MarkdownSectionService
    ) {
        this.sectionService = new SectionService(crService, markdownSectionService);
    }

    /** Handle manage_cr_sections tool calls - validates and routes to SectionService */
    async handleManageCRSections(
        project: Project,
        key: string,
        operation: string,
        section?: string,
        content?: string
    ): Promise<string> {
        const keyValidation = validateCRKey(key);
        if (!keyValidation.valid) {
            throw ToolError.protocol(keyValidation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
        }
        // Backward compatibility: map legacy 'update' to 'replace'
        const op = operation === 'update' ? 'replace' : operation;
        const operationValidation = validateOperation(op, ['list', 'get', 'replace', 'append', 'prepend']);
        if (!operationValidation.valid) {
            throw ToolError.protocol(operationValidation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
        }
        const validKey = keyValidation.value;
        const validOp = operationValidation.value as 'list' | 'get' | 'replace' | 'append' | 'prepend';
        switch (validOp) {
            case 'list':
                return await this.sectionService.listSections(project, validKey);
            case 'get': {
                const sectionValidation = validateRequired(section, 'section');
                if (!sectionValidation.valid) {
                    throw ToolError.protocol(sectionValidation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
                }
                return await this.sectionService.getSection(project, validKey, sectionValidation.value);
            }
            case 'replace':
            case 'append':
            case 'prepend': {
                const sectionValidation = validateRequired(section, 'section');
                if (!sectionValidation.valid) {
                    throw ToolError.protocol(sectionValidation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
                }
                const contentValidation = validateRequired(content, 'content');
                if (!contentValidation.valid) {
                    throw ToolError.protocol(contentValidation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
                }
                return await this.sectionService.modifySection(
                    project,
                    validKey,
                    sectionValidation.value,
                    contentValidation.value,
                    validOp
                );
            }
            default:
                throw ToolError.protocol(
                    `Invalid operation '${operation}'. Must be: list, get, replace, append, or prepend`,
                    JsonRpcErrorCode.InvalidParams
                );
        }
    }
}
