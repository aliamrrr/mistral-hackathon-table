from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.db.database import engine, Base
from backend.api import auth, generate, drills, export, collections, stt, brainstorm, players


import os
# Create database tables
Base.metadata.create_all(bind=engine)

# Seed players on startup
from backend.db.database import SessionLocal
_seed_db = SessionLocal()
try:
    players.seed_players(_seed_db)
finally:
    _seed_db.close()


app = FastAPI(title="Taible Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(drills.router, prefix="/api/drills", tags=["drills"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(collections.router, prefix="/api/collections", tags=["collections"])
app.include_router(stt.router, prefix="/api/stt", tags=["stt"])
app.include_router(brainstorm.router, prefix="/api/brainstorm", tags=["brainstorm"])
app.include_router(players.router, prefix="/api/players", tags=["players"])


from fastapi.responses import RedirectResponse

# Mount static folder
os.makedirs("backend/static/audio", exist_ok=True)
os.makedirs("backend/static/videos", exist_ok=True)
os.makedirs("backend/static/players", exist_ok=True)

app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# Mount frontend folder
app.mount("/frontend", StaticFiles(directory="frontend", html=True), name="frontend")

@app.get("/")
def root():
    return RedirectResponse(url="/frontend/dashboard.html")
