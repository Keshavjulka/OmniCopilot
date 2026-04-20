"""
Omni Copilot - Main FastAPI Application
"""
import logging
import os
from contextlib import asynccontextmanager

# Disable globally-installed Pydantic plugins (e.g. logfire) that are unrelated
# to this project and can break startup due to environment-level version skew.
os.environ.setdefault("PYDANTIC_DISABLE_PLUGINS", "__all__")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.config.database import connect_db, disconnect_db
from app.routes import chat, auth, files, integrations

# Allow oauthlib scope relaxation globally (prevents scope-mismatch crashes)
os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")  # Allow http:// in dev

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("omni_copilot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Omni Copilot starting up...")
    await connect_db()
    from app.tools import init_tools
    init_tools()
    logger.info("✅ Tools registered and database connected")
    yield
    logger.info("🛑 Shutting down...")
    await disconnect_db()


app = FastAPI(
    title="Omni Copilot API",
    description="Unified AI assistant for Google + Notion",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/api/auth",         tags=["Auth"])
app.include_router(chat.router,         prefix="/api/chat",         tags=["Chat"])
app.include_router(files.router,        prefix="/api/files",        tags=["Files"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["Integrations"])


@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )