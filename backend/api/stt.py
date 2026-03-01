import os
import tempfile
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File
import pypdf
import docx
from io import BytesIO
from backend.services.stt_service import transcribe_audio, get_scribe_token, get_conv_ai_token

router = APIRouter()

@router.get("/token/scribe")
async def fetch_scribe_token():
    try:
        token = get_scribe_token()
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/token/brainstorm")
async def fetch_brainstorm_token():
    try:
        token = get_conv_ai_token()
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Receives an audio file (e.g. .wav or .webm) and returns the transcribed text.
    """
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio format")
    
    # Save to a temporary file for processing
    suffix = os.path.splitext(file.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        text = transcribe_audio(tmp_path)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.post("/context/upload")
async def upload_context_file(file: UploadFile = File(...)):
    """
    Uploads a PDF or Docx file and extracts its text content for context.
    """
    content = await file.read()
    text = ""
    
    try:
        if file.content_type == "application/pdf":
            pdf_reader = pypdf.PdfReader(BytesIO(content))
            for page in pdf_reader.pages:
                text += page.extract_text() or ""
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            doc = docx.Document(BytesIO(content))
            for para in doc.paragraphs:
                text += para.text + "\n"
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload PDF or Docx.")
        
        return {"text": text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")
