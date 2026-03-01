import os
from elevenlabs.client import ElevenLabs
from elevenlabs import save
from backend.core.config import settings

client = ElevenLabs(api_key=settings.eleven_labs_api_key)

def generate_narration_audio(text: str, drill_id: str) -> str:
    """
    Generates TTS audio for the drill narration and saves it local to serve.
    Returns the URL/path to the audio file.
    """
    audio = client.text_to_speech.convert(
        text=text,
        voice_id="gUbIduqGzBP438teh4ZA", # Voice: Adam
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )
    
    # Save to a public/static folder
    os.makedirs("backend/static/audio", exist_ok=True)
    file_path = f"backend/static/audio/drill_{drill_id}.mp3"
    
    # audio is an iterator of bytes
    with open(file_path, "wb") as f:
        for chunk in audio:
            f.write(chunk)
            
    return f"/static/audio/drill_{drill_id}.mp3"
