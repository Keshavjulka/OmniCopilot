"""
Gmail Tool — fetch and summarize emails.
"""

import base64
import logging
from email import message_from_bytes
from typing import Any, Dict

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.integrations.google_auth import get_google_credentials

logger = logging.getLogger(__name__)


def _decode_body(payload: dict) -> str:
    """Recursively extract plain text from email payload."""
    mime_type = payload.get("mimeType", "")
    body = payload.get("body", {})
    data = body.get("data", "")

    if data and "text/plain" in mime_type:
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")

    if "text/html" in mime_type and data:
        # Basic HTML strip
        html = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
        import re
        return re.sub(r"<[^>]+>", "", html)

    for part in payload.get("parts", []):
        result = _decode_body(part)
        if result:
            return result

    return ""


async def summarize_emails(tool_input: Dict[str, Any], user_id: str) -> Dict:
    """Fetch Gmail messages and return their content for summarization."""
    creds = await get_google_credentials(user_id)
    service = build("gmail", "v1", credentials=creds)

    max_results = tool_input.get("max_results", 10)
    query = tool_input.get("query", "is:unread")

    try:
        list_result = service.users().messages().list(
            userId="me",
            q=query,
            maxResults=max_results,
        ).execute()

        messages_meta = list_result.get("messages", [])
        if not messages_meta:
            return {"success": True, "emails": [], "count": 0, "summary": "No emails found."}

        emails = []
        for meta in messages_meta[:max_results]:
            msg = service.users().messages().get(
                userId="me", id=meta["id"], format="full"
            ).execute()

            headers = {h["name"]: h["value"] for h in msg["payload"].get("headers", [])}
            subject = headers.get("Subject", "(No Subject)")
            sender = headers.get("From", "Unknown")
            date = headers.get("Date", "")
            body = _decode_body(msg["payload"])

            emails.append({
                "id": meta["id"],
                "subject": subject,
                "from": sender,
                "date": date,
                "snippet": msg.get("snippet", ""),
                "body": body[:1500],  # Limit body
                "labels": msg.get("labelIds", []),
            })

        return {
            "success": True,
            "emails": emails,
            "count": len(emails),
        }

    except HttpError as e:
        logger.error(f"Gmail API error: {e}")
        raise RuntimeError(f"Failed to fetch emails: {e.reason}")
