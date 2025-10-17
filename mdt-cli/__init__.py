"""
MDT CLI Tool - A command-line interface for managing and reviewing tickets.

This package provides tools for:
- Ticket ID validation and normalization
- MCP server communication
- LLM-powered ticket summarization
- Formatted terminal output
"""

__version__ = "1.0.0"
__author__ = "MDT CLI Team"

from .ticket_normalizer import TicketNormalizer
from .mcp_client import MCPClient, TicketData, MCPClientError
from .llm_processor import LLMProcessor, LLMProcessorError
from .output_formatter import OutputFormatter
from .config import Config

__all__ = [
    "TicketNormalizer",
    "MCPClient",
    "TicketData",
    "MCPClientError",
    "LLMProcessor",
    "LLMProcessorError",
    "OutputFormatter",
    "Config",
]