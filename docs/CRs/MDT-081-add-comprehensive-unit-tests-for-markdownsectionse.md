---
code: MDT-081
title: Add comprehensive unit tests for MarkdownSectionService code block parsing
status: Proposed
dateCreated: 2025-11-17T23:50:40.637Z
type: Bug Fix
priority: Medium
phaseEpic: Code Quality and Testing
---

# Add comprehensive unit tests for MarkdownSectionService code block parsing

## 1. Description

### Problem
- MarkdownSectionService in shared/services/MarkdownSectionService.ts incorrectly treats `#` comments inside code blocks as markdown headers, creating bogus sections
- Multiple code blocks are not all masked correctly due to line-based slicing bug in maskCodeBlocks method
- Discovered through DEB-036 test ticket showing bogus sections: `# This should be a comment, not a header`, `# This comment also should not be a header`, `# This should not be a header either`
- Debug script shows fix works but MCP tools still return bogus sections, indicating potential disconnect between compiled versions

### Affected Artifacts
- `shared/services/MarkdownSectionService.ts` (core section parsing with masking methods)
- `mcp-server/src/tools/index.ts` (MCP tool implementation using MarkdownSectionService)
- MCP server compiled version in `mcp-server/dist/shared/services/MarkdownSectionService.js`

### Scope
**Changes**:
- Create comprehensive unit test suite for MarkdownSectionService
- Test code block detection across multiple languages and edge cases
- Test masking/unmasking functionality with multiple code blocks
- Test section parsing with code blocks containing `#` comments
- Verify end-to-end MCP tool behavior with problematic content

**Unchanged**:
- MarkdownSectionService interface and method signatures
- MCP tool functionality and API
- Frontend section-based update workflows

### Test Cases
Test cases demonstrating these issues have been created in `docs/CRs/MDT-081/cases.md`. The file contains:

1. **Single Code Block Test** - Python code with `#` comments that incorrectly create sections
2. **Multiple Code Blocks Test** - Different languages (Python, JavaScript, Shell) all showing the same issue
3. **Edge Cases** - Unclosed code blocks, code blocks with header-like content, real-world examples
4. **Live Demonstration** - CR DEM-006 created to demonstrate the issue in production

These test cases clearly show how the current MarkdownSectionService incorrectly treats `#` comments inside code blocks as markdown headers, creating numerous bogus sections.

## 2. Decision

### Chosen Approach
Create exploratory unit test suite to isolate and verify the code block parsing fix.

### Rationale
- Need comprehensive test coverage to verify bug fix works correctly across all edge cases
- Unit tests will help identify any remaining issues in maskCodeBlocks logic for multiple code blocks
- Test-driven approach ensures fix is verified before considering issue resolved
- End-to-end tests will validate MCP tool behavior matches expected results

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Comprehensive unit test suite for code block parsing | **ACCEPTED** - Provides thorough verification of fix and isolation of issues |
| Manual testing only | Test MCP tools directly with test cases | Cannot isolate specific method issues, harder to verify edge cases |
| Skip testing, trust fix | Assume debug script verification sufficient | Debug script shows fix works but MCP tools still show bogus sections indicating disconnect |
| Integration tests only | Test only end-to-end MCP behavior | Won't isolate specific MarkdownSectionService method issues |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| Unit tests | MarkdownSectionService | Method calls to detectCodeBlocks, maskCodeBlocks, parseAllSections |
| Integration tests | MCP tools | manage_cr_sections tool calls |
| Test fixtures | MarkdownSectionService | Sample content with problematic patterns |

### Key Patterns
- Test-driven verification: Verify each method independently before integration
- Edge case coverage: Test multiple code blocks, nested blocks, various languages
- Mock isolation: Test service methods without MCP server dependencies
- End-to-end validation: Confirm MCP tools return expected section structures

## 5. Acceptance Criteria

### Functional
- [ ] Unit test file `MarkdownSectionService.test.ts` created with comprehensive test cases
- [ ] Test covers detectCodeBlocks method with single and multiple code blocks
- [ ] Test covers maskCodeBlocks method with multiple code blocks to verify line-based slicing fix
- [ ] Test covers parseAllSections method with content containing `#` comments in code blocks
- [ ] Integration test verifies MCP manage_cr_sections tool returns correct section count
- [ ] Test DEB-036 content produces only valid sections (no bogus sections from code comments)
- [ ] Test fixtures include edge cases: unclosed code blocks, mixed delimiters, language variations

### Non-Functional
- [ ] Test coverage >95% for MarkdownSectionService methods
- [ ] All tests pass in both development and compiled environments
- [ ] Tests run in <5 seconds for comprehensive suite
- [ ] Test isolation ensures no dependency on file system or external services

### Testing
- Unit: Test MarkdownSectionService.detectCodeBlocks() with various code block patterns → correct detection
- Unit: Test MarkdownSectionService.maskCodeBlocks() with multiple blocks → all blocks properly masked
- Unit: Test MarkdownSectionService.parseAllSections() with problematic content → no bogus sections
- Integration: Test MCP manage_cr_sections with DEB-036 content → correct section count and structure
- Manual: Create test ticket in DEB project with code blocks → verify section management works correctly
- Manual: Delete test ticket after verification → cleanup successful

## 6. Verification

### By CR Type
- **Bug Fix**: Unit tests verify code block comments no longer create sections, integration tests confirm MCP tools return correct results

### Metrics
- Unit test coverage: target >95% for MarkdownSectionService methods
- Test execution time: <5 seconds for comprehensive test suite
- Code block detection accuracy: 100% for test cases with various patterns
- Section parsing correctness: 0 bogus sections from code block comments
