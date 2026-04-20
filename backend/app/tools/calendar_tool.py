"""
Google Calendar Tool — create events, add Meet links, list events.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.integrations.google_auth import get_google_credentials

logger = logging.getLogger(__name__)


async def create_calendar_event(tool_input: Dict[str, Any], user_id: str) -> Dict:
    """Create a Google Calendar event with optional Meet link."""
    creds = await get_google_credentials(user_id)
    service = build("calendar", "v3", credentials=creds)

    summary = tool_input["summary"]
    start_dt = tool_input["start_datetime"]
    end_dt = tool_input["end_datetime"]
    description = tool_input.get("description", "")
    attendees = tool_input.get("attendee_emails", [])
    add_meet = tool_input.get("add_meet_link", True)

    event = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_dt, "timeZone": "Asia/Kolkata"},
        "end": {"dateTime": end_dt, "timeZone": "Asia/Kolkata"},
        "attendees": [{"email": e} for e in attendees],
    }

    if add_meet:
        event["conferenceData"] = {
            "createRequest": {
                "requestId": str(uuid.uuid4()),
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        }

    try:
        result = service.events().insert(
            calendarId="primary",
            body=event,
            conferenceDataVersion=1 if add_meet else 0,
            sendUpdates="all" if attendees else "none",
        ).execute()

        meet_link = None
        if add_meet and "conferenceData" in result:
            entry_points = result["conferenceData"].get("entryPoints", [])
            for ep in entry_points:
                if ep.get("entryPointType") == "video":
                    meet_link = ep.get("uri")
                    break

        return {
            "success": True,
            "event_id": result["id"],
            "event_link": result.get("htmlLink"),
            "meet_link": meet_link,
            "summary": result["summary"],
            "start": result["start"]["dateTime"],
            "end": result["end"]["dateTime"],
            "attendees": [a["email"] for a in result.get("attendees", [])],
        }

    except HttpError as e:
        logger.error(f"Calendar API error: {e}")
        raise RuntimeError(f"Failed to create event: {e.reason}")


async def list_calendar_events(tool_input: Dict[str, Any], user_id: str) -> Dict:
    """List upcoming calendar events."""
    creds = await get_google_credentials(user_id)
    service = build("calendar", "v3", credentials=creds)

    days_ahead = tool_input.get("days_ahead", 7)
    now = datetime.now(timezone.utc)
    end_time = now + timedelta(days=days_ahead)

    try:
        result = service.events().list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=end_time.isoformat(),
            maxResults=20,
            singleEvents=True,
            orderBy="startTime",
        ).execute()

        events = []
        for ev in result.get("items", []):
            start = ev["start"].get("dateTime", ev["start"].get("date"))
            meet_link = None
            if "conferenceData" in ev:
                for ep in ev["conferenceData"].get("entryPoints", []):
                    if ep.get("entryPointType") == "video":
                        meet_link = ep.get("uri")
            events.append({
                "id": ev["id"],
                "summary": ev.get("summary", "Untitled"),
                "start": start,
                "end": ev["end"].get("dateTime", ev["end"].get("date")),
                "meet_link": meet_link,
                "attendees": [a["email"] for a in ev.get("attendees", [])],
            })

        return {"success": True, "events": events, "count": len(events)}

    except HttpError as e:
        logger.error(f"Calendar list error: {e}")
        raise RuntimeError(f"Failed to list events: {e.reason}")
