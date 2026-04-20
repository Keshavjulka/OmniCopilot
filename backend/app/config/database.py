"""
MongoDB connection management using Motor (async driver).
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB]
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.chat_messages.create_index("session_id")
    await db.chat_messages.create_index("user_id")
    await db.tool_logs.create_index("user_id")
    logger.info(f"Connected to MongoDB: {settings.MONGODB_DB}")


async def disconnect_db():
    global client
    if client:
        client.close()
        logger.info("Disconnected from MongoDB")


def get_db():
    return db
