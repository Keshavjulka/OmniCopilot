"""
Google Drive Tool — search files, read text from PDFs and DOCX.
"""

import io
import logging
from typing import Any, Dict

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload

from app.integrations.google_auth import get_google_credentials
from app.utils.file_parser import extract_text_from_pdf, extract_text_from_docx

logger = logging.getLogger(__name__)

MAX_TEXT_CHARS = 8000  # Limit extracted text to avoid token overflow


async def read_drive_file(tool_input: Dict[str, Any], user_id: str) -> Dict:
    """Search for and read a file from Google Drive."""
    creds = await get_google_credentials(user_id)
    service = build("drive", "v3", credentials=creds)

    file_id = tool_input.get("file_id")
    query = tool_input.get("query", "")

    # Find file if no ID provided
    if not file_id:
        search_query = f"name contains '{query}' and trashed=false"
        results = service.files().list(
            q=search_query,
            pageSize=5,
            fields="files(id, name, mimeType, size, modifiedTime)",
        ).execute()

        files = results.get("files", [])
        if not files:
            return {"success": False, "error": f"No files found matching '{query}'"}

        # Pick the first match
        file_meta = files[0]
        file_id = file_meta["id"]
    else:
        file_meta = service.files().get(
            fileId=file_id,
            fields="id, name, mimeType, size, modifiedTime"
        ).execute()

    mime_type = file_meta.get("mimeType", "")
    file_name = file_meta.get("name", "Unknown")

    try:
        # Handle Google Docs — export as plain text
        if mime_type == "application/vnd.google-apps.document":
            response = service.files().export(
                fileId=file_id, mimeType="text/plain"
            ).execute()
            text = response.decode("utf-8") if isinstance(response, bytes) else str(response)

        # Handle Google Sheets — export as CSV
        elif mime_type == "application/vnd.google-apps.spreadsheet":
            response = service.files().export(
                fileId=file_id, mimeType="text/csv"
            ).execute()
            text = response.decode("utf-8") if isinstance(response, bytes) else str(response)

        # Handle PDF
        elif mime_type == "application/pdf" or file_name.endswith(".pdf"):
            buffer = io.BytesIO()
            request = service.files().get_media(fileId=file_id)
            downloader = MediaIoBaseDownload(buffer, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            buffer.seek(0)
            text = extract_text_from_pdf(buffer)

        # Handle DOCX
        elif "wordprocessingml" in mime_type or file_name.endswith(".docx"):
            buffer = io.BytesIO()
            request = service.files().get_media(fileId=file_id)
            downloader = MediaIoBaseDownload(buffer, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            buffer.seek(0)
            text = extract_text_from_docx(buffer)

        # Plain text
        elif mime_type.startswith("text/"):
            buffer = io.BytesIO()
            request = service.files().get_media(fileId=file_id)
            downloader = MediaIoBaseDownload(buffer, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            text = buffer.getvalue().decode("utf-8", errors="replace")

        else:
            return {
                "success": False,
                "error": f"Unsupported file type: {mime_type}",
                "file_name": file_name,
            }

        # Truncate if too long
        truncated = len(text) > MAX_TEXT_CHARS
        text = text[:MAX_TEXT_CHARS]

        return {
            "success": True,
            "file_id": file_id,
            "file_name": file_name,
            "mime_type": mime_type,
            "text": text,
            "truncated": truncated,
            "char_count": len(text),
        }

    except HttpError as e:
        logger.error(f"Drive API error: {e}")
        raise RuntimeError(f"Failed to read file: {e.reason}")


async def list_drive_files(tool_input: Dict[str, Any], user_id: str) -> Dict:
    """List files in Google Drive."""
    creds = await get_google_credentials(user_id)
    service = build("drive", "v3", credentials=creds)

    max_results = tool_input.get("max_results", 20)
    query_filter = tool_input.get("query", "")

    search_q = "trashed=false"
    if query_filter:
        search_q = f"name contains '{query_filter}' and {search_q}"

    try:
        results = service.files().list(
            q=search_q,
            pageSize=max_results,
            fields="files(id, name, mimeType, size, modifiedTime, webViewLink)",
            orderBy="modifiedTime desc",
        ).execute()

        files = [
            {
                "id": f["id"],
                "name": f["name"],
                "type": f.get("mimeType", "unknown"),
                "size": f.get("size"),
                "modified": f.get("modifiedTime"),
                "link": f.get("webViewLink"),
            }
            for f in results.get("files", [])
        ]

        return {"success": True, "files": files, "count": len(files)}

    except HttpError as e:
        logger.error(f"Drive list error: {e}")
        raise RuntimeError(f"Failed to list files: {e.reason}")
