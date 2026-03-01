from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from backend.services.video_service import generate_video, enrich_with_dense_frames

router = APIRouter()

@router.post("/")
async def export_drill_video(request: Request):
    try:
        drill_data = await request.json()
        
        # Safely unwrap if nested inside 'full_json_data'
        if "full_json_data" in drill_data:
            drill_data = drill_data["full_json_data"]

        # Validate animation block exists
        if "animation" not in drill_data:
            raise HTTPException(status_code=400, detail="Drill lacks animation data")

        # Enrich with dense frames if missing (old drills)
        if "frames" not in drill_data["animation"]:
            drill_data = enrich_with_dense_frames(drill_data)

        # Final safety check after enrichment
        if "frames" not in drill_data.get("animation", {}):
            raise HTTPException(status_code=500, detail="Frame enrichment failed — no frames generated")

        audio_url = drill_data.get("audio_url", "")

        # Pass the FULL drill_data, not just the animation sub-dict
        video_url = generate_video(drill_data, audio_url, fps=60)
        return {"export_url": video_url}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Video generation failed: {e}")