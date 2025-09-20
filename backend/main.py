import uuid
from typing import Dict, List
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from backend.schemas import StartDebateRequest, StartResponse, TurnRequest, TurnResponse, Message, Validations
from backend.prompts import (
    DEBATEBOT_SYSTEM_INSTRUCTIONS,
    OPENING_INSTRUCTION_TEMPLATE,
    TURN_INSTRUCTION_TEMPLATE,
    HISTORY_LINE_USER,
    HISTORY_LINE_BOT,
)
from backend.utils import call_gemini, logger
from backend.rate_limiter import RateLimiter

app = FastAPI(title="DebateBot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: Dict[str, Dict] = {}
rate_limiter = RateLimiter(capacity=20, refill_seconds=300)


@app.get("/healthz")
async def healthz():
    return Response(status_code=204)

def build_history_text(history: List[Message]) -> str:
    lines = [
        (HISTORY_LINE_USER.format(msg=m.message) if m.role == "user" else HISTORY_LINE_BOT.format(msg=m.message))
        for m in history
    ]
    return "\n".join(lines)

def get_opposite_side(side: str) -> str:
    return "CON" if side == "PRO" else "PRO"

@app.middleware("http")
async def basic_rate_limit(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.allow(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait and try again.")
    return await call_next(request)

@app.post("/api/debate/start", response_model=StartResponse)
async def start_debate(payload: StartDebateRequest):
    topic, bot_side = payload.topic.strip(), payload.bot_side
    if not topic or bot_side not in ("PRO", "CON"):
        raise HTTPException(status_code=422, detail="Invalid topic or bot_side.")

    session_id = str(uuid.uuid4())
    sessions[session_id] = {"topic": topic, "bot_side": bot_side, "history": []}

    text_payload = OPENING_INSTRUCTION_TEMPLATE.format(topic=topic, bot_side=bot_side)
    text_payload = text_payload.replace("<SYSTEM_INSTRUCTIONS>", DEBATEBOT_SYSTEM_INSTRUCTIONS)

    ok, bot_message = await call_gemini(text_payload)
    if not ok:
        bot_message = "DebateBot is currently unavailable. Please try again."

    sessions[session_id]["history"].append(Message(role="bot", message=bot_message))
    return StartResponse(bot_message=bot_message, session_id=session_id)

@app.post("/api/debate/turn", response_model=TurnResponse)
async def take_turn(payload: TurnRequest):
    session_id, human_message = payload.session_id, payload.human_message.strip()

    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Invalid session_id.")

    try:
        Validations.validate_human_message(human_message)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    sess = sessions[session_id]
    if sess["history"] and sess["history"][-1].role != "bot":
        raise HTTPException(status_code=409, detail="It is not the user's turn.")

    switch_requested = any(keyword in human_message.lower() for keyword in ["[switch]", "switch sides", "switch your side"])
    if switch_requested:
        sess["bot_side"] = get_opposite_side(sess["bot_side"])

    sess["history"].append(Message(role="user", message=human_message))

    history_text = build_history_text(sess["history"])
    text_payload = TURN_INSTRUCTION_TEMPLATE.format(
        topic=sess["topic"],
        bot_side=sess["bot_side"],
        history=history_text,
        user_message=human_message,
    )
    text_payload = text_payload.replace("<SYSTEM_INSTRUCTIONS>", DEBATEBOT_SYSTEM_INSTRUCTIONS)
    text_payload += f"\nSWITCH_REQUESTED={'true' if switch_requested else 'false'}"

    _, bot_message = await call_gemini(text_payload)
    bot_message = bot_message or "DebateBot is currently unavailable. Please try again."

    sess["history"].append(Message(role="bot", message=bot_message))
    return TurnResponse(bot_message=bot_message, session_id=session_id)