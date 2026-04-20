"""
Encrypt/decrypt OAuth tokens before storing in MongoDB.
Uses ENCRYPTION_KEY from settings (auto-generated if not set).
"""

import base64
import logging
from functools import lru_cache
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_fernet() -> Fernet:
    """Build one Fernet instance from settings (cached for the process lifetime)."""
    from app.config.settings import settings
    key = settings.ENCRYPTION_KEY

    # key is a hex string (64 chars = 32 bytes) produced by secrets.token_hex(32)
    # We need exactly 32 raw bytes, base64url-encoded for Fernet
    try:
        raw = bytes.fromhex(key)          # hex string → 32 raw bytes
        b64 = base64.urlsafe_b64encode(raw)
        return Fernet(b64)
    except (ValueError, Exception):
        # Fallback: treat key as arbitrary string, pad/truncate to 32 bytes
        raw = key.encode()[:32].ljust(32, b"0")
        b64 = base64.urlsafe_b64encode(raw)
        logger.warning("ENCRYPTION_KEY is not a valid hex string — using padded fallback.")
        return Fernet(b64)


def encrypt_token(token: str) -> str:
    """Encrypt a plaintext token string for storage."""
    return _get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    """Decrypt an encrypted token string."""
    return _get_fernet().decrypt(encrypted.encode()).decode()