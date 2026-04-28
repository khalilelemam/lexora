from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

class GamifiedPredictRequest(BaseModel):
    """Incoming session payload from the gamified test app with dynamic feature fields."""
    session_id: str = Field(..., min_length=1)
    participant_id: int | None = None

    # Accept dynamic model features like Gender, Age, Clicks1..Missrate32.
    model_config = ConfigDict(extra="allow")

class GamifiedPredictResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    session_id: str
    probability: float = Field(..., ge=0.0, le=1.0)
    threshold: float = Field(..., ge=0.0, le=1.0)
    prediction: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    age_group: str
    model_version: str
    timestamp: datetime
