from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, ConfigDict

from . import to_camel
from .gaze import GazeSequence
from .examples import PREDICTION_REQUEST_EXAMPLE, PREDICTION_RESPONSE_EXAMPLE


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
        protected_namespaces=(),  # Allow fields starting with "model_"
    )

    model_version: str
    sequences_analyzed: int
    total_fixations: int
    processed_at: datetime = Field(default_factory=datetime.utcnow)


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
