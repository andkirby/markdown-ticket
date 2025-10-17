# MDT CLI Tool - Business Requirements

## Overview
The `mdt` command-line tool provides quick access to Markdown Ticket (MDT) information through a simple, intuitive interface. The tool integrates with MCP (Model Context Protocol) to fetch ticket data and uses LLM to generate intelligent summaries.

## Functional Requirements

### 1. Command Interface
**Requirement**: Users shall be able to query tickets using the command `mdt MDT-66`

**Acceptance Criteria**:
- Command accepts ticket identifier in format `{project code}-{number}`
- Tool normalizes ticket numbers to 3-digit format (e.g., `MDT-1` → `MDT-001`)
- Command handles variations like `AAA-1` → `AAA-001`
- Invalid formats display helpful error messages

### 2. MCP Integration
**Requirement**: Tool shall connect to MCP server for ticket data retrieval

**Acceptance Criteria**:
- Connects to MCP server at: `node $HOME/home/markdown-ticket/mcp-server/dist/index.js`
- Retrieves ticket attributes using `get_cr` tool
- Fetches ticket sections using `list_cr_sections` and `get_cr_section` tools
- Handles MCP connection errors gracefully

### 3. Ticket Information Display
**Requirement**: Tool shall display key ticket metadata in a structured format

**Acceptance Criteria**:
- Output format: `[Key | Type | Priority | Status]` with color coding
- Title displayed in bold white text
- Color scheme used for visual clarity:
  - Key: Cyan
  - Type: Green
  - Priority: Yellow/Red based on level
  - Status: Blue/Green based on state

### 4. Content Processing
**Requirement**: Tool shall extract and process specific ticket sections

**Acceptance Criteria**:
- Automatically identifies and extracts "description" section
- Automatically identifies and extracts "rationale" section
- Uses section-based tools for efficient content retrieval
- Handles missing sections gracefully

### 5. LLM Integration
**Requirement**: Tool shall generate intelligent summaries using local LLM

**Acceptance Criteria**:
- Integrates with Ollama server (localhost:11434/v1)
- Uses guidance library for structured prompting
- Feeds description and rationale content to LLM
- Generates concise summaries (10-20 words)
- Follows existing system prompt pattern from `system_prompt.py`

### 6. Output Format
**Requirement**: Tool shall present information in a clean, readable format

**Acceptance Criteria**:
```
[MDT-066 | Feature Enhancement | High | In Progress]
**Implement User Authentication System**

Enhance application security by adding comprehensive user authentication with JWT tokens, role-based access control, and secure session management.
```

## Non-Functional Requirements

### 7. Performance
**Requirement**: Tool shall provide responsive user experience

**Acceptance Criteria**:
- Command execution completes within 5 seconds
- MCP connection timeout handled gracefully
- LLM inference optimized for speed (gemma3:270m model)

### 8. Error Handling
**Requirement**: Tool shall handle errors gracefully and provide helpful feedback

**Acceptance Criteria**:
- Invalid ticket numbers show format examples
- MCP connection failures provide troubleshooting steps
- Missing tickets display appropriate message
- LLM errors fall back to displaying raw content

### 9. Configuration
**Requirement**: Tool shall use sensible defaults with optional customization

**Acceptance Criteria**:
- Default model: gemma3:270m (configurable)
- Default MCP server path (configurable)
- Default Ollama endpoint (configurable)
- Configuration via environment variables or config file

### 10. Dependencies
**Requirement**: Tool shall integrate with existing infrastructure

**Acceptance Criteria**:
- Requires Ollama server running locally
- Requires MCP server accessible at specified path
- Uses Python guidance library (existing dependency)
- Compatible with existing system prompt patterns

## Technical Constraints

### 11. Environment
- Python 3.8+ compatibility
- Unix-like OS support (macOS/Linux)
- Terminal with ANSI color support

### 12. Integration Points
- Ollama API compatibility (OpenAI-compatible endpoint)
- MCP server connection stability
- File system access for configuration

## Success Criteria

### 13. User Experience
- Single command provides complete ticket overview
- Visual formatting enhances readability
- Response time suitable for interactive use
- Error messages guide users to resolution

### 14. Data Quality
- Accurate retrieval of ticket metadata
- Complete extraction of relevant sections
- Meaningful LLM-generated summaries
- Consistent output formatting

## Future Enhancements

### 15. Extended Functionality (Post-MVP)
- Multiple ticket support (`mdt MDT-066 MDT-067`)
- Ticket listing (`mdt list --project MDT`)
- Status updates via CLI
- Integration with additional ticket systems
- Caching for improved performance