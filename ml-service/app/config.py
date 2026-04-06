from pathlib import Path
from typing import List
import tomllib

from pydantic_settings import BaseSettings, SettingsConfigDict


def _load_project_metadata() -> dict[str, str]:
    pyproject_path = Path(__file__).resolve().parent.parent / "pyproject.toml"
    fallback = {
        "name": "Lexora ML Service",
        "version": "0.0.0",
        "description": "ML service for dyslexia risk prediction from eye-tracking and webcam gaze data",
    }

    try:
        with open(pyproject_path, "rb") as f:
            data = tomllib.load(f)
        project = data.get("project", {})
        lexora_tool = data.get("tool", {}).get("lexora", {})
        return {
            "name": str(
                lexora_tool.get("app_name", project.get("name", fallback["name"]))
            ),
            "version": str(project.get("version", fallback["version"])),
            "description": str(project.get("description", fallback["description"])),
        }
    except (FileNotFoundError, tomllib.TOMLDecodeError):
        return fallback


PROJECT_METADATA = _load_project_metadata()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    APP_NAME: str = PROJECT_METADATA["name"]
    APP_VERSION: str = PROJECT_METADATA["version"]
    APP_DESCRIPTION: str = PROJECT_METADATA["description"]
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

    # Feature engineering parameters (Webcam)
    WEBCAM_MIN_FIXATION_MS: int = 50
    WEBCAM_MAX_FIXATION_MS: int = 1500
    WEBCAM_IDT_DISPERSION_THRESHOLD: float = 0.04
    WEBCAM_IDT_MIN_WINDOW_MS: int = 150
    WEBCAM_LINE_TRANSITION_THRESHOLD: float = 0.04
    WEBCAM_ONE_EURO_MINCUTOFF: float = 1.0
    WEBCAM_ONE_EURO_BETA: float = 0.007
    WEBCAM_ONE_EURO_DCUTOFF: float = 1.0
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
