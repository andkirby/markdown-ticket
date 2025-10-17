import subprocess
import json
from typing import Dict, Any, Optional
from dataclasses import dataclass
from config import Config


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


class MCPClientError(Exception):
    """Custom exception for MCP client errors."""
    pass


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
            attrs_text = self._call_mcp_tool("get_cr", {
                "project": project,
                "key": key
            })

            if not attrs_text:
                return None

            # Parse the formatted text response
            attrs = self._parse_cr_response(attrs_text, key)

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
            raise MCPClientError(f"Error fetching ticket {key}: {e}")

    def _get_ticket_sections(self, project: str, key: str) -> Dict[str, str]:
        """Extract description and rationale sections."""
        sections = {}

        try:
            # Look for description and rationale sections
            section_names = ["## Description", "## Rationale"]

            for section_name in section_names:
                try:
                    content = self._call_mcp_tool("get_cr_section", {
                        "project": project,
                        "key": key,
                        "section": section_name
                    })
                    if content:
                        # Extract actual content from formatted response
                        extracted_content = self._extract_section_content(content)
                        if extracted_content:
                            # Map to simple names
                            simple_name = section_name.replace("## ", "").lower()
                            sections[simple_name] = extracted_content
                except Exception as e:
                    # Continue with other sections if one fails
                    print(f"Warning: Could not fetch section {section_name} for {key}: {e}")

        except Exception as e:
            # Don't raise exception for section errors, just log warning
            print(f"Warning: Could not fetch sections for {key}: {e}")

        return sections

    def _extract_section_content(self, response_text: str) -> str:
        """Extract actual content from the formatted section response."""
        lines = response_text.split('\n')
        content_lines = []
        capture = False

        for line in lines:
            if line.strip() == '---':
                if capture:
                    # End of content
                    break
                else:
                    # Start of content
                    capture = True
                    continue
            elif capture:
                # Capture content lines
                if line.strip() and not line.startswith('📖') and not line.startswith('**Section:') and not line.startswith('**Content Length:'):
                    content_lines.append(line)

        return '\n'.join(content_lines).strip()

    def _parse_cr_response(self, response_text: str, key: str) -> Dict[str, str]:
        """Parse the formatted text response from get_cr tool."""
        attrs = {
            "key": key,
            "title": "No Title",
            "type": "Unknown",
            "priority": "Medium",
            "status": "Unknown"
        }

        lines = response_text.split('\n')
        current_field = None

        for line in lines:
            line = line.strip()

            # Extract title from the header line
            if line.startswith('📄 **') and ' - ' in line:
                # Format: 📄 **MDT-066** - Title
                parts = line.split(' - ', 1)
                if len(parts) == 2:
                    title = parts[1].rstrip('*')
                    attrs["title"] = title.strip()
                continue

            # Look for metadata fields
            if line.startswith('- Status:'):
                attrs["status"] = line.replace('- Status:', '').strip()
            elif line.startswith('- Type:'):
                attrs["type"] = line.replace('- Type:', '').strip()
            elif line.startswith('- Priority:'):
                attrs["priority"] = line.replace('- Priority:', '').strip()

        return attrs

    def _call_mcp_tool(self, tool_name: str, params: Dict[str, Any]) -> Any:
        """Execute MCP tool call using JSON-RPC protocol."""
        process = None
        try:
            # Create JSON-RPC request
            request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": params
                }
            }

            # Start MCP server process
            process = subprocess.Popen(
                ["node", self.server_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            # Send JSON-RPC request
            request_json = json.dumps(request) + "\n"
            stdout, stderr = process.communicate(input=request_json, timeout=Config.get_timeout())

            if process.returncode != 0:
                error_msg = stderr.strip() if stderr else "Unknown error"
                raise MCPClientError(f"MCP server error: {error_msg}")

            # Parse JSON-RPC response
            try:
                # Handle multi-line output (server logs + JSON)
                lines = stdout.strip().split('\n')
                json_line = None
                for line in reversed(lines):  # Look from the end for JSON
                    if line.strip().startswith('{'):
                        json_line = line.strip()
                        break

                if not json_line:
                    raise MCPClientError("No JSON response found in MCP server output")

                response = json.loads(json_line)
                if "error" in response:
                    raise MCPClientError(f"MCP tool error: {response['error']}")
                if "result" in response:
                    result = response["result"]
                    # Handle MCP response format with content array
                    if isinstance(result, dict) and "content" in result:
                        if isinstance(result["content"], list) and len(result["content"]) > 0:
                            # Extract text from content items
                            text_content = ""
                            for item in result["content"]:
                                if isinstance(item, dict) and "text" in item:
                                    text_content += item["text"]
                            return text_content
                    return result
                else:
                    raise MCPClientError("Invalid MCP response format")
            except json.JSONDecodeError as e:
                raise MCPClientError(f"Invalid JSON response from MCP server: {e}")

        except subprocess.TimeoutExpired:
            if process:
                process.kill()
                process.wait()
            raise MCPClientError("MCP server timeout")
        except FileNotFoundError:
            raise MCPClientError(f"MCP server not found at {self.server_path}")
        except Exception as e:
            if process:
                process.kill()
                process.wait()
            raise MCPClientError(f"Unexpected error calling MCP server: {e}")
        finally:
            # Ensure process is always cleaned up
            if process and process.poll() is None:
                process.kill()
                process.wait()