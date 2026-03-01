from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.database import Base

class CollectionDrillLink(Base):
    __tablename__ = "collection_drill_links"
    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id"))
    drill_id = Column(Integer, ForeignKey("drills.id"))
    
class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="collections")
    # Using dynamic or eager loading for drills as needed. 
    # For now, we will query links directly in the API for simplicity instead of complex relationship joins.

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    drills = relationship("Drill", back_populates="owner")
    collections = relationship("Collection", back_populates="owner")

class Drill(Base):
    __tablename__ = "drills"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    tags = Column(String) # JSON encoded list of tags
    intensity = Column(String)
    duration = Column(String)
    full_json_data = Column(Text) # The generated animation schema
    audio_url = Column(String, nullable=True) # URL or path to the elevenlabs audio
    video_url = Column(String, nullable=True) # URL or path to the exported MP4 video
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="drills")

class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    number = Column(Integer)
    position = Column(String)  # GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST
    nationality = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)  # Path to uploaded photo
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), default=1)
