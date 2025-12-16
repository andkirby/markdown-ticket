/**
 * Test Data Factory
 *
 * Handles test data orchestration extracted from ProjectFactory.
 * Provides CR creation, test data generation, and validation logic.
 */

import { MCPClient } from '../mcp-client';
import { McpTicketCreator } from '../ticket/mcp-ticket-creator';
import {
  TicketData,
  TestCRData,
  MCPResponse,
  ProjectFactoryError,
  ValidationResult
} from '../types/project-factory-types';
import { ValidationRules } from '../utils/validation-rules';

export class TestDataFactory {
  private mcpTicketCreator: McpTicketCreator;

  constructor(mcpClient: MCPClient) {
    if (!mcpClient) throw new ProjectFactoryError('MCPClient is required');
    this.mcpTicketCreator = new McpTicketCreator(mcpClient);
  }

  async createTestCR(projectCode: string, crData: TestCRData): Promise<MCPResponse> {
    const validation = this.validateCRData(crData);
    if (!validation.valid) {
      throw new ProjectFactoryError(`Invalid CR data: ${validation.errors.map(e => e.message).join('; ')}`);
    }

    try {
      const ticketData: TicketData = {
        title: crData.title,
        type: crData.type,
        content: crData.content,
        status: crData.status || 'Proposed',
        priority: crData.priority || 'Medium',
        phaseEpic: crData.phaseEpic,
        dependsOn: crData.dependsOn ? [crData.dependsOn] : undefined,
        blocks: crData.blocks ? [crData.blocks] : undefined,
        assignee: crData.assignee
      };

      const result = await this.mcpTicketCreator.create(projectCode, ticketData);

      return {
        success: result.success,
        data: result.success ? this.formatResponseData(result.ticket!, result.ticketId!) : undefined,
        key: result.ticketId,
        error: result.error?.message
      };
    } catch (error) {
      if (error instanceof ProjectFactoryError) throw error;
      throw new ProjectFactoryError(
        `Failed to create CR '${crData.title}' in project ${projectCode}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async createMultipleCRs(projectCode: string, crsData: Omit<TestCRData, 'dependsOn' | 'blocks'>[]): Promise<MCPResponse[]> {
    const responses: MCPResponse[] = [];
    const errors: Error[] = [];

    for (let i = 0; i < crsData.length; i++) {
      try {
        const response = await this.createTestCR(projectCode, crsData[i] as TestCRData);
        responses.push(response);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(`Failed to create CR at index ${i}`));
      }
    }

    if (errors.length > 0) {
      throw new ProjectFactoryError(
        `Failed to create ${errors.length} of ${crsData.length} CRs`,
        new Error(errors.map(e => e.message).join('; '))
      );
    }

    return responses;
  }

  validateCRData(crData: TestCRData): ValidationResult {
    return ValidationRules.validateCRData(crData);
  }

  generateTestCRData(overrides: Partial<TestCRData> = {}): TestCRData {
    return {
      title: 'Test CR',
      type: 'Feature Enhancement',
      status: 'Proposed',
      priority: 'Medium',
      content: this.generateContent(),
      ...overrides
    };
  }

  generateMultipleTestCRData(count: number, baseOverrides: Partial<TestCRData> = {}): TestCRData[] {
    const types: TestCRData['type'][] = ['Feature Enhancement', 'Bug Fix', 'Architecture', 'Documentation', 'Technical Debt'];
    const priorities: TestCRData['priority'][] = ['Low', 'Medium', 'High', 'Critical'];

    return Array.from({ length: count }, (_, i) => {
      const typeIndex = i % types.length;
      const priorityIndex = i % priorities.length;

      return this.generateTestCRData({
        ...baseOverrides,
        title: `${baseOverrides.title || 'Test CR'} ${i + 1}`,
        type: types[typeIndex],
        priority: priorities[priorityIndex],
        content: this.generateContent(`Test CR ${i + 1}`)
      });
    });
  }

  validateBatch(crsData: TestCRData[]): ValidationResult[] {
    return crsData.map(crData => this.validateCRData(crData));
  }

  private formatResponseData(ticket: TicketData, ticketId: string): string {
    const lines = [
      `✅ **Created CR ${ticketId}**: ${ticket.title}`,
      `- Type: ${ticket.type}`,
      `- Status: ${ticket.status || 'Proposed'}`,
      `- Priority: ${ticket.priority || 'Medium'}`
    ];

    if (ticket.phaseEpic) lines.push(`- Phase/Epic: ${ticket.phaseEpic}`);
    if (ticket.assignee) lines.push(`- Assignee: ${ticket.assignee}`);

    lines.push(`\n${ticket.content}`);
    return lines.join('\n');
  }

  private generateContent(title: string = 'Test CR'): string {
    return `## 1. Description

This is a test CR for ${title}.

## 2. Rationale

The rationale for this test CR is to validate system functionality.

## 3. Solution Analysis

### Options Considered
1. Option A: Test approach A
2. Option B: Test approach B

### Recommended Solution
Use the standard test approach for validation.

## 4. Implementation Specification

### Steps
1. Implement test case
2. Validate functionality
3. Document results

### Dependencies
- None

## 5. Acceptance Criteria

- [ ] Test case implemented
- [ ] Functionality validated
- [ ] Documentation complete`;
  }
}