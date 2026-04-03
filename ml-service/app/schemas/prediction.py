from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from . import to_camel
from .examples import PREDICTION_REQUEST_EXAMPLE, PREDICTION_RESPONSE_EXAMPLE
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


class PipelineMetrics(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    feature_extraction_ms: Optional[float] = None
    inference_ms: Optional[float] = None
    total_ms: Optional[float] = None
    total_fixations: Optional[int] = None
    mean_fixation_duration_ms: Optional[float] = None
    fixation_duration_sd: Optional[float] = None
    # Data Funnel (detailed retention tracking)
    normalized_retention_pct: Optional[float] = None
    fixation_retention_pct: Optional[float] = None
    total_pipeline_retention_pct: Optional[float] = None
    # Invalid Data Tracking
    out_of_bounds_points: Optional[int] = None
    invalid_fixation_points: Optional[int] = None
    # Spatial metrics
    mean_saccade_amplitude: Optional[float] = None
    total_regressions: Optional[int] = None
    intra_fixation_jitter: Optional[float] = None
    # Legacy field (kept for backwards compatibility)
    data_retention_pct: Optional[float] = None


class PredictionMetadata(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    sequences_analyzed: int
    total_fixations: int
    pipeline_metrics: Optional[PipelineMetrics] = None


class PredictionResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        json_schema_extra={"example": PREDICTION_RESPONSE_EXAMPLE},
    )

    dyslexia_probability: float = Field(ge=0.0, le=1.0)
    risk_level: Literal["low", "medium", "high"]
    confidence: float = Field(ge=0.0, le=1.0)
    metadata: PredictionMetadata
    features: EyeTrackerFeatures


class WebcamPredictionResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    dyslexia_probability: float = Field(ge=0.0, le=1.0)
    risk_level: Literal["low", "medium", "high"]
    confidence: float = Field(ge=0.0, le=1.0)
    metadata: PredictionMetadata
    features: List[WebcamFeatureRow]
