import os
import json
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.db.database import get_db
from backend.db.models import Player

router = APIRouter()

UPLOAD_DIR = "backend/static/players"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------- Schemas ----------

class PlayerCreate(BaseModel):
    name: str
    number: int
    position: str
    nationality: str | None = None
    photo_url: str | None = None

class PlayerResponse(BaseModel):
    id: int
    name: str
    number: int
    position: str
    nationality: str | None = None
    photo_url: str | None = None
    created_at: str

    class Config:
        from_attributes = True

class PlayerUpdate(BaseModel):
    name: str | None = None
    number: int | None = None
    position: str | None = None
    nationality: str | None = None

# ---------- Seed Data (Man City 2024/25) ----------

MANCITY_PLAYERS = [
    # Gardiens
    {"name": "James Trafford",        "number": 1,  "position": "GK", "nationality": "England",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p224378.png"},
    {"name": "Marcus Bettinelli",     "number": 13, "position": "GK", "nationality": "England",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p236718.png"},
    {"name": "Gianluigi Donnarumma",   "number": 25, "position": "GK", "nationality": "Italy",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p193265.png"},
    
    # Défenseurs
    {"name": "Rúben Dias",            "number": 3,  "position": "CB", "nationality": "Portugal",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p171314.png"},
    {"name": "John Stones",           "number": 5,  "position": "CB", "nationality": "England",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p100675.png"},
    {"name": "Nathan Aké",            "number": 6,  "position": "CB", "nationality": "Netherlands",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p128636.png"},
    {"name": "Rayan Aït‑Nouri",       "number": 21, "position": "LB", "nationality": "Algeria",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p465449.png"},
    {"name": "Joško Gvardiol",        "number": 24, "position": "CB/LB", "nationality": "Croatia",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p449974.png"},
    {"name": "Abdukodir Khusanov",    "number": 45, "position": "CB", "nationality": "Uzbekistan",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p467831.png"},
    {"name": "Rico Lewis",            "number": 82, "position": "RB", "nationality": "England",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p493306.png"},
    {"name": "Max Alleyne",           "number": 68, "position": "CB", "nationality": "England",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/pXXXXX.png"},  # à remplacer
    {"name": "Nico O’Reilly",         "number": 33, "position": "LB/CM", "nationality": "England",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/pXXXXX.png"},  # à remplacer
    
    # Milieux
    {"name": "Tijjani Reijnders",     "number": 4,  "position": "CM", "nationality": "Netherlands",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p216398.png"},
    {"name": "Mateo Kovačić",         "number": 8,  "position": "CM", "nationality": "Croatia",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p80767.png"},
    {"name": "Matheus Nunes",         "number": 27, "position": "CM", "nationality": "Portugal",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/pXXXXX.png"},
    {"name": "Rodri",                 "number": 16, "position": "CDM", "nationality": "Spain",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p220566.png"},
    {"name": "Bernardo Silva",        "number": 20, "position": "CM", "nationality": "Portugal",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p165809.png"},
    {"name": "Savinho",               "number": 26, "position": "CM/RW", "nationality": "Brazil",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p547622.png"},
    {"name": "Nico González",         "number": 14, "position": "CM", "nationality": "Spain",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/pXXXXX.png"},
    
    # Attaquants / Ailiers
    {"name": "Phil Foden",            "number": 47, "position": "AM/LW/RW", "nationality": "England",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p209244.png"},
    {"name": "Rayan Cherki",          "number": 29, "position": "AM/LW", "nationality": "France",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p231145.png"},
    {"name": "Jérémy Doku",           "number": 11, "position": "LW", "nationality": "Belgium",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p447713.png"},
    {"name": "Omar Marmoush",         "number": 7,  "position": "ST/LW/RW", "nationality": "Egypt",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p209885.png"},
    {"name": "Erling Haaland",        "number": 9,  "position": "ST", "nationality": "Norway",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/p223094.png"},
    {"name": "Antoine Semenyo",       "number": 42, "position": "LW/RW", "nationality": "Ghana",
     "photo_url": "https://resources.premierleague.com/premierleague/photos/players/250x250/pXXXXX.png"},
]


def seed_players(db: Session):
    """Seed Man City players if table is empty."""
    count = db.query(Player).count()
    if count == 0:
        for p in MANCITY_PLAYERS:
            db.add(Player(
                name=p["name"],
                number=p["number"],
                position=p["position"],
                nationality=p["nationality"],
                photo_url=p["photo_url"],
                user_id=1,
            ))
        db.commit()
        print(f"[SEED] Inserted {len(MANCITY_PLAYERS)} Man City players.")


# ---------- Endpoints ----------

@router.get("/", response_model=List[PlayerResponse])
def get_players(db: Session = Depends(get_db)):
    players = db.query(Player).order_by(Player.number).all()
    return [PlayerResponse(
        id=p.id, name=p.name, number=p.number, position=p.position,
        nationality=p.nationality, photo_url=p.photo_url,
        created_at=str(p.created_at)
    ) for p in players]


@router.post("/", response_model=PlayerResponse)
def create_player(player: PlayerCreate, db: Session = Depends(get_db)):
    new_player = Player(
        name=player.name,
        number=player.number,
        position=player.position,
        nationality=player.nationality,
        photo_url=player.photo_url,
        user_id=1,
    )
    db.add(new_player)
    db.commit()
    db.refresh(new_player)
    return PlayerResponse(
        id=new_player.id, name=new_player.name, number=new_player.number,
        position=new_player.position, nationality=new_player.nationality,
        photo_url=new_player.photo_url, created_at=str(new_player.created_at)
    )


@router.post("/{player_id}/photo", response_model=PlayerResponse)
async def upload_player_photo(player_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"player_{player_id}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    player.photo_url = f"/static/players/{filename}"
    db.commit()
    db.refresh(player)

    return PlayerResponse(
        id=player.id, name=player.name, number=player.number,
        position=player.position, nationality=player.nationality,
        photo_url=player.photo_url, created_at=str(player.created_at)
    )


@router.put("/{player_id}", response_model=PlayerResponse)
def update_player(player_id: int, update: PlayerUpdate, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    if update.name is not None:
        player.name = update.name
    if update.number is not None:
        player.number = update.number
    if update.position is not None:
        player.position = update.position
    if update.nationality is not None:
        player.nationality = update.nationality

    db.commit()
    db.refresh(player)

    return PlayerResponse(
        id=player.id, name=player.name, number=player.number,
        position=player.position, nationality=player.nationality,
        photo_url=player.photo_url, created_at=str(player.created_at)
    )


@router.delete("/{player_id}")
def delete_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Delete photo file if it's a local upload
    if player.photo_url and player.photo_url.startswith("/static/players/"):
        filepath = os.path.join("backend", player.photo_url.lstrip("/"))
        if os.path.exists(filepath):
            os.remove(filepath)

    db.delete(player)
    db.commit()
    return {"message": "Player deleted successfully"}
