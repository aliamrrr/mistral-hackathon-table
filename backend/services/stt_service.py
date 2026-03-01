import os
import requests
from elevenlabs.client import ElevenLabs
from backend.core.config import settings

client = ElevenLabs(api_key=settings.eleven_labs_api_key)

def get_scribe_token() -> str:
    """
    Generates a single-use token for ElevenLabs Scribe (Real-time STT).
    """
    url = "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe"
    headers = {"xi-api-key": settings.eleven_labs_api_key}
    response = requests.post(url, headers=headers)
    response.raise_for_status()
    return response.json()["token"]

def get_conv_ai_token() -> str:
    """
    Generates a single-use token for ElevenLabs Conversational AI.
    """
    # Note: For Conversational AI, we typically need a token for the specific agent session
    # but the generic single-use-token also works for the SDK.
    url = "https://api.elevenlabs.io/v1/single-use-token/conversational_ai"
    headers = {"xi-api-key": settings.eleven_labs_api_key}
    response = requests.post(url, headers=headers)
    response.raise_for_status()
    return response.json()["token"]

def transcribe_audio(audio_file_path: str) -> str:
    """
    Transcribes an audio file using ElevenLabs Scribe (STT).
    """
    try:
        with open(audio_file_path, "rb") as audio_file:
            transcription = client.speech_to_text.convert(
                file=audio_file,
                model_id="scribe_v2", # ElevenLabs Scribe model
            )
            return transcription.text
    except Exception as e:
        print(f"ElevenLabs STT Error: {e}")
        raise e
