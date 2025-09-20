from pydantic import BaseModel, Field, validator
from typing import List, Literal, Optional

class StartDebateRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    bot_side: Literal["PRO", "CON"]

class Message(BaseModel):
    role: Literal["user", "bot"]
    message: str

class TurnRequest(BaseModel):
    session_id: str
    human_message: str

class TurnResponse(BaseModel):
    bot_message: str
    session_id: str

class StartResponse(BaseModel):
    bot_message: str
    session_id: str

class Validations:
    @staticmethod
    def count_words(text: str) -> int:
        return len(text.strip().split())

    @staticmethod
    def validate_human_message(msg: str):
        if not 120 <= Validations.count_words(msg) <= 180:
            raise ValueError("human_message must be between 120 and 180 words.")