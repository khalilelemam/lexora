def to_camel(string: str) -> str:
    """Convert snake_case to camelCase for JSON serialization."""
    parts = string.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


from .gaze import GazePoint, GazeSequence
from .health import HealthResponse
from .prediction import (
    PredictionMetadata,
    PredictionRequest,
    PredictionResponse,
)

__all__ = [
    "to_camel",
    "GazePoint",
    "GazeSequence",
    "PredictionRequest",
    "PredictionResponse",
    "PredictionMetadata",
    "HealthResponse",
]
