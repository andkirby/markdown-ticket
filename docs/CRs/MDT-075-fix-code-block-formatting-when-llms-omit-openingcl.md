---
code: MDT-075
title: Fix code block formatting when LLMs omit opening/closing triple backticks
status: Proposed
dateCreated: 2025-10-26T14:32:22.054Z
type: Bug Fix
priority: Medium
---

# Fix code block formatting when LLMs omit opening/closing triple backticks

## 1. Description

LLMs sometimes generate code blocks without proper opening or closing triple backticks (```), causing code to display incorrectly as inline text or single-line blocks instead of proper multi-line code blocks. This affects readability and usability of ticket content that contains code examples.

**Current State**: Code blocks may be missing opening ```, closing ```, or both, causing them to render as regular text.

**Desired State**: All code blocks should be properly formatted with correct opening and closing triple backticks for proper rendering.

## 2. Rationale

Proper code block formatting is essential for:
- Readability of technical documentation and examples
- Code sharing and review workflows
- Maintaining professional appearance of ticket content
- Ensuring code syntax highlighting works correctly

## 3. Solution Analysis
**Evaluated Alternatives:**

1. **Manual Fix Only**: Require users to manually edit malformed code blocks
   - *Pros*: Simple, no code changes needed
   - *Cons*: Poor UX, repetitive task for users

2. **Auto-correction with Preview**: Automatically fix malformed code blocks with user confirmation
   - *Pros*: Seamless UX, fixes existing issues
   - *Cons*: Risk of over-correction, may change user intent

3. **Validation Only**: Detect and flag malformed code blocks without automatic changes
   - *Pros*: Safe, maintains user control, educational
   - *Cons*: Requires manual intervention from users

**Selected Approach**: **Validation Only** with clear error indicators
- Detect malformed code blocks and provide specific validation feedback
- Highlight exact issues (missing opening/closing backticks, mismatched language specifiers)
- Guide users to fix issues manually with clear instructions
- Focus on proper pairing of opening/closing backticks, especially for specialized blocks

**Key Validation Rules:**
- All opening ``` must have corresponding closing ```
- Language specifiers must match (```json must end with ``, not ```javascript)
- Detect unclosed or orphaned code blocks
- Flag code blocks that appear intended but lack proper formatting
## 4. Implementation Specification
### Phase 1: Detection Logic
1. **Pattern Recognition**: Create regex patterns to detect:
   - Code blocks missing opening ``` but with closing ```
   - Code blocks with opening ``` but missing closing ```
   - Mismatched language specifiers (```json...```javascript)
   - Orphaned code block delimiters
   - Content that appears to be code but lacks proper formatting

2. **Context Analysis**: Use heuristics to identify likely code blocks:
   - Lines containing programming syntax (functions, variables, imports)
   - Common code patterns (if statements, loops, class definitions)
   - Lines following code-like formatting (indentation, brackets)

### Phase 2: Validation Service
1. **Service Implementation**: Add to `server/services/CodeBlockValidationService.ts`
   - `validateCodeBlocks(content: string)`: Detect and report issues
   - `generateValidationReport(content: string)`: Return detailed error list
   - `getValidationSuggestions(issue: ValidationIssue)`: Provide fix suggestions

2. **API Endpoint**: Add `/api/code-blocks/validate` endpoint for validation

### Phase 3: Frontend Integration
1. **Validation UI**: Show visual indicators for code block validation errors
2. **Error Display**: Display specific validation messages with line numbers
3. **Guidance**: Provide clear instructions on how to fix each type of validation error
4. **Real-time Validation**: Show validation results in markdown editor

### Phase 4: Editor Enhancements
1. **Validation Toolbar**: Add code block validation tools to editor
2. **Template Improvements**: Better templates with proper code block examples
3. **Auto-completion**: Suggest proper closing tags when opening code blocks
## 5. Acceptance Criteria
- [ ] Backend service can detect code blocks missing opening or closing triple backticks
- [ ] Backend detects mismatched language specifiers (```json...```javascript)
- [ ] Backend provides detailed validation reports with line numbers and error descriptions
- [ ] Frontend shows visual indicators for code block validation errors
- [ ] Users receive clear, actionable guidance on how to fix each validation error
- [ ] Real-time validation in markdown editor as users type
- [ ] System handles edge cases (nested blocks, ambiguous content) without false positives
- [ ] No performance degradation for existing ticket display
- [ ] Comprehensive test coverage for validation logic and error reporting
- [ ] Documentation updated for new code block validation features
- [ ] Validation is educational - helps users learn proper code block formatting
