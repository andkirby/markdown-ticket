# MDT CLI Tool

A command-line tool for displaying Markdown Ticket (MDT) information with AI-generated summaries.

## Features

- Query tickets using simple identifiers (e.g., `MDT-066`)
- Automatic ticket format normalization
- Colored output for better readability
- AI-powered summaries using local Ollama models
- MCP (Model Context Protocol) integration for ticket data
- Graceful error handling and fallbacks

## Installation

### Prerequisites

1. **Ollama Server**: Make sure Ollama is running locally with OpenAI compatibility:
   ```bash
   # Install Ollama if not already installed
   curl -fsSL https://ollama.ai/install.sh | sh

   # Start Ollama server
   ollama serve

   # Pull required model
   ollama pull gemma3:270m
   ```

2. **MCP Server**: Ensure the MCP server is available at the expected location:
   ```bash
   # Default location: ~/home/markdown-ticket/mcp-server/dist/index.js
   ```

### Setup

```bash
# Clone or navigate to the mdt-cli directory
cd mdt-cli

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Make the CLI executable
chmod +x mdt.py

# Create symlink for global access (optional)
sudo ln -s $(pwd)/mdt.py /usr/local/bin/mdt
```

## Usage

### Basic Usage

```bash
# Display ticket information
mdt MDT-066

# Case insensitive input
mdt mdt-66

# Verbose output
mdt MDT-066 --verbose

# Debug mode
mdt MDT-066 --debug
```

### Configuration Options

```bash
# Show current configuration
mdt --config-info

# Environment variables
export MDT_MODEL="gemma3:270m"
export MDT_OLLAMA_URL="http://localhost:11434/v1"
export MDT_MCP_SERVER="$HOME/home/markdown-ticket/mcp-server/dist/index.js"
export MDT_TIMEOUT=30
export MDT_DEBUG=true
```

## Output Format

```
[MDT-066 | Feature Enhancement | High | In Progress]
**Implement User Authentication System**

Enhance application security by adding comprehensive user authentication with JWT tokens, role-based access control, and secure session management.
```

## Error Handling

The tool provides helpful error messages for common issues:

- Invalid ticket formats
- MCP server connection problems
- Missing tickets
- LLM processing failures (with fallback content display)

## Development

### Project Structure

```
mdt-cli/
├── mdt.py                 # Main CLI entry point
├── ticket_normalizer.py   # Input validation and normalization
├── mcp_client.py         # MCP server integration
├── llm_processor.py      # LLM integration for summaries
├── output_formatter.py   # Display formatting and colors
├── config.py            # Configuration management
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

### Testing Components

```bash
# Test ticket normalization
python3 -c "
from ticket_normalizer import TicketNormalizer
for test in ['MDT-66', 'AAA-1', 'mdt-66']:
    result = TicketNormalizer.normalize(test)
    print(f'{test} -> {result}')
"

# Test configuration
python3 -c "
from config import Config
Config.print_config_info()
print('Issues:', Config.validate_config())
"
```

## Troubleshooting

### Common Issues

1. **MCP Server Not Found**
   - Check that the MCP server exists at `~/home/markdown-ticket/mcp-server/dist/index.js`
   - Set `MDT_MCP_SERVER` environment variable to correct path

2. **Ollama Connection Failed**
   - Ensure Ollama is running: `ollama serve`
   - Check that the model is pulled: `ollama pull gemma3:270m`
   - Verify URL: `curl http://localhost:11434/v1/models`

3. **Permission Denied**
   - Make the script executable: `chmod +x mdt.py`
   - Check Python virtual environment is activated

### Debug Mode

Use debug mode for detailed troubleshooting:

```bash
mdt MDT-066 --debug
```

## License

This project follows the same license as the parent project.