from typing import List

from pydantic import BaseModel, Field, ConfigDict

from . import to_camel
from .examples import WEBCAM_PREDICTION_REQUEST_EXAMPLE, RAW_GAZE_POINT_EXAMPLE


class RawGazePoint(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": RAW_GAZE_POINT_EXAMPLE})

    x: float = Field(description="X coordinate in pixels")
    y: float = Field(description="Y coordinate in pixels")
    timestamp: int = Field(description="Timestamp in milliseconds", gt=0)


class WebcamPredictionRequest(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        json_schema_extra={"example": WEBCAM_PREDICTION_REQUEST_EXAMPLE},
    )

    screen_width: int = Field(gt=0)
    screen_height: int = Field(gt=0)
    gaze_data: List[RawGazePoint] = Field(min_length=20)
    normalized_line_centers: List[float] = Field(default_factory=list)
