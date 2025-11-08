# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Python command-line tool for displaying Markdown Ticket (MDT) information with AI-generated summaries. The tool integrates with MCP (Model Context Protocol) servers to fetch ticket data and uses local Ollama models to generate intelligent summaries.

## Architecture

### Core Components

- **mdt.py** - Main CLI entry point using Click framework
- **ticket_normalizer.py** - Input validation and ticket ID normalization (e.g., "MDT-66" → "MDT-066")
- **mcp_client.py** - MCP server integration using JSON-RPC protocol for ticket data retrieval
- **llm_processor.py** - LLM integration using guidance library for summary generation
- **output_formatter.py** - Colorized terminal output formatting using colorama
- **config.py** - Configuration management with environment variable support

### Data Flow

1. **Input Processing**: Ticket ID normalized via `TicketNormalizer.normalize()`
2. **Data Retrieval**: `MCPClient.get_ticket()` fetches ticket metadata and sections via MCP protocol
3. **Content Processing**: Description and rationale sections extracted for LLM processing
4. **Summary Generation**: `LLMProcessor.generate_summary()` creates 10-20 word summaries using local Ollama models
5. **Output Formatting**: `OutputFormatter.format_ticket_display()` produces colorized terminal output

## Development Commands

### Environment Setup
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Make CLI executable
chmod +x mdt.py
```

### Running the Tool
```bash
# Basic usage
./mdt.py MDT-066

# With options
./mdt.py MDT-066 --verbose --debug

# Configuration info
./mdt.py --config-info
```

### Testing Components
```bash
# Test ticket normalization
python3 -c "from ticket_normalizer import TicketNormalizer; print(TicketNormalizer.normalize('MDT-66'))"

# Test configuration
python3 -c "from config import Config; Config.print_config_info()"

# Test MCP connection (requires server)
python3 -c "from mcp_client import MCPClient; from config import Config; client = MCPClient(Config.get_mcp_server_path()); print('MCP client initialized')"
```

## Configuration

### Environment Variables
- `MDT_MCP_SERVER` - Path to MCP server (default: `~/home/markdown-ticket/mcp-server/dist/index.js`)
- `MDT_OLLAMA_URL` - Ollama API endpoint (default: `http://localhost:11434/v1`)
- `MDT_MODEL` - LLM model name (default: `gemma3:270m`)
- `MDT_TIMEOUT` - Request timeout in seconds (default: 30)
- `MDT_DEBUG` - Enable debug mode (default: false)

### Prerequisites
- Ollama server running locally with required model: `ollama pull gemma3:270m`
- MCP server available at configured path
- Node.js runtime for MCP server execution

## Error Handling

The tool implements graceful error handling with fallbacks:
- Invalid ticket formats show helpful examples
- MCP connection failures provide troubleshooting guidance
- LLM processing failures fall back to raw content display
- Missing tickets or sections are handled gracefully

## MCP Integration

The tool uses JSON-RPC protocol to communicate with MCP servers:
- Calls `get_cr` tool for basic ticket attributes
- Uses `get_cr_section` tool for description and rationale content
- Handles MCP server output parsing and content extraction
- Implements proper timeout and error handling for subprocess communication