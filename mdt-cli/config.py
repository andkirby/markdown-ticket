import os
from pathlib import Path
from typing import Optional


class Config:
    """Configuration management for MDT CLI."""

    # Exit codes
    EXIT_SUCCESS = 0
    EXIT_INVALID_INPUT = 1
    EXIT_MCP_ERROR = 2
    EXIT_LLM_ERROR = 3
    EXIT_TICKET_NOT_FOUND = 4
    EXIT_CONFIG_ERROR = 5
    EXIT_GENERAL_ERROR = 6

    # Default values
    DEFAULT_MCP_SERVER = str(Path.home() / "home" / "markdown-ticket" / "mcp-server" / "dist" / "index.js")
    DEFAULT_OLLAMA_URL = "http://localhost:11434/v1"
    DEFAULT_MODEL = "gemma3:270m"
    DEFAULT_TIMEOUT = 30
    DEFAULT_MAX_RETRIES = 3

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

    @classmethod
    def get_timeout(cls) -> int:
        """Get timeout setting from environment or default."""
        try:
            return int(os.getenv('MDT_TIMEOUT', str(cls.DEFAULT_TIMEOUT)))
        except ValueError:
            return cls.DEFAULT_TIMEOUT

    @classmethod
    def get_max_retries(cls) -> int:
        """Get max retries setting from environment or default."""
        try:
            return int(os.getenv('MDT_MAX_RETRIES', str(cls.DEFAULT_MAX_RETRIES)))
        except ValueError:
            return cls.DEFAULT_MAX_RETRIES

    @classmethod
    def get_debug_mode(cls) -> bool:
        """Get debug mode from environment or default."""
        return os.getenv('MDT_DEBUG', '').lower() in ('true', '1', 'yes', 'on')

    @classmethod
    def validate_mcp_server_path(cls, server_path: str) -> bool:
        """Validate MCP server path for security."""
        try:
            path = Path(server_path).resolve()

            # Check if path exists and is a file
            if not path.is_file():
                return False

            # Check if it's a JavaScript/Node.js file
            if not path.suffix in ['.js', '.mjs']:
                return False

            # Check if path is within reasonable bounds (prevent absolute path traversal)
            # Allow paths in home directory, /usr/local/bin, /opt, or current working directory
            allowed_prefixes = [
                Path.home(),
                Path('/usr/local/bin'),
                Path('/opt'),
                Path.cwd()
            ]

            return any(
                str(path).startswith(str(prefix))
                for prefix in allowed_prefixes
            )

        except (OSError, ValueError):
            return False

    @classmethod
    def validate_config(cls) -> list[str]:
        """Validate current configuration and return list of issues."""
        issues = []

        # Check MCP server path
        mcp_path = cls.get_mcp_server_path()
        if not cls.validate_mcp_server_path(mcp_path):
            if not os.path.exists(mcp_path):
                issues.append(f"MCP server not found at: {mcp_path}")
            else:
                issues.append(f"MCP server path validation failed: {mcp_path} (must be .js/.mjs file in allowed directory)")

        # Check if Ollama URL is reachable (basic check)
        ollama_url = cls.get_ollama_url()
        if not ollama_url.startswith(('http://', 'https://')):
            issues.append(f"Invalid Ollama URL format: {ollama_url}")

        # Check timeout value
        timeout = cls.get_timeout()
        if timeout <= 0:
            issues.append(f"Invalid timeout value: {timeout}")

        return issues

    @classmethod
    def print_config_info(cls):
        """Print current configuration for debugging."""
        print("MDT CLI Configuration:")
        print(f"  MCP Server: {cls.get_mcp_server_path()}")
        print(f"  Ollama URL: {cls.get_ollama_url()}")
        print(f"  Model: {cls.get_model()}")
        print(f"  Timeout: {cls.get_timeout()}s")
        print(f"  Max Retries: {cls.get_max_retries()}")
        print(f"  Debug Mode: {cls.get_debug_mode()}")