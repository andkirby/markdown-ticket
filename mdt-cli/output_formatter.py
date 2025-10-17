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
            f"[ {cls.COLORS['key']}{ticket_data.key}{Style.RESET_ALL} | "
            f"{cls.COLORS['type']}{ticket_data.type}{Style.RESET_ALL} | "
            f"{priority_color}{ticket_data.priority}{Style.RESET_ALL} | "
            f"{status_color}{ticket_data.status}{Style.RESET_ALL} ]"
        )

    @staticmethod
    def _get_priority_color(priority: str) -> str:
        """Get color based on priority level."""
        priority_colors = {
            'Critical': Fore.RED,
            'High': Fore.LIGHTRED_EX,
            'Medium': Fore.YELLOW,
            'Low': Fore.LIGHTYELLOW_EX,
            'Critical/High': Fore.RED,
            'Highest': Fore.RED,
            'Lowest': Fore.LIGHTYELLOW_EX
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
            'On Hold': Fore.MAGENTA,
            'Closed': Fore.LIGHTBLACK_EX,
            'Done': Fore.LIGHTGREEN_EX,
            'Ready': Fore.GREEN,
            'Blocked': Fore.RED,
            'Review': Fore.YELLOW
        }
        return status_colors.get(status, Fore.BLUE)

    @staticmethod
    def format_error(message: str) -> str:
        """Format error message with red color."""
        return f"{Fore.RED}{message}{Style.RESET_ALL}"

    @staticmethod
    def format_warning(message: str) -> str:
        """Format warning message with yellow color."""
        return f"{Fore.YELLOW}{message}{Style.RESET_ALL}"

    @staticmethod
    def format_success(message: str) -> str:
        """Format success message with green color."""
        return f"{Fore.GREEN}{message}{Style.RESET_ALL}"

    @staticmethod
    def format_info(message: str) -> str:
        """Format info message with blue color."""
        return f"{Fore.BLUE}{message}{Style.RESET_ALL}"

    @classmethod
    def format_basic_ticket_display(cls, ticket_data: 'TicketData') -> str:
        """
        Format basic ticket information for immediate display.

        Args:
            ticket_data: Ticket information

        Returns:
            Formatted string with header and title
        """
        # Format header with colors
        header = cls._format_header(ticket_data)

        # Format title
        title = f"{Style.BRIGHT}{cls.COLORS['title']}{ticket_data.title}{Style.RESET_ALL}"

        return f"{header}\n{title}"

    @classmethod
    def format_summary_section(cls, summary: str) -> str:
        """
        Format the summary section for display.

        Args:
            summary: Summary text to display

        Returns:
            Formatted summary string
        """
        # Add spacing and format summary
        summary_line = f"\n{cls.COLORS['summary']}{summary}{Style.RESET_ALL}"
        return summary_line