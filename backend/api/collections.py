from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json

from backend.db.database import get_db
from backend.db.models import Collection, CollectionDrillLink, Drill

router = APIRouter()

# Schema definitions
class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CollectionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: str
    
    class Config:
        from_attributes = True

class CollectionWithDrills(CollectionResponse):
    drill_ids: List[int]

# Endpoints
@router.get("/", response_model=List[CollectionWithDrills])
def get_collections(db: Session = Depends(get_db)):
    # Assuming user_id=1 for now as in drills.py
    user_id = 1
    collections = db.query(Collection).filter(Collection.user_id == user_id).order_by(Collection.created_at.desc()).all()
    
    res = []
    for c in collections:
        # fetch links
        links = db.query(CollectionDrillLink).filter(CollectionDrillLink.collection_id == c.id).all()
        d_ids = [lk.drill_id for lk in links]
        
        res.append(CollectionWithDrills(
            id=c.id,
            name=c.name,
            description=c.description,
            created_at=str(c.created_at),
            drill_ids=d_ids
        ))
    return res

@router.post("/", response_model=CollectionResponse)
def create_collection(coll: CollectionCreate, db: Session = Depends(get_db)):
    user_id = 1
    new_coll = Collection(
        name=coll.name,
        description=coll.description,
        user_id=user_id
    )
    db.add(new_coll)
    db.commit()
    db.refresh(new_coll)
    
    return CollectionResponse(
        id=new_coll.id,
        name=new_coll.name,
        description=new_coll.description,
        created_at=str(new_coll.created_at)
    )

@router.delete("/{collection_id}")
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    user_id = 1
    coll = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")
        
    # Delete all links first
    db.query(CollectionDrillLink).filter(CollectionDrillLink.collection_id == collection_id).delete()
    
    # Delete the collection
    db.delete(coll)
    db.commit()
    return {"message": "Collection deleted successfully"}

@router.post("/{collection_id}/drills/{drill_id}")
def add_drill_to_collection(collection_id: int, drill_id: int, db: Session = Depends(get_db)):
    user_id = 1
    coll = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
    drill = db.query(Drill).filter(Drill.id == drill_id, Drill.user_id == user_id).first()
    
    if not coll or not drill:
        raise HTTPException(status_code=404, detail="Collection or Drill not found")
        
    # Check if link exists
    existing = db.query(CollectionDrillLink).filter(
        CollectionDrillLink.collection_id == collection_id, 
        CollectionDrillLink.drill_id == drill_id
    ).first()
    
    if existing:
        return {"message": "Drill already in collection"}
        
    link = CollectionDrillLink(collection_id=collection_id, drill_id=drill_id)
    db.add(link)
    db.commit()
    return {"message": "Drill added to collection"}

@router.delete("/{collection_id}/drills/{drill_id}")
def remove_drill_from_collection(collection_id: int, drill_id: int, db: Session = Depends(get_db)):
    user_id = 1
    link = db.query(CollectionDrillLink).filter(
        CollectionDrillLink.collection_id == collection_id, 
        CollectionDrillLink.drill_id == drill_id
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Drill not found in this collection")
        
    db.delete(link)
    db.commit()
    return {"message": "Drill removed from collection"}
