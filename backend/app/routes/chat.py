"""
Chat routes — send messages, get history, list sessions.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import process_chat_message, get_chat_history, get_user_sessions

router = APIRouter()


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """Send a message to the AI agent and get a response."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    return await process_chat_message(
        user_id=request.user_id,
        message=request.message,
        session_id=request.session_id,
    )


@router.get("/history/{user_id}/{session_id}")
async def get_history(user_id: str, session_id: str):
    """Get full chat history for a session."""
    history = await get_chat_history(user_id, session_id)
    return {"messages": history, "session_id": session_id}


@router.get("/sessions/{user_id}")
async def list_sessions(user_id: str):
    """List all chat sessions for a user."""
    sessions = await get_user_sessions(user_id)
    return {"sessions": sessions}


@router.delete("/session/{user_id}/{session_id}")
async def delete_session(user_id: str, session_id: str):
    """Delete a chat session."""
    from app.config.database import get_db
    db = get_db()
    result = await db.chat_messages.delete_many(
        {"user_id": user_id, "session_id": session_id}
    )
    return {"deleted": result.deleted_count}
