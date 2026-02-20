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

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    MODELS_DIR: Path = BASE_DIR / "models"

    # Eye tracker model paths
    EYE_TRACKER_MODEL_PATH: Path = (
        MODELS_DIR / "eye-tracker" / "dyslexia_profile_model.keras"
    )
    EYE_TRACKER_SCALER_PATH: Path = MODELS_DIR / "eye-tracker" / "scaler.pkl"

    # Webcam model paths
    WEBCAM_MODEL_PATH: Path = MODELS_DIR / "webcam" / "dyslexia_uda_classifier.keras"
    WEBCAM_SCALER_PATH: Path = MODELS_DIR / "webcam" / "target_domain_scaler.pkl"

    # Feature engineering parameters (Eye Tracker)
    EYE_TRACKER_SEQUENCE_LENGTH: int = 20
    EYE_TRACKER_SEQUENCE_STEP: int = 5
    EYE_TRACKER_MAX_SEQUENCES: int = 100
    EYE_TRACKER_MIN_FIXATION_MS: int = 80
    EYE_TRACKER_MAX_FIXATION_MS: int = 1000

    # Feature engineering parameters (Webcam I-VT algorithm)
    WEBCAM_VELOCITY_THRESHOLD: float = 0.5  # normalized units/second
    WEBCAM_MIN_FIXATION_MS: int = 50
    WEBCAM_MAX_FIXATION_MS: int = 1500
    WEBCAM_EMA_ALPHA: float = 0.5  # Exponential moving average smoothing
    WEBCAM_MAX_SEQUENCES: int = 82
    WEBCAM_MIN_SEQUENCES: int = 10  # Minimum sequences for valid prediction

    # Risk classification thresholds
    LOW_RISK_THRESHOLD: float = 0.33
    HIGH_RISK_THRESHOLD: float = 0.66


settings = Settings()


def validate_model_files() -> None:
    required_files = {
        "Eye tracker model": settings.EYE_TRACKER_MODEL_PATH,
        "Eye tracker scaler": settings.EYE_TRACKER_SCALER_PATH,
        "Webcam model": settings.WEBCAM_MODEL_PATH,
        "Webcam scaler": settings.WEBCAM_SCALER_PATH,
    }

    missing_files = []
    for name, path in required_files.items():
        if not path.exists():
            missing_files.append(f"{name}: {path}")

    if missing_files:
        raise FileNotFoundError(
            "Missing required model files:\n"
            + "\n".join(f"  - {f}" for f in missing_files)
        )
