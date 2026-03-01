from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from backend.services.mistral_service import client

router = APIRouter()

class Message(BaseModel):
    role: str # "user" or "assistant"
    content: str

class BrainstormRequest(BaseModel):
    messages: List[Message]
    context: Optional[str] = None

SYSTEM_PROMPT = """You are the "Tactical Architect," a senior football coaching consultant.
Your goal is to brainstorm and refine drill ideas with a coach.
Be creative, technical, and encouraging.
Provide suggestions on:
- Player counts and formations
- Spatial restrictions (e.g., zones, touch limits)
- Scoring conditions
- Intensity and duration

Once the user is happy with an idea, provide a concise single-sentence summary they can use as a prompt for the drill generator.
Keep your responses relatively brief and focused 100% on football tactics.
"""

@router.post("/")
async def brainstorm(request: BrainstormRequest):
    """
    Tactical brainstorming chat endpoint.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if request.context:
        messages[0]["content"] += f"\n\nADDITIONAL COACHING CONTEXT:\n{request.context}"
        
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})

    try:
        response = client.chat.complete(
            model="mistral-large-latest",
            messages=messages
        )
        return {"content": response.choices[0].message.content}
    except Exception as e:
        print(f"Mistral Brainstorm Error: {e}")
        raise HTTPException(status_code=500, detail="Brainstorming failed")
