"""Gaze data models."""

from pydantic import BaseModel, Field


class GazePoint(BaseModel):
    """Represents a single gaze point from the eye tracker."""

    fixation_x: float = Field(..., description="X coordinate (normalized 0-1)")
    fixation_y: float = Field(..., description="Y coordinate (normalized 0-1)")
    timestamp: int = Field(..., description="System timestamp in microseconds")

    class Config:
        json_schema_extra = {
            "example": {
                "fixation_x": 0.5,
                "fixation_y": 0.5,
                "timestamp": 1234567890,
            }
        }
