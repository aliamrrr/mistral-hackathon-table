from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class DrillMetadata(BaseModel):
    title: str
    tags: List[str]
    intensity: str
    duration: str

class PitchSize(BaseModel):
    length: int = 105
    width: int = 68

class PlayerEntity(BaseModel):
    id: str
    group: str
    color: str
    number: int

class BallEntity(BaseModel):
    id: str

class Entities(BaseModel):
    players: List[PlayerEntity]
    balls: List[BallEntity]

class Position(BaseModel):
    x: float
    y: float

class Phase(BaseModel):
    time_start: float
    time_end: float
    positions: Dict[str, Position]

class AnimationData(BaseModel):
    pitch_size: PitchSize
    entities: Entities
    phases: List[Phase]
    frames: Optional[List[Dict]] = None

class DrillGenerationResponse(BaseModel):
    metadata: DrillMetadata
    narration: str
    animation: AnimationData
    audio_url: Optional[str] = None

class DrillGenerateRequest(BaseModel):
    prompt: str
    generate_audio: bool = True
    language: str = "English"
    context: Optional[str] = None
