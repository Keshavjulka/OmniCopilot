"""
Integrations status and management routes.
"""
from fastapi import APIRouter, HTTPException
from app.config.database import get_db

router = APIRouter()

@router.get("/status/{user_id}")
async def get_integration_status(user_id: str):
    db = get_db()
    from bson import ObjectId
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "google": user.get("integrations", {}).get("google", False),
        "notion": user.get("integrations", {}).get("notion", False),
    }

@router.delete("/disconnect/{user_id}/{service}")
async def disconnect_integration(user_id: str, service: str):
    db = get_db()
    if service not in ("google", "notion"):
        raise HTTPException(status_code=400, detail="Unknown service")
    update = {f"integrations.{service}": False}
    if service == "google":
        update["google_tokens"] = None
    elif service == "notion":
        update["notion_token"] = None
    from bson import ObjectId
    try:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    except Exception:
        await db.users.update_one({"_id": user_id}, {"$set": update})
    return {"disconnected": service}

@router.get("/tool-logs/{user_id}")
async def get_tool_logs(user_id: str, limit: int = 20):
    db = get_db()
    logs = []
    async for doc in db.tool_logs.find(
        {"user_id": user_id},
        sort=[("created_at", -1)],
        limit=limit,
    ):
        doc["_id"] = str(doc["_id"])
        logs.append(doc)
    return {"logs": logs}
