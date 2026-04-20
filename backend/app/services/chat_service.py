"""
Chat Service — orchestrates the AI agent, persists messages and tool logs.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Dict

from app.config.database import get_db
from app.models.schemas import ChatMessage, ToolLog, ChatResponse
from app.services.ai_service import run_agent

logger = logging.getLogger(__name__)


def _bson_safe(value):
    """Recursively coerce unsupported objects to MongoDB-storable values."""
    if value is None or isinstance(value, (str, int, float, bool, datetime)):
        return value
    if isinstance(value, dict):
        return {str(k): _bson_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_bson_safe(v) for v in value]
    if hasattr(value, "items"):
        try:
            return {str(k): _bson_safe(v) for k, v in value.items()}
        except Exception:
            pass
    if hasattr(value, "__iter__") and not isinstance(value, (bytes, bytearray)):
        try:
            return [_bson_safe(v) for v in value]
        except Exception:
            pass
    return str(value)


async def process_chat_message(
    user_id: str,
    message: str,
    session_id: str = None,
) -> ChatResponse:
    """Process a user message through the AI agent and persist results."""
    db = get_db()

    if not session_id:
        session_id = str(uuid.uuid4())

    # Load recent conversation history for context window
    history = []
    async for doc in db.chat_messages.find(
        {"session_id": session_id},
        sort=[("created_at", 1)],
        limit=20,
    ):
        history.append({"role": doc["role"], "content": doc["content"]})

    # Persist user message
    user_msg = ChatMessage(
        session_id=session_id,
        user_id=user_id,
        role="user",
        content=message,
    )
    # Pydantic v2: use model_dump() instead of dict()
    await db.chat_messages.insert_one(user_msg.model_dump())

    # Run AI agent
    try:
        reply, tool_executions = await run_agent(
            user_message=message,
            user_id=user_id,
            conversation_history=history,
        )
    except Exception as e:
        logger.error(f"AI agent error: {e}", exc_info=True)
        reply = f"I encountered an error: {str(e)}"
        tool_executions = []

    # Persist assistant message
    assistant_msg = ChatMessage(
        session_id=session_id,
        user_id=user_id,
        role="assistant",
        content=reply,
        tool_executions=tool_executions,
    )
    result = await db.chat_messages.insert_one(_bson_safe(assistant_msg.model_dump()))
    message_id = str(result.inserted_id)

    # Log tool executions for audit trail
    for te in tool_executions:
        log = ToolLog(
            user_id=user_id,
            tool_name=te.tool_name,
            input_data=te.tool_input,
            output_data=te.tool_output,
            success=te.success,
            error=str(te.tool_output.get("error")) if not te.success and isinstance(te.tool_output, dict) else None,
            duration_ms=te.duration_ms,
        )
        await db.tool_logs.insert_one(_bson_safe(log.model_dump()))

    return ChatResponse(
        reply=reply,
        session_id=session_id,
        tool_executions=tool_executions,
        message_id=message_id,
    )


async def get_chat_history(user_id: str, session_id: str) -> List[Dict]:
    """Fetch full chat history for a session."""
    db = get_db()
    history = []
    async for doc in db.chat_messages.find(
        {"session_id": session_id, "user_id": user_id},
        sort=[("created_at", 1)],
    ):
        doc["_id"] = str(doc["_id"])
        # Serialize datetime fields for JSON
        if "created_at" in doc and isinstance(doc["created_at"], datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        history.append(doc)
    return history


async def get_user_sessions(user_id: str) -> List[Dict]:
    """Get list of chat sessions with last message preview."""
    db = get_db()
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$session_id",
            "last_message": {"$first": "$content"},
            "updated_at": {"$first": "$created_at"},
            "message_count": {"$sum": 1},
        }},
        {"$sort": {"updated_at": -1}},
        {"$limit": 20},
    ]
    sessions = []
    async for doc in db.chat_messages.aggregate(pipeline):
        preview = doc["last_message"]
        if len(preview) > 80:
            preview = preview[:80] + "..."
        updated = doc["updated_at"]
        if isinstance(updated, datetime):
            updated = updated.isoformat()
        sessions.append({
            "session_id": doc["_id"],
            "preview": preview,
            "updated_at": updated,
            "message_count": doc["message_count"],
        })
    return sessions