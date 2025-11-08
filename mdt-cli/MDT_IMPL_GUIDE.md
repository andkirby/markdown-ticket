# MDT CLI Tool - Implementation Guide

## Architecture Overview

The `mdt` CLI tool follows a modular architecture with clear separation of concerns:

```
mdt.py (main entry point)
├── TicketNormalizer (input validation)
├── MCPClient (data retrieval)
├── LLMProcessor (summary generation)
└── OutputFormatter (display logic)
```

## Implementation Steps

### 1. Project Structure
```bash
mdt-cli/
├── mdt.py                 # Main CLI entry point
├── ticket_normalizer.py   # Input validation and normalization
├── mcp_client.py         # MCP server integration
├── llm_processor.py      # LLM integration for summaries
├── output_formatter.py   # Display formatting and colors
├── config.py            # Configuration management
├── requirements.txt     # Python dependencies
└── MDT_CLI_GUIDE.md     # This file
```

### 2. Core Dependencies
```bash
# requirements.txt
guidance>=0.1.0
click>=8.0.0             # CLI framework
colorama>=0.4.0          # Cross-platform colors
pydantic>=2.0.0          # Data validation
python-dotenv>=1.0.0     # Environment variables
```

### 3. Ticket Normalization (`ticket_normalizer.py`)

```python
import re
from typing import Optional, Tuple

class TicketNormalizer:
    """Handles ticket identifier validation and normalization."""

    @staticmethod
    def normalize(ticket_id: str) -> Optional[Tuple[str, str]]:
        """
        Normalize ticket ID to format PROJECT-001.

        Args:
            ticket_id: Input like "MDT-66", "AAA-1", "mdt-66"

        Returns:
            Tuple of (project, number) or None if invalid
        """
        # Remove whitespace and convert to uppercase
        ticket_id = ticket_id.strip().upper()

        # Match pattern: PROJECT-NUMBER
        match = re.match(r'^([A-Z]+)-(\d+)$', ticket_id)
        if not match:
            return None

        project, number = match.groups()

        # Pad number to 3 digits
        normalized_number = number.zfill(3)

        return project, normalized_number

    @staticmethod
    def format_error(ticket_id: str) -> str:
        """Generate helpful error message for invalid ticket format."""
        return f"Invalid ticket format: '{ticket_id}'. Expected format: PROJECT-NUMBER (e.g., MDT-066)"
```

### 4. MCP Client Integration (`mcp_client.py`)

```python
import subprocess
import json
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class TicketData:
    """Data structure for ticket information."""
    key: str
    title: str
    type: str
    priority: str
    status: str
    description: Optional[str] = None
    rationale: Optional[str] = None

class MCPClient:
    """Handles communication with MCP server."""

    def __init__(self, server_path: str):
        self.server_path = server_path

    def get_ticket(self, project: str, key: str) -> Optional[TicketData]:
        """
        Retrieve complete ticket information from MCP server.

        Args:
            project: Project code (e.g., "MDT")
            key: Full ticket key (e.g., "MDT-066")

        Returns:
            TicketData object or None if not found
        """
        try:
            # Get basic ticket attributes
            attrs = self._call_mcp_tool("get_cr", {
                "project": project,
                "key": key
            })

            if not attrs:
                return None

            # Get sections for description and rationale
            sections = self._get_ticket_sections(project, key)

            return TicketData(
                key=attrs.get("key", key),
                title=attrs.get("title", "No Title"),
                type=attrs.get("type", "Unknown"),
                priority=attrs.get("priority", "Medium"),
                status=attrs.get("status", "Unknown"),
                description=sections.get("description"),
                rationale=sections.get("rationale")
            )

        except Exception as e:
            print(f"Error fetching ticket: {e}")
            return None

    def _get_ticket_sections(self, project: str, key: str) -> Dict[str, str]:
        """Extract description and rationale sections."""
        sections = {}

        try:
            # List available sections
            section_list = self._call_mcp_tool("list_cr_sections", {
                "project": project,
                "key": key
            })

            # Look for description and rationale sections
            for section_name in ["description", "rationale", "Description", "Rationale"]:
                if section_name in str(section_list):
                    content = self._call_mcp_tool("get_cr_section", {
                        "project": project,
                        "key": key,
                        "section": section_name
                    })
                    if content:
                        sections[section_name.lower()] = content

        except Exception as e:
            print(f"Warning: Could not fetch sections: {e}")

        return sections

    def _call_mcp_tool(self, tool_name: str, params: Dict[str, Any]) -> Any:
        """Execute MCP tool call."""
        # This is a simplified implementation
        # In practice, you'll need proper MCP client library integration
        cmd = [
            "node", self.server_path,
            "--tool", tool_name,
            "--params", json.dumps(params)
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return json.loads(result.stdout)
        return None
```

### 5. LLM Processor (`llm_processor.py`)

```python
from guidance import models, gen, system, user, assistant
from typing import Optional

class LLMProcessor:
    """Handles LLM integration for ticket summarization."""

    def __init__(self, model: str = "gemma3:270m", base_url: str = "http://localhost:11434/v1"):
        self.model = model
        self.base_url = base_url
        self.lm = models.OpenAI(model, api_key="not-needed", base_url=base_url)

    def generate_summary(self, description: str, rationale: str) -> str:
        """
        Generate concise summary of ticket content.

        Args:
            description: Ticket description content
            rationale: Ticket rationale content

        Returns:
            Generated summary (10-20 words)
        """
        # Combine content for processing
        content = f"Description: {description}\n\nRationale: {rationale}" if rationale else description

        # Use existing system prompt pattern
        system_prompt = """
You are a ticket-document reviewer, you provide professional short summary of a user text in 10-20 words.
Make a short summary of the user's text and explain:
- The essence of the fix or improvement being discussed in the document.
- Add technical specifics only.
- Provide straightforward text
Restrictions:
- DO NOT mention information reflected in title content.
- DO NOT add comments.
- DO not use markdown formatting.

Your summary:"""

        try:
            with system():
                self.lm += system_prompt

            with user():
                self.lm += content

            with assistant():
                self.lm += gen("output", max_tokens=150, temperature=0.3)

            return str(self.lm['output']).strip()

        except Exception as e:
            print(f"Warning: LLM processing failed: {e}")
            # Fallback: return first sentence of description
            sentences = description.split('. ')
            return sentences[0][:100] + "..." if len(sentences[0]) > 100 else sentences[0]
```

### 6. Output Formatter (`output_formatter.py`)

```python
from colorama import Fore, Style, init
from typing import Dict, Any

# Initialize colorama for cross-platform support
init(autoreset=True)

class OutputFormatter:
    """Handles ticket information display with colors."""

    # Color scheme
    COLORS = {
        'key': Fore.CYAN,
        'type': Fore.GREEN,
        'priority': Fore.YELLOW,
        'status': Fore.BLUE,
        'title': Fore.WHITE,
        'summary': Fore.LIGHTWHITE_EX
    }

    @classmethod
    def format_ticket_display(cls, ticket_data: 'TicketData', summary: str) -> str:
        """
        Format complete ticket display.

        Args:
            ticket_data: Ticket information
            summary: LLM-generated summary

        Returns:
            Formatted string ready for display
        """
        # Format header with colors
        header = cls._format_header(ticket_data)

        # Format title
        title = f"{Style.BRIGHT}{cls.COLORS['title']}{ticket_data.title}{Style.RESET_ALL}"

        # Format summary
        summary_line = f"{cls.COLORS['summary']}{summary}{Style.RESET_ALL}"

        return f"{header}\n{title}\n\n{summary_line}"

    @classmethod
    def _format_header(cls, ticket_data: 'TicketData') -> str:
        """Format the [Key | Type | Priority | Status] header."""
        # Priority coloring
        priority_color = cls._get_priority_color(ticket_data.priority)

        # Status coloring
        status_color = cls._get_status_color(ticket_data.status)

        return (
            f"[{cls.COLORS['key']}{ticket_data.key}{Style.RESET_ALL} | "
            f"{cls.COLORS['type']}{ticket_data.type}{Style.RESET_ALL} | "
            f"{priority_color}{ticket_data.priority}{Style.RESET_ALL} | "
            f"{status_color}{ticket_data.status}{Style.RESET_ALL}]"
        )

    @staticmethod
    def _get_priority_color(priority: str) -> str:
        """Get color based on priority level."""
        priority_colors = {
            'Critical': Fore.RED,
            'High': Fore.LIGHTRED_EX,
            'Medium': Fore.YELLOW,
            'Low': Fore.LIGHTYELLOW_EX
        }
        return priority_colors.get(priority, Fore.YELLOW)

    @staticmethod
    def _get_status_color(status: str) -> str:
        """Get color based on status."""
        status_colors = {
            'In Progress': Fore.BLUE,
            'Proposed': Fore.LIGHTBLUE_EX,
            'Approved': Fore.GREEN,
            'Implemented': Fore.LIGHTGREEN_EX,
            'Rejected': Fore.RED,
            'On Hold': Fore.MAGENTA
        }
        return status_colors.get(status, Fore.BLUE)
```

### 7. Configuration Management (`config.py`)

```python
import os
from pathlib import Path
from typing import Optional

class Config:
    """Configuration management for MDT CLI."""

    # Default values
    DEFAULT_MCP_SERVER = str(Path.home() / "home" / "markdown-ticket" / "mcp-server" / "dist" / "index.js")
    DEFAULT_OLLAMA_URL = "http://localhost:11434/v1"
    DEFAULT_MODEL = "gemma3:270m"

    @classmethod
    def get_mcp_server_path(cls) -> str:
        """Get MCP server path from environment or default."""
        return os.getenv('MDT_MCP_SERVER', cls.DEFAULT_MCP_SERVER)

    @classmethod
    def get_ollama_url(cls) -> str:
        """Get Ollama URL from environment or default."""
        return os.getenv('MDT_OLLAMA_URL', cls.DEFAULT_OLLAMA_URL)

    @classmethod
    def get_model(cls) -> str:
        """Get LLM model from environment or default."""
        return os.getenv('MDT_MODEL', cls.DEFAULT_MODEL)
```

### 8. Main CLI Entry Point (`mdt.py`)

```python
#!/usr/bin/env python3
import sys
import click
from ticket_normalizer import TicketNormalizer
from mcp_client import MCPClient
from llm_processor import LLMProcessor
from output_formatter import OutputFormatter
from config import Config

@click.command()
@click.argument('ticket_id')
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
def main(ticket_id: str, verbose: bool):
    """
    MDT CLI - Display Markdown Ticket information with AI summaries.

    Examples:
        mdt MDT-066
        mdt AAA-1
        mdt mdt-66
    """
    try:
        # Step 1: Normalize ticket input
        normalized = TicketNormalizer.normalize(ticket_id)
        if not normalized:
            print(TicketNormalizer.format_error(ticket_id))
            sys.exit(1)

        project, number = normalized
        full_key = f"{project}-{number}"

        if verbose:
            print(f"Fetching ticket: {full_key}")

        # Step 2: Fetch ticket data via MCP
        mcp_client = MCPClient(Config.get_mcp_server_path())
        ticket_data = mcp_client.get_ticket(project, full_key)

        if not ticket_data:
            print(f"Ticket not found: {full_key}")
            sys.exit(1)

        # Step 3: Generate summary using LLM
        llm_processor = LLMProcessor(Config.get_model(), Config.get_ollama_url())
        content = ""
        if ticket_data.description:
            content += ticket_data.description
        if ticket_data.rationale:
            content += f"\n\n{ticket_data.rationale}"

        summary = llm_processor.generate_summary(content, "") if content else "No content available for summary"

        # Step 4: Display formatted output
        output = OutputFormatter.format_ticket_display(ticket_data, summary)
        print(output)

    except KeyboardInterrupt:
        print("\nOperation cancelled.")
        sys.exit(1)
    except Exception as e:
        if verbose:
            import traceback
            traceback.print_exc()
        else:
            print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### 9. Installation and Setup

```bash
# 1. Create project directory
mkdir mdt-cli && cd mdt-cli

# 2. Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Make CLI executable
chmod +x mdt.py

# 5. Create symlink for global access (optional)
sudo ln -s $(pwd)/mdt.py /usr/local/bin/mdt
```

### 10. Development Testing

```bash
# Test ticket normalization
python3 -c "
from ticket_normalizer import TicketNormalizer
for test in ['MDT-66', 'AAA-1', 'mdt-66']:
    result = TicketNormalizer.normalize(test)
    print(f'{test} -> {result}')
"

# Test MCP connection
python3 -c "
from mcp_client import MCPClient
from config import Config
client = MCPClient(Config.get_mcp_server_path())
result = client._call_mcp_tool('list_projects', {})
print(result)
"

# Test LLM integration
python3 -c "
from llm_processor import LLMProcessor
processor = LLMProcessor()
summary = processor.generate_summary('Add user login feature', 'Required for security compliance')
print(summary)
"
```

### 11. Error Handling Strategy

1. **Input Validation**: Clear error messages for invalid ticket formats
2. **MCP Connection**: Graceful fallback when MCP server unavailable
3. **LLM Processing**: Fallback to raw content display when LLM fails
4. **Missing Data**: Handle missing sections or ticket data gracefully
5. **Network Issues**: Timeouts and retry logic for external dependencies

### 12. Performance Optimizations

1. **Lazy Loading**: Initialize LLM only when needed
2. **Caching**: Cache MCP responses for repeated queries
3. **Async Operations**: Consider async MCP calls for better responsiveness
4. **Minimal Content**: Extract only required sections to reduce token usage

### 13. Debug Mode

```python
# Add to mdt.py
@click.option('--debug', is_flag=True, help='Enable debug mode')
def main(ticket_id: str, verbose: bool, debug: bool):
    if debug:
        import logging
        logging.basicConfig(level=logging.DEBUG)
        # Add debug logging throughout components
```

This implementation guide provides a complete roadmap for building the `mdt` CLI tool with modular, testable components that integrate with your existing MCP infrastructure and LLM setup.