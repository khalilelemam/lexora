from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    APP_NAME: str = "Lexora ML Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    HOST: str = "0.0.0.0"
    PORT: int = 8001

    SKIP_MODEL_LOADING: bool = False

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    MODELS_DIR: Path = BASE_DIR / "models"

    CLASSIFIER_MODEL_PATH: Path = MODELS_DIR / "dyslexia-profile-model.h5"
    SCALER_PATH: Path = MODELS_DIR / "scaler.pkl"

    # Feature engineering parameters
    SEQUENCE_LENGTH: int = 20
    SEQUENCE_STEP: int = 5
    MAX_SEQUENCES: int = 100
    MIN_FIXATION_DURATION_MS: int = 80
    MAX_FIXATION_DURATION_MS: int = 1000

    # Risk classification thresholds
    LOW_RISK_THRESHOLD: float = 0.33
    HIGH_RISK_THRESHOLD: float = 0.66


settings = Settings()


def validate_model_files() -> None:
    required_files = {
        "Profile model": settings.CLASSIFIER_MODEL_PATH,
        "Scaler": settings.SCALER_PATH,
    }

    missing_files = []
    for name, path in required_files.items():
        if not path.exists():
            missing_files.append(f"{name}: {path}")

    if missing_files:
        raise FileNotFoundError(
            f"Missing required model files:\n"
            + "\n".join(f"  - {f}" for f in missing_files)
        )
