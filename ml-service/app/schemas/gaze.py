from typing import List

from pydantic import BaseModel, ConfigDict, Field, field_validator

from . import to_camel
from .examples import GAZE_POINT_EXAMPLE, GAZE_SEQUENCE_EXAMPLE


class GazePoint(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        json_schema_extra={"example": GAZE_POINT_EXAMPLE},
    )

    fixation_x: float = Field(ge=0.0, le=1.0)
    fixation_y: float = Field(ge=0.0, le=1.0)
    timestamp: int = Field(gt=0)


class GazeSequence(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        json_schema_extra={"example": GAZE_SEQUENCE_EXAMPLE},
    )

    gaze_points: List[GazePoint] = Field(min_length=20)
    normalized_line_centers: List[float] = Field(default_factory=list)

    @field_validator("gaze_points")
    @classmethod
    def validate_timestamps_ordered(cls, points: List[GazePoint]) -> List[GazePoint]:
        for i in range(1, len(points)):
            if points[i].timestamp <= points[i - 1].timestamp:
                raise ValueError(
                    f"Timestamps must be in ascending order. "
                    f"Point {i} ({points[i].timestamp}) <= Point {i - 1} ({points[i - 1].timestamp})"
                )
        return points
