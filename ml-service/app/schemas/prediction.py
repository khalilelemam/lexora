from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from . import to_camel
from .examples import (
    PREDICTION_REQUEST_EXAMPLE,
    PREDICTION_RESPONSE_EXAMPLE,
    WEBCAM_PREDICTION_RESPONSE_EXAMPLE,
)
from .gaze import GazeSequence


# ---------------------------------------------------------------------------
# Feature rows — raw per-fixation data for storage and visualization
# ---------------------------------------------------------------------------


class WebcamFeatureRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    timestamp: int
    duration_ms: float
    fixation_x: float
    fixation_y: float
    saccade_amplitude: float
    is_regression: bool
    is_return_sweep: Optional[bool] = False


class EyeTrackerFeatureRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    timestamp: int
    duration_ms: float
    fixation_x: float
    fixation_y: float
    saccade_amplitude: float
    saccade_velocity: float


class EyeTrackerFeatures(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    syllables: List[EyeTrackerFeatureRow]
    meaningful: List[EyeTrackerFeatureRow]
    pseudo: List[EyeTrackerFeatureRow]


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class PredictionRequest(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        json_schema_extra={"example": PREDICTION_REQUEST_EXAMPLE},
    )

    syllables_task: GazeSequence
    meaningful_task: GazeSequence
    pseudo_task: GazeSequence
    screen_width: Optional[int] = Field(default=1680, gt=0)
    screen_height: Optional[int] = Field(default=1050, gt=0)


class PredictionMetadata(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    sequences_analyzed: int
    total_fixations: int


class PredictionResponseBase(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    dyslexia_probability: float = Field(ge=0.0, le=1.0)
    risk_level: Literal["low", "medium", "high"]
    confidence: float = Field(ge=0.0, le=1.0)
    model_version: str
    metadata: PredictionMetadata


class PredictionResponse(PredictionResponseBase):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        json_schema_extra={"example": PREDICTION_RESPONSE_EXAMPLE},
    )

    features: EyeTrackerFeatures


class WebcamPredictionResponse(PredictionResponseBase):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        json_schema_extra={"example": WEBCAM_PREDICTION_RESPONSE_EXAMPLE},
    )

    features: List[WebcamFeatureRow]
