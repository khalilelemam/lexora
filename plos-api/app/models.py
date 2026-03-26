from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PredictRequest(BaseModel):
    """Incoming session payload from the test app with dynamic feature fields."""

    session_id: str = Field(..., min_length=1)
    participant_id: int | None = None

    # Accept dynamic model features like Gender, Age, Clicks1..Missrate32.
    model_config = ConfigDict(extra="allow")


class PredictResponse(BaseModel):
    session_id: str
    probability: float = Field(..., ge=0.0, le=1.0)
    threshold: float = Field(..., ge=0.0, le=1.0)
    prediction: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_version: str
    timestamp: datetime


class HealthResponse(BaseModel):
    status: str
    model_version: str
    features_count: int
    threshold: float
    message: str


class SchemaResponse(BaseModel):
    features: list[str]
    demographic_features: list[str]
    performance_features: list[str]
    questions: list[int]
    measures: list[str]


class ErrorResponse(BaseModel):
    detail: str
    debug: dict[str, Any] | None = None
