"""
Pydantic v2 models for MongoDB documents.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─── User ─────────────────────────────────────────────────────────────────────

class OAuthTokens(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None


class IntegrationStatus(BaseModel):
    google: bool = False
    notion: bool = False


class UserDB(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None
    google_tokens: Optional[OAuthTokens] = None
    notion_token: Optional[str] = None
    integrations: IntegrationStatus = Field(default_factory=IntegrationStatus)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ─── Chat ─────────────────────────────────────────────────────────────────────

class ToolExecution(BaseModel):
    tool_name: str
    tool_input: Dict[str, Any]
    tool_output: Any
    success: bool
    duration_ms: int


class ChatMessage(BaseModel):
    session_id: str
    user_id: str
    role: str  # "user" | "assistant"
    content: str
    tool_executions: List[ToolExecution] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_now)


# ─── Tool Log ─────────────────────────────────────────────────────────────────

class ToolLog(BaseModel):
    user_id: str
    tool_name: str
    input_data: Dict[str, Any]
    output_data: Any
    success: bool
    error: Optional[str] = None
    duration_ms: int
    created_at: datetime = Field(default_factory=_now)


# ─── API Request / Response ───────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: str


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    tool_executions: List[ToolExecution] = Field(default_factory=list)
    message_id: Optional[str] = None


class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    integrations: IntegrationStatus