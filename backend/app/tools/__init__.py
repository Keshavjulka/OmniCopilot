"""
Tool initializer — registers all tools with the global registry.
Import this at startup in main.py or a startup event.
"""

from app.tools.registry import registry
from app.tools.calendar_tool import create_calendar_event, list_calendar_events
from app.tools.drive_tool import read_drive_file, list_drive_files
from app.tools.gmail_tool import summarize_emails
from app.tools.notion_tool import create_notion_page


def init_tools():
    """Register all tools with the global tool registry."""
    registry.register("create_calendar_event", create_calendar_event)
    registry.register("list_calendar_events", list_calendar_events)
    registry.register("read_drive_file", read_drive_file)
    registry.register("list_drive_files", list_drive_files)
    registry.register("summarize_emails", summarize_emails)
    registry.register("create_notion_page", create_notion_page)
