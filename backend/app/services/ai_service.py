"""
AI Service — Gemini agent with function-calling loop.
Works with google-generativeai 0.8.x
"""

import logging
import time
from typing import Dict, List, Tuple

import google.generativeai as genai
from google.generativeai import protos

from app.config.settings import settings
from app.tools.registry import registry, TOOL_DEFINITIONS
from app.models.schemas import ToolExecution

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are Omni Copilot — an AI assistant with access to Google Calendar, Google Drive, Gmail, and Notion.

Rules:
- Use the provided tools to complete user requests
- When user says a time like "7 PM", assume today's date in IST (UTC+5:30)
- Default meeting duration is 1 hour
- Summarise Drive files clearly with key points
- Create well-structured Notion pages in markdown
- Report ONLY actual tool results — never fabricate data
- If a tool fails, explain why and suggest next steps

Format responses with markdown. Bold important links/titles. Use bullet points for lists.
"""


def _to_plain(value):
    """Convert proto/marshal values into plain JSON/BSON-safe Python types."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, dict):
        return {str(k): _to_plain(v) for k, v in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [_to_plain(v) for v in value]

    # proto map-like wrappers
    if hasattr(value, "items"):
        try:
            return {str(k): _to_plain(v) for k, v in value.items()}
        except Exception:
            pass

    # proto repeated wrappers
    if hasattr(value, "__iter__") and not isinstance(value, (bytes, bytearray)):
        try:
            return [_to_plain(v) for v in value]
        except Exception:
            pass

    # protobuf messages / custom wrappers
    if hasattr(value, "to_dict"):
        try:
            return _to_plain(value.to_dict())
        except Exception:
            pass

    return str(value)


def _candidate_models() -> List[str]:
    """Return preferred model candidates, handling deprecated aliases gracefully."""
    configured = (settings.GEMINI_MODEL or "").strip().strip('"').strip("'")
    candidates = [configured] if configured else []

    alias_fallbacks = {
        "gemini-1.5-flash": "gemini-2.0-flash",
        "gemini-1.5-flash-latest": "gemini-2.0-flash",
    }
    if configured in alias_fallbacks:
        candidates.append(alias_fallbacks[configured])

    candidates.extend([
        "gemini-2.0-flash-lite-001",
        "gemini-flash-lite-latest",
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-flash-latest",
    ])

    deduped: List[str] = []
    for m in candidates:
        if m and m not in deduped:
            deduped.append(m)
    return deduped


def _schema_type(t: str) -> protos.Type:
    """Map JSON schema type string to Gemini proto Type."""
    return {
        "string": protos.Type.STRING,
        "integer": protos.Type.INTEGER,
        "number": protos.Type.NUMBER,
        "boolean": protos.Type.BOOLEAN,
        "array": protos.Type.ARRAY,
        "object": protos.Type.OBJECT,
    }.get(t, protos.Type.STRING)


def _build_schema(params: dict) -> protos.Schema:
    """Recursively convert JSON Schema dict to protos.Schema."""
    t = params.get("type", "string")
    schema_kwargs = {"type_": _schema_type(t)}

    if "description" in params:
        schema_kwargs["description"] = params["description"]

    if t == "object" and "properties" in params:
        props = {}
        for k, v in params["properties"].items():
            props[k] = _build_schema(v)
        schema_kwargs["properties"] = props
        if "required" in params:
            schema_kwargs["required"] = params["required"]

    if t == "array" and "items" in params:
        schema_kwargs["items"] = _build_schema(params["items"])

    return protos.Schema(**schema_kwargs)


def _build_tools() -> list:
    """Build Gemini Tool objects from our TOOL_DEFINITIONS."""
    declarations = []
    for tool_def in TOOL_DEFINITIONS:
        params = tool_def.get("parameters", {})
        fn_decl = protos.FunctionDeclaration(
            name=tool_def["name"],
            description=tool_def["description"],
            parameters=_build_schema(params),
        )
        declarations.append(fn_decl)
    return [protos.Tool(function_declarations=declarations)]


async def run_agent(
    user_message: str,
    user_id: str,
    conversation_history: List[Dict],
) -> Tuple[str, List[ToolExecution]]:
    """Run the Gemini agent loop with tool calling."""

    # Build conversation history
    history = []
    for msg in conversation_history[-10:]:
        role = "user" if msg["role"] == "user" else "model"
        history.append({"role": role, "parts": [{"text": msg["content"]}]})

    tool_executions: List[ToolExecution] = []

    chat = None
    response = None
    last_error: Exception | None = None
    for model_name in _candidate_models():
        try:
            logger.info(f"[Agent] trying Gemini model: {model_name}")
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=SYSTEM_PROMPT,
                tools=_build_tools(),
            )
            chat = model.start_chat(history=history)
            response = chat.send_message(user_message)
            break
        except Exception as exc:
            last_error = exc
            msg = str(exc).lower()
            if (
                "not found" in msg
                or "not supported for generatecontent" in msg
                or "function calling is not enabled" in msg
                or "quota exceeded" in msg
                or "rate limit" in msg
                or "you exceeded your current quota" in msg
                or "429" in msg
            ):
                logger.warning(f"[Agent] model unavailable: {model_name} -> {exc}")
                continue
            raise

    if chat is None or response is None:
        raise RuntimeError(f"No supported Gemini model available. Last error: {last_error}")

    for _ in range(6):
        parts = response.candidates[0].content.parts

        # Find function calls
        fn_calls = [p for p in parts if p.function_call.name]

        if not fn_calls:
            # Final text answer
            text = "\n".join(p.text for p in parts if hasattr(p, "text") and p.text)
            return text or "Done.", tool_executions

        # Execute tools
        tool_responses = []
        for part in fn_calls:
            fc = part.function_call
            tool_name = fc.name
            tool_input = _to_plain(dict(fc.args))

            logger.info(f"[Agent] → {tool_name}({tool_input})")
            t0 = int(time.time() * 1000)

            try:
                output = await registry.execute(tool_name, tool_input, user_id)
                output = _to_plain(output)
                success = True
            except Exception as exc:
                logger.error(f"[Agent] {tool_name} failed: {exc}")
                output = {"error": str(exc)}
                success = False

            duration_ms = int(time.time() * 1000) - t0
            tool_executions.append(ToolExecution(
                tool_name=tool_name,
                tool_input=tool_input,
                tool_output=output,
                success=success,
                duration_ms=duration_ms,
            ))

            tool_responses.append(
                protos.Part(function_response=protos.FunctionResponse(
                    name=tool_name,
                    response={"result": output},
                ))
            )

        response = chat.send_message(tool_responses)

    return "Actions completed. Check the execution trace for details.", tool_executions