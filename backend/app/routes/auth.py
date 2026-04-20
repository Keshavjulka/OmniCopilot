"""
Authentication routes.
Google  → OAuth 2.0 (CLIENT_ID + CLIENT_SECRET from Google Cloud Console)
Notion  → Internal Integration Token (secret_xxx or ntn_xxx — no OAuth needed)
"""

import logging
import urllib.parse
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from bson import ObjectId

from app.config.database import get_db
from app.config.settings import settings
from app.integrations.google_auth import get_google_auth_url, handle_google_callback
from app.utils.encryption import encrypt_token

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Google OAuth ─────────────────────────────────────────────────────────────

@router.get("/google/login")
async def google_login(user_id: str = Query(...)):
    """Return the Google OAuth consent URL. Frontend will redirect to it."""
    auth_url, state = get_google_auth_url()
    return {"auth_url": auth_url, "state": state}


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(None),
    error: str = Query(None),
):
    """Handle Google OAuth callback."""

    # Handle user-denied or other errors from Google
    if error:
        logger.warning(f"Google OAuth error param: {error}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/?error={urllib.parse.quote(error)}"
        )

    db = get_db()
    try:
        profile = await handle_google_callback(code, state)
    except Exception as e:
        logger.error(f"Google OAuth callback failed: {e}", exc_info=True)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/success?error={urllib.parse.quote(str(e))}"
        )

    now = datetime.now(timezone.utc)

    # Upsert user by email
    result = await db.users.find_one_and_update(
        {"email": profile["email"]},
        {
            "$set": {
                "email": profile["email"],
                "name": profile["name"],
                "picture": profile.get("picture"),
                "google_tokens": {
                    "access_token": profile["access_token"],
                    "refresh_token": profile.get("refresh_token"),
                    "token_expiry": profile.get("token_expiry"),
                },
                "integrations.google": True,
                "updated_at": now,
            },
            "$setOnInsert": {
                "created_at": now,
            },
        },
        upsert=True,
        return_document=True,
    )

    user_id = str(result["_id"])
    name = urllib.parse.quote(profile["name"])

    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth/success?user_id={user_id}&name={name}"
    )


# ─── Notion Internal Token ─────────────────────────────────────────────────────

@router.post("/notion/connect")
async def notion_connect(user_id: str = Query(...), token: str = Query(...)):
    """
    Save a Notion internal integration token for a user.
    Get it from: notion.so/profile/integrations → your integration → show secret
    """
    token = token.strip()
    if not (token.startswith("secret_") or token.startswith("ntn_")):
        raise HTTPException(
            status_code=400,
            detail="Token must start with 'secret_' or 'ntn_'. Copy it from notion.so/profile/integrations."
        )

    # Verify token works against Notion API
    import httpx
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://api.notion.com/v1/users/me",
            headers={
                "Authorization": f"Bearer {token}",
                "Notion-Version": "2022-06-28",
            },
        )

    if resp.status_code != 200:
        detail = resp.json().get("message", "Unknown error")
        raise HTTPException(
            status_code=400,
            detail=f"Notion API rejected the token ({resp.status_code}): {detail}"
        )

    notion_user = resp.json()
    db = get_db()

    try:
        oid = ObjectId(user_id)
    except Exception:
        oid = user_id

    result = await db.users.update_one(
        {"_id": oid},
        {"$set": {
            "notion_token": encrypt_token(token),
            "integrations.notion": True,
            "updated_at": datetime.now(timezone.utc),
        }},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found. Please sign in with Google first.")

    return {
        "success": True,
        "notion_user": notion_user.get("name") or notion_user.get("id", ""),
        "message": "Notion connected!",
    }


@router.delete("/notion/disconnect")
async def notion_disconnect(user_id: str = Query(...)):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        oid = user_id
    await db.users.update_one(
        {"_id": oid},
        {"$set": {
            "notion_token": None,
            "integrations.notion": False,
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    return {"success": True}


# ─── User profile ──────────────────────────────────────────────────────────────

@router.get("/me/{user_id}")
async def get_user_profile(user_id: str):
    db = get_db()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = await db.users.find_one({"_id": user_id})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture"),
        "integrations": user.get("integrations", {"google": False, "notion": False}),
    }