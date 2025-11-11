/**
 * Comprehensive Type Definitions for Markdown Ticket System
 * Unified types for Frontend, Backend, and MCP systems
 */
export type CRStatus = 'Proposed' | 'Approved' | 'In Progress' | 'Implemented' | 'Rejected' | 'On Hold' | 'Superseded' | 'Deprecated' | 'Duplicate' | 'Partially Implemented';
export type CRType = 'Architecture' | 'Feature Enhancement' | 'Bug Fix' | 'Technical Debt' | 'Documentation';
export type CRPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export interface ProjectInfo {
    key: string;
    name: string;
    description?: string;
    path: string;
    crCount: number;
    lastAccessed: string;
}
export interface Template {
    type: string;
    requiredFields: string[];
    template: string;
    sections: TemplateSection[];
}
export interface TemplateSection {
    name: string;
    required: boolean;
    placeholder?: string;
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
export interface ValidationError {
    field: string;
    message: string;
}
export interface ValidationWarning {
    field: string;
    message: string;
}
export interface Suggestion {
    type: 'improvement' | 'related' | 'validation';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    actionable: boolean;
}
//# sourceMappingURL=Types.d.ts.map