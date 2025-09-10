import { CR, CRData, CRType } from '../models/Types.js';

export class CRService {
  
  /**
   * Create a new CR object from input data
   */
  static createCR(data: CRData, crKey: string, crType: CRType, filePath: string): CR {
    const now = new Date();
    
    return {
      key: crKey,
      title: data.title,
      status: 'Proposed',
      type: crType,
      priority: data.priority || 'Medium',
      dateCreated: now,
      lastModified: now,
      content: data.content || '',
      filePath,
      phaseEpic: data.phaseEpic,
      description: data.description,
      rationale: data.rationale,
      assignee: data.assignee,
      relatedTickets: this.parseArrayField(data.relatedTickets),
      dependsOn: this.parseArrayField(data.dependsOn),
      blocks: this.parseArrayField(data.blocks),
      relatedDocuments: []
    };
  }

  /**
   * Parse comma-separated string or array into array
   */
  static parseArrayField(field?: string | string[]): string[] {
    if (Array.isArray(field)) return field;
    if (typeof field === 'string' && field.trim()) {
      return field.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  }
}
