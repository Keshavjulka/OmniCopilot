"""
File upload and local processing routes.
"""

import io
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.utils.file_parser import extract_text_from_pdf, extract_text_from_docx

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and extract text from a local file (PDF or DOCX)."""
    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    filename = file.filename or ""
    mime_type = file.content_type or ""

    try:
        if "pdf" in mime_type or filename.endswith(".pdf"):
            text = extract_text_from_pdf(io.BytesIO(content))
        elif "wordprocessingml" in mime_type or filename.endswith(".docx"):
            text = extract_text_from_docx(io.BytesIO(content))
        elif mime_type.startswith("text/") or filename.endswith(".txt"):
            text = content.decode("utf-8", errors="replace")
        else:
            raise HTTPException(status_code=415, detail=f"Unsupported file type: {mime_type}")

        return {
            "filename": filename,
            "size": len(content),
            "text": text[:8000],
            "truncated": len(text) > 8000,
            "char_count": len(text),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
