from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

    HOST: str = "127.0.0.1"
    PORT: int = 28980
    DEBUG: bool = True
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]
    APP_NAME: str = "Lexora Eye Tracker Service"
    VERSION: str = "1.0.0"


settings = Settings()
