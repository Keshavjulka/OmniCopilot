"""
Tool Registry — central source of truth for all callable AI tools.
Each tool has a JSON schema (for Gemini function calling) and an async executor.
"""

import logging
from typing import Dict, Any, Callable, List

logger = logging.getLogger(__name__)


# ─── Tool Definitions (Gemini Function Calling Schema) ───────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "create_calendar_event",
        "description": (
            "Create a Google Calendar event. Optionally include a Google Meet link. "
            "Use this when the user wants to schedule a meeting, event, or appointment."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "Title/name of the event",
                },
                "description": {
                    "type": "string",
                    "description": "Optional description or agenda",
                },
                "start_datetime": {
                    "type": "string",
                    "description": "Start time in ISO 8601 format (e.g. 2024-12-25T19:00:00)",
                },
                "end_datetime": {
                    "type": "string",
                    "description": "End time in ISO 8601 format",
                },
                "attendee_emails": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of attendee email addresses",
                },
                "add_meet_link": {
                    "type": "boolean",
                    "description": "Whether to add a Google Meet video link",
                },
            },
            "required": ["summary", "start_datetime", "end_datetime"],
        },
    },
    {
        "name": "read_drive_file",
        "description": (
            "Search for and read a file from Google Drive. Extracts text from PDFs and DOCX. "
            "Use when user asks to fetch, open, read, or explain a file from Drive."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query to find the file (e.g. 'resume', 'project report')",
                },
                "file_id": {
                    "type": "string",
                    "description": "Specific Drive file ID if known",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "summarize_emails",
        "description": (
            "Fetch and summarize unread or recent emails from Gmail. "
            "Use when user asks to check, read, or summarize emails."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "max_results": {
                    "type": "integer",
                    "description": "Number of emails to fetch (default 10)",
                },
                "query": {
                    "type": "string",
                    "description": "Gmail search query (e.g. 'is:unread', 'from:boss@company.com')",
                },
            },
            "required": [],
        },
    },
    {
        "name": "create_notion_page",
        "description": (
            "Create a new page in Notion with AI-generated or user-specified content. "
            "Use when user wants to write notes, store content, or create pages in Notion."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Title of the Notion page",
                },
                "content": {
                    "type": "string",
                    "description": "Markdown content to write on the page",
                },
                "parent_page_id": {
                    "type": "string",
                    "description": "Optional parent page ID to nest this page under",
                },
            },
            "required": ["title", "content"],
        },
    },
    {
        "name": "list_drive_files",
        "description": "List files in Google Drive. Use when user wants to see what files they have.",
        "parameters": {
            "type": "object",
            "properties": {
                "max_results": {
                    "type": "integer",
                    "description": "Number of files to list (default 20)",
                },
                "query": {
                    "type": "string",
                    "description": "Optional search filter",
                },
            },
            "required": [],
        },
    },
    {
        "name": "list_calendar_events",
        "description": "List upcoming Google Calendar events. Use when user asks what's on their calendar.",
        "parameters": {
            "type": "object",
            "properties": {
                "days_ahead": {
                    "type": "integer",
                    "description": "Number of days to look ahead (default 7)",
                },
            },
            "required": [],
        },
    },
]


# ─── Registry Class ──────────────────────────────────────────────────────────

class ToolRegistry:
    """Maps tool names to their async executor functions."""

    def __init__(self):
        self._executors: Dict[str, Callable] = {}

    def register(self, name: str, executor: Callable):
        self._executors[name] = executor
        logger.info(f"Registered tool: {name}")

    async def execute(self, tool_name: str, tool_input: Dict[str, Any], user_id: str) -> Any:
        executor = self._executors.get(tool_name)
        if not executor:
            raise ValueError(f"Unknown tool: {tool_name}")
        logger.info(f"Executing tool '{tool_name}' for user '{user_id}'")
        return await executor(tool_input=tool_input, user_id=user_id)

    def get_definitions(self) -> List[Dict]:
        return TOOL_DEFINITIONS

    def list_tools(self) -> List[str]:
        return list(self._executors.keys())


# Global registry instance
registry = ToolRegistry()
