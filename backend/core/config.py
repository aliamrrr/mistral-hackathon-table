import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    mistral_api_key: str = os.getenv("MISTRAL_API_KEY", "").strip()
    eleven_labs_api_key: str = os.getenv("ELEVEN_LABS_API_KEY", "").strip()
    secret_key: str = "T4ibl3_v3ry_s3cr3t_k3y_h4ck4th0n"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7 # 1 week
    database_url: str = "sqlite:///./taible.db"

settings = Settings()
