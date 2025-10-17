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