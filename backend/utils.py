import os
import httpx
import logging
from typing import Tuple
from dotenv import load_dotenv
import asyncio

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

logger = logging.getLogger("debatebot")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def _extract_text_from_candidates(data: dict) -> str:
    try:
        candidate = data["candidates"][0]
        if candidate.get("finishReason") in {"SAFETY", "BLOCKED", "OTHER"}:
            return ""
        return " ".join([part["text"].strip() for part in candidate["content"]["parts"] if part.get("text")])
    except (KeyError, IndexError):
        return ""

async def call_gemini(text_payload: str) -> Tuple[bool, str]:
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not set.")
        return False, "DebateBot is currently unavailable. Please try again."

    headers = {"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"}
    json_payload = {"contents": [{"parts": [{"text": text_payload}]}]}

    async with httpx.AsyncClient(timeout=45, http2=True) as client:
        for attempt in range(3):
            try:
                resp = await client.post(GEMINI_ENDPOINT, headers=headers, json=json_payload)
                if resp.status_code == 200:
                    text = _extract_text_from_candidates(resp.json())
                    if text:
                        return True, text
                    logger.warning("Gemini 200 but no text parsed. raw=%s", str(resp.json())[:800])
                    return False, "DebateBot is currently unavailable. Please try again."

                if resp.status_code in {429, 502, 503, 504} or 500 <= resp.status_code < 600:
                    logger.warning("Gemini transient error %s: %s", resp.status_code, resp.text[:500])
                    await asyncio.sleep(0.8 * (2 ** attempt))
                    continue
                
                logger.warning("Gemini API non-200: %s - %s", resp.status_code, resp.text[:800])
                break
            except Exception as e:
                logger.warning("Gemini call failed (attempt %s): %s", attempt + 1, e)

        return False, "DebateBot is currently unavailable. Please try again."