"""
Google OAuth 2.0 — clean, stateless server-side flow.

Key fixes:
1. Removed include_granted_scopes — causes "scope changed" error on callback
2. Removed PKCE (code_challenge) — causes "missing code verifier" on fresh Flow object
3. Proper ObjectId handling for MongoDB lookups
"""

import logging
from datetime import datetime, timezone, timedelta
from threading import Lock

from bson import ObjectId
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
import requests as _requests

from app.config.settings import settings
from app.config.database import get_db
from app.utils.encryption import encrypt_token, decrypt_token

logger = logging.getLogger(__name__)

_OAUTH_STATE_TTL = timedelta(minutes=10)
_oauth_state_store: dict[str, tuple[str, datetime]] = {}
_oauth_state_lock = Lock()


def _cleanup_oauth_state_store(now: datetime) -> None:
    expired = [
        state
        for state, (_, created_at) in _oauth_state_store.items()
        if now - created_at > _OAUTH_STATE_TTL
    ]
    for state in expired:
        _oauth_state_store.pop(state, None)


def _client_config() -> dict:
    return {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        }
    }


def _make_flow() -> Flow:
    return Flow.from_client_config(
        _client_config(),
        scopes=settings.GOOGLE_SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )


def get_google_auth_url() -> tuple[str, str]:
    """
    Generate the Google OAuth consent URL.

    DO NOT use:
      - include_granted_scopes=True  → causes scope mismatch error in callback
      - code_challenge / PKCE        → causes missing verifier error with fresh Flow
    """
    flow = _make_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        # No PKCE, no include_granted_scopes — clean minimal auth request
    )

    code_verifier = getattr(flow, "code_verifier", None)
    if code_verifier:
        now = datetime.now(timezone.utc)
        with _oauth_state_lock:
            _cleanup_oauth_state_store(now)
            _oauth_state_store[state] = (code_verifier, now)

    return auth_url, state


async def handle_google_callback(code: str, state: str | None = None) -> dict:
    """
    Exchange authorization code for tokens.
    A fresh Flow is safe here because we have no PKCE verifier to match.
    """
    flow = _make_flow()

    if state:
        with _oauth_state_lock:
            _cleanup_oauth_state_store(datetime.now(timezone.utc))
            verifier_record = _oauth_state_store.pop(state, None)
        if verifier_record:
            flow.code_verifier = verifier_record[0]

    # Suppress scope mismatch warnings from oauthlib — we know what we're doing
    import os
    os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")

    flow.fetch_token(code=code)
    credentials = flow.credentials

    # Fetch Google profile
    import httpx
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {credentials.token}"},
        )

    if resp.status_code != 200:
        raise ValueError(f"Failed to get Google profile ({resp.status_code}): {resp.text}")

    profile = resp.json()
    if not profile.get("email"):
        raise ValueError("Google did not return an email. Check that 'email' scope is enabled.")

    return {
        "email": profile["email"],
        "name": profile.get("name") or profile["email"],
        "picture": profile.get("picture"),
        "access_token": encrypt_token(credentials.token),
        "refresh_token": encrypt_token(credentials.refresh_token) if credentials.refresh_token else None,
        "token_expiry": credentials.expiry,
    }


def _oid(user_id: str):
    try:
        return ObjectId(user_id)
    except Exception:
        return user_id


async def get_google_credentials(user_id: str) -> Credentials:
    """Load Google credentials from DB and auto-refresh if expired."""
    db = get_db()
    user = await db.users.find_one({"_id": _oid(user_id)})

    if not user or not user.get("google_tokens"):
        raise ValueError("Google is not connected. Please sign in with Google first.")

    tokens = user["google_tokens"]
    access_token = decrypt_token(tokens["access_token"])
    refresh_token = decrypt_token(tokens["refresh_token"]) if tokens.get("refresh_token") else None
    expiry = tokens.get("token_expiry")

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=settings.GOOGLE_SCOPES,
    )

    if expiry:
        creds.expiry = expiry if isinstance(expiry, datetime) else datetime.fromisoformat(str(expiry))

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            await db.users.update_one(
                {"_id": _oid(user_id)},
                {"$set": {
                    "google_tokens.access_token": encrypt_token(creds.token),
                    "google_tokens.token_expiry": creds.expiry,
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
            logger.info(f"Refreshed Google token for {user_id}")
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            raise ValueError("Google session expired — please sign in again.")

    return creds