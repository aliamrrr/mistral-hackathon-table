import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.db.database import get_db
from backend.db.models import Drill, User, CollectionDrillLink
from backend.api.auth import get_current_user

router = APIRouter()

class DrillCreate(BaseModel):
    title: str
    tags: List[str]
    intensity: str
    duration: str
    full_json_data: dict
    audio_url: str | None = None
    video_url: str | None = None

class DrillResponse(BaseModel):
    id: int
    title: str
    intensity: str
    duration: str
    tags: List[str]
    # full_json_data: dict # We might exclude the massive JSON from the list view
    audio_url: str | None = None
    video_url: str | None = None
    created_at: str

    class Config:
        from_attributes = True

@router.post("/", response_model=DrillResponse)
def save_drill(drill: DrillCreate, db: Session = Depends(get_db)): # current_user: User = Depends(get_current_user)
    # Temporary hardcode user ID for hackathon if no auth is sent
    # user_id = current_user.id
    user_id = 1
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        # Auto-create a mock user if empty DB
        db_user = User(id=1, username="coach", email="coach@taible.com", hashed_password="mock")
        db.add(db_user)
        db.commit()

    new_drill = Drill(
        title=drill.title,
        tags=json.dumps(drill.tags),
        intensity=drill.intensity,
        duration=drill.duration,
        full_json_data=json.dumps(drill.full_json_data),
        audio_url=drill.audio_url,
        video_url=drill.video_url,
        user_id=user_id
    )
    db.add(new_drill)
    db.commit()
    db.refresh(new_drill)
    
    # Format response
    return DrillResponse(
        id=new_drill.id,
        title=new_drill.title,
        intensity=new_drill.intensity,
        duration=new_drill.duration,
        tags=json.loads(new_drill.tags),
        audio_url=new_drill.audio_url,
        video_url=new_drill.video_url,
        created_at=str(new_drill.created_at)
    )

@router.get("/", response_model=List[DrillResponse])
def get_drills(db: Session = Depends(get_db)):
    drills = db.query(Drill).order_by(Drill.created_at.desc()).all()
    # Format tags from json string
    res = []
    for d in drills:
        res.append(DrillResponse(
            id=d.id,
            title=d.title,
            intensity=d.intensity,
            duration=d.duration,
            tags=json.loads(d.tags) if d.tags else [],
            audio_url=d.audio_url,
            video_url=d.video_url,
            created_at=str(d.created_at)
        ))
    return res

@router.get("/{drill_id}")
def get_drill(drill_id: int, db: Session = Depends(get_db)):
    drill = db.query(Drill).filter(Drill.id == drill_id).first()
    if not drill:
        raise HTTPException(status_code=404, detail="Drill not found")
        
    return {
        "id": drill.id,
        "title": drill.title,
        "intensity": drill.intensity,
        "duration": drill.duration,
        "tags": json.loads(drill.tags) if drill.tags else [],
        "audio_url": drill.audio_url,
        "video_url": drill.video_url,
        "full_json_data": json.loads(drill.full_json_data) if drill.full_json_data else {},
        "created_at": str(drill.created_at)
    }

@router.delete("/{drill_id}")
def delete_drill(drill_id: int, db: Session = Depends(get_db)):
    # Assuming user_id=1 for now as per other endpoints
    user_id = 1
    
    drill = db.query(Drill).filter(Drill.id == drill_id, Drill.user_id == user_id).first()
    if not drill:
        raise HTTPException(status_code=404, detail="Drill not found")
        
    # Delete link associations first
    db.query(CollectionDrillLink).filter(CollectionDrillLink.drill_id == drill_id).delete()
    
    # Delete drill
    db.delete(drill)
    db.commit()
    return {"message": "Drill deleted successfully"}

class VideoUpdate(BaseModel):
    video_url: str

@router.patch("/{drill_id}/video")
def update_drill_video(drill_id: int, update: VideoUpdate, db: Session = Depends(get_db)):
    drill = db.query(Drill).filter(Drill.id == drill_id).first()
    if not drill:
        raise HTTPException(status_code=404, detail="Drill not found")
    
    drill.video_url = update.video_url
    db.commit()
    return {"message": "Video URL updated", "video_url": drill.video_url}
