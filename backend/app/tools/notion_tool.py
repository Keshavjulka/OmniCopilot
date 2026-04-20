"""
Notion Tool — create/update pages via Notion API.
Uses a plain Internal Integration Token (secret_xxx).
No OAuth — user pastes the token directly into the app.
"""

import logging
from typing import Any, Dict, List

import httpx
from bson import ObjectId

from app.config.database import get_db
from app.utils.encryption import decrypt_token

logger = logging.getLogger(__name__)

NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


async def _get_notion_token(user_id: str) -> str:
    """Load and decrypt the user's Notion internal token from MongoDB."""
    db = get_db()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = await db.users.find_one({"_id": user_id})

    if not user or not user.get("notion_token"):
        raise ValueError(
            "Notion is not connected. "
            "Please add your Notion Internal Integration Token in the sidebar."
        )
    return decrypt_token(user["notion_token"])


def _build_headers(token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _markdown_to_notion_blocks(markdown: str) -> List[Dict]:
    """Convert basic Markdown text to Notion block objects (max 100 blocks)."""
    blocks = []
    for line in markdown.split("\n"):
        line = line.rstrip()
        if not line:
            blocks.append({
                "object": "block", "type": "paragraph",
                "paragraph": {"rich_text": []}
            })
        elif line.startswith("### "):
            blocks.append({
                "object": "block", "type": "heading_3",
                "heading_3": {"rich_text": [{"type": "text", "text": {"content": line[4:]}}]}
            })
        elif line.startswith("## "):
            blocks.append({
                "object": "block", "type": "heading_2",
                "heading_2": {"rich_text": [{"type": "text", "text": {"content": line[3:]}}]}
            })
        elif line.startswith("# "):
            blocks.append({
                "object": "block", "type": "heading_1",
                "heading_1": {"rich_text": [{"type": "text", "text": {"content": line[2:]}}]}
            })
        elif line.startswith("- ") or line.startswith("* "):
            blocks.append({
                "object": "block", "type": "bulleted_list_item",
                "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": line[2:]}}]}
            })
        elif len(line) > 2 and line[0].isdigit() and line[1] in ".) ":
            text = line.split(None, 1)[-1] if " " in line else line[2:]
            blocks.append({
                "object": "block", "type": "numbered_list_item",
                "numbered_list_item": {"rich_text": [{"type": "text", "text": {"content": text}}]}
            })
        elif line.startswith("> "):
            blocks.append({
                "object": "block", "type": "quote",
                "quote": {"rich_text": [{"type": "text", "text": {"content": line[2:]}}]}
            })
        elif line.startswith("---") or line.startswith("==="):
            blocks.append({"object": "block", "type": "divider", "divider": {}})
        else:
            blocks.append({
                "object": "block", "type": "paragraph",
                "paragraph": {"rich_text": [{"type": "text", "text": {"content": line}}]}
            })

    return blocks[:100]  # Notion API limit per request


async def _find_parent_page(token: str, parent_page_id: str = None) -> Dict:
    """
    Find a parent page to create the new page under.
    With internal integrations, the integration must be explicitly shared with
    a page for it to appear. We search for accessible pages.
    """
    if parent_page_id:
        return {"type": "page_id", "page_id": parent_page_id}

    headers = _build_headers(token)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{NOTION_API_BASE}/search",
            headers=headers,
            json={
                "filter": {"value": "page", "property": "object"},
                "sort": {"direction": "descending", "timestamp": "last_edited_time"},
                "page_size": 5,
            },
        )

    if resp.status_code == 200:
        results = resp.json().get("results", [])
        if results:
            page_id = results[0]["id"]
            logger.info(f"Using parent page: {page_id}")
            return {"type": "page_id", "page_id": page_id}

    # If no shared page found — this usually means the integration hasn't been
    # added to any page yet. Return workspace root and let Notion decide.
    logger.warning(
        "No accessible Notion pages found. "
        "Make sure you clicked 'Add connections' on at least one Notion page "
        "and selected your integration."
    )
    return {"type": "workspace", "workspace": True}


async def create_notion_page(tool_input: Dict[str, Any], user_id: str) -> Dict:
    """Create a new Notion page with markdown content."""
    token = await _get_notion_token(user_id)
    title = tool_input["title"]
    content = tool_input["content"]
    parent_page_id = tool_input.get("parent_page_id")

    headers = _build_headers(token)
    parent = await _find_parent_page(token, parent_page_id)
    blocks = _markdown_to_notion_blocks(content)

    payload = {
        "parent": parent,
        "properties": {
            "title": {
                "title": [{"type": "text", "text": {"content": title}}]
            }
        },
        "children": blocks,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{NOTION_API_BASE}/pages",
            headers=headers,
            json=payload,
        )

    if resp.status_code not in (200, 201):
        error_detail = resp.json()
        msg = error_detail.get("message", "Unknown Notion API error")
        logger.error(f"Notion API error {resp.status_code}: {msg}")

        # Give actionable errors
        if resp.status_code == 404:
            raise RuntimeError(
                "Notion page creation failed (404). "
                "You need to share a page with your integration first: "
                "Open a Notion page → '...' menu → 'Add connections' → select your integration."
            )
        raise RuntimeError(f"Failed to create Notion page: {msg}")

    data = resp.json()
    return {
        "success": True,
        "page_id": data["id"],
        "page_url": data.get("url", ""),
        "title": title,
        "blocks_created": len(blocks),
    }