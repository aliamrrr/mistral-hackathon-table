import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.api.schemas import DrillGenerateRequest, DrillGenerationResponse
from backend.services.mistral_service import generate_drill_schema
from backend.services.video_service import enrich_with_dense_frames
from backend.services.elevenlabs_service import generate_narration_audio
from backend.api.auth import get_current_user
from backend.db.models import User
from backend.db.database import get_db

router = APIRouter()

@router.post("/", response_model=DrillGenerationResponse)
def generate_drill(
    request: DrillGenerateRequest, 
    # current_user: User = Depends(get_current_user), # Can enforce auth later if we want
    db: Session = Depends(get_db)
):
    try:
        # Step 1: Call Mistral to interpret the prompt and get JSON schema
        drill_dict = generate_drill_schema(request.prompt, request.language, request.context)
        
        # Step 1.5: Pass schema to Python Coder AI for numpy bezier frame interpolation
        drill_dict = enrich_with_dense_frames(drill_dict)
        
        # Step 2: Use the generated narration text to make an ElevenLabs audio file
        drill_id = str(uuid.uuid4())[:8]
        audio_url = None
        if request.generate_audio and "narration" in drill_dict and drill_dict["narration"]:
            try:
                audio_url = generate_narration_audio(drill_dict["narration"], drill_id)
            except Exception as e:
                print(f"Failed to generate audio via ElevenLabs: {e}")
                
        # Attach the audio URL directly into the response payload so frontend can play it
        if audio_url:
            drill_dict["audio_url"] = audio_url
            
        return drill_dict
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")
