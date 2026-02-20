from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase for JSON serialization."""
    parts = string.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class GazePoint(BaseModel):
    """Represents a single gaze point from the eye tracker."""

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        json_schema_extra={
            "example": {
                "fixationX": 0.5,
                "fixationY": 0.5,
                "timestamp": 1234567890,
            }
        },
    )

    fixation_x: float = Field(..., description="X coordinate (normalized 0-1)")
    fixation_y: float = Field(..., description="Y coordinate (normalized 0-1)")
    timestamp: int = Field(..., description="System timestamp in microseconds")


class DeviceInfo(BaseModel):
    """Tobii Pro device information."""

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    device_name: str
    serial_number: str
    model: str
    firmware_version: str


class StatusResponse(BaseModel):
    """Response for the /status endpoint."""

    connected: bool
    device: Optional[DeviceInfo] = None
