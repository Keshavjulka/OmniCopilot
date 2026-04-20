"""
Application settings — loaded from .env file.
Simplified: Notion uses a plain internal token (no OAuth needed).
SECRET_KEY and ENCRYPTION_KEY are auto-generated if not set.
"""

import os
import secrets
from typing import List
from pydantic_settings import BaseSettings


def _auto_secret(env_var: str, length: int = 32) -> str:
    """
    Return the env var value if set, otherwise generate a random value
    and WARN the user (don't silently use different keys on each restart).
    """
    val = os.environ.get(env_var, "")
    if val and val not in ("change-me-in-production", "your-secret-key-here", ""):
        return val
    generated = secrets.token_hex(length)
    print(
        f"\n⚠️  WARNING: {env_var} not set in .env — using a random value for this run.\n"
        f"   Tokens encrypted this session WILL BE UNREADABLE after restart.\n"
        f"   Add this to your .env now:\n   {env_var}={generated}\n"
    )
    return generated


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "Omni Copilot"
    DEBUG: bool = False
    # Used for session signing — any random string works, just keep it stable
    SECRET_KEY: str = "auto"

    # ── MongoDB Atlas ────────────────────────────────────────────────────────
    # Paste your full Atlas connection string:
    # mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "omni_copilot"

    # ── Google OAuth 2.0 ─────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    GOOGLE_SCOPES: List[str] = [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/gmail.readonly",
    ]

    # ── Gemini AI ────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash-lite-001"

    # ── Notion ───────────────────────────────────────────────────────────────
    # Internal integration token from https://www.notion.so/profile/integrations
    # Looks like: secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    # NO client_id / client_secret / redirect_uri needed for internal tokens!
    NOTION_TOKEN: str = ""

    # ── Frontend ─────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # ── Encryption ───────────────────────────────────────────────────────────
    # Auto-generated if blank — but set it in .env for persistence across restarts!
    # Generate once: python -c "import secrets; print(secrets.token_hex(32))"
    ENCRYPTION_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True

    def __init__(self, **data):
        super().__init__(**data)
        # Auto-resolve SECRET_KEY if placeholder
        if self.SECRET_KEY in ("auto", "change-me-in-production", "your-secret-key-here", ""):
            object.__setattr__(self, "SECRET_KEY", _auto_secret("SECRET_KEY", 32))
        # Auto-resolve ENCRYPTION_KEY if blank
        if not self.ENCRYPTION_KEY:
            object.__setattr__(self, "ENCRYPTION_KEY", _auto_secret("ENCRYPTION_KEY", 32))


settings = Settings()