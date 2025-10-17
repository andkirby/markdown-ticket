#!/usr/bin/env python3
import os
import sys
import click
import logging
from ticket_normalizer import TicketNormalizer
from mcp_client import MCPClient, MCPClientError
from llm_processor import LLMProcessor, LLMProcessorError
from output_formatter import OutputFormatter
from config import Config


def setup_debug_logging():
    """Setup debug logging if enabled."""
    if Config.get_debug_mode():
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        logger = logging.getLogger(__name__)
        logger.debug("Debug mode enabled")


@click.command()
@click.argument('ticket_id', required=False)
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
@click.option('--debug', is_flag=True, help='Enable debug mode with detailed logging')
@click.option('--config-info', is_flag=True, help='Show current configuration and exit')
def main(ticket_id: str, verbose: bool, debug: bool, config_info: bool):
    """
    MDT CLI - Display Markdown Ticket information with AI summaries.

    Examples:
        mdt MDT-066
        mdt AAA-1
        mdt mdt-66
        mdt MDT-66 --verbose
        mdt --config-info
    """
    try:
        # Handle config info flag
        if config_info:
            Config.print_config_info()

            # Validate and show any config issues
            issues = Config.validate_config()
            if issues:
                print("\nConfiguration Issues:")
                for issue in issues:
                    print(f"  ⚠️  {issue}")
            else:
                print("\n✅ Configuration is valid")
            return

        # Validate that ticket_id is provided when not using config-info
        if not ticket_id:
            print(OutputFormatter.format_error("Error: TICKET_ID is required"))
            print("Use 'mdt.py --help' for usage information.")
            sys.exit(Config.EXIT_INVALID_INPUT)

        # Set debug mode if requested
        if debug:
            os.environ['MDT_DEBUG'] = 'true'
            setup_debug_logging()

        # Step 1: Normalize ticket input
        normalized = TicketNormalizer.normalize(ticket_id)
        if not normalized:
            error_msg = TicketNormalizer.format_error(ticket_id)
            print(OutputFormatter.format_error(error_msg))
            sys.exit(Config.EXIT_INVALID_INPUT)

        project, number = normalized
        full_key = f"{project}-{number}"

        if verbose:
            print(f"Fetching ticket: {full_key}")

        # Step 2: Validate configuration
        config_issues = Config.validate_config()
        if config_issues:
            print(OutputFormatter.format_warning("Configuration issues detected:"))
            for issue in config_issues:
                print(f"  ⚠️  {issue}")
            print()  # Add spacing

            # If there are critical config issues, exit with error
            critical_issues = [issue for issue in config_issues if "not found" in issue.lower()]
            if critical_issues:
                print(OutputFormatter.format_error("Critical configuration issues found. Please resolve before continuing."))
                sys.exit(Config.EXIT_CONFIG_ERROR)

        # Step 3: Fetch ticket data via MCP
        try:
            mcp_client = MCPClient(Config.get_mcp_server_path())
            ticket_data = mcp_client.get_ticket(project, full_key)

            if not ticket_data:
                print(OutputFormatter.format_error(f"Ticket not found: {full_key}"))
                sys.exit(Config.EXIT_TICKET_NOT_FOUND)

        except MCPClientError as e:
            print(OutputFormatter.format_error(f"MCP Error: {e}"))
            if verbose:
                print(f"Check if MCP server is running at: {Config.get_mcp_server_path()}")
            sys.exit(Config.EXIT_MCP_ERROR)

        # Step 4: Display basic ticket information immediately
        basic_output = OutputFormatter.format_basic_ticket_display(ticket_data)
        print(basic_output)

        # Step 5: Generate and display summary (non-blocking)
        try:
            # Show that summary is being generated
            if verbose:
                print(OutputFormatter.format_info("Generating AI summary..."), end='', flush=True)

            llm_processor = LLMProcessor(Config.get_model(), Config.get_ollama_url())

            # Combine content for processing
            content_parts = []
            if ticket_data.description:
                content_parts.append(ticket_data.description)
            if ticket_data.rationale:
                content_parts.append(ticket_data.rationale)

            if content_parts:
                content = "\n\n".join(content_parts)
            elif ticket_data.title:
                content = ticket_data.title
            else:
                content = None

            if content:
                summary = llm_processor.generate_summary(content, "")

                # Clear the "generating" message and display the summary
                if verbose:
                    print("\r" + " " * 50 + "\r", end='')  # Clear the line

                print(OutputFormatter.format_summary_section(summary))
            else:
                if verbose:
                    print()  # New line after "generating" message
                print(OutputFormatter.format_summary_section("No content available for summary"))

        except LLMProcessorError as e:
            if verbose:
                print()  # New line after "generating" message
            print(OutputFormatter.format_warning(f"LLM processing failed: {e}"))
            print(OutputFormatter.format_summary_section("Summary generation failed"))
            if verbose:
                print("Continuing with basic ticket display...")

    except KeyboardInterrupt:
        print("\nOperation cancelled.")
        sys.exit(Config.EXIT_GENERAL_ERROR)
    except Exception as e:
        if debug or verbose:
            import traceback
            traceback.print_exc()
        else:
            print(OutputFormatter.format_error(f"Error: {e}"))
        sys.exit(Config.EXIT_GENERAL_ERROR)


if __name__ == '__main__':
    main()