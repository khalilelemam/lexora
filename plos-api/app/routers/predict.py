from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from app.models import PredictRequest, PredictResponse
from app.predictor import DyslexiaPredictor

router = APIRouter(prefix="/api/v1", tags=["prediction"])


def build_example_payload(kind: str):
    if kind == "dyslexic":
        payload: dict[str, float | int | str] = {
            "session_id": "example-dys-001",
            "participant_id": 101,
            "Gender": 1,
            "Nativelang": 1,
            "Otherlang": 1,
            "Age": 8,
        }
        for q in range(1, 33):
            payload[f"Clicks{q}"] = 3
            payload[f"Hits{q}"] = 1
            payload[f"Misses{q}"] = 2
            payload[f"Score{q}"] = 1
            payload[f"Accuracy{q}"] = 1 / 3
            payload[f"Missrate{q}"] = 2 / 3
        return payload

    payload = {
        "session_id": "example-nondys-001",
        "participant_id": 202,
        "Gender": 0,
        "Nativelang": 1,
        "Otherlang": 0,
        "Age": 10,
    }
    for q in range(1, 33):
        payload[f"Clicks{q}"] = 20
        payload[f"Hits{q}"] = 19
        payload[f"Misses{q}"] = 1
        payload[f"Score{q}"] = 19
        payload[f"Accuracy{q}"] = 0.95
        payload[f"Missrate{q}"] = 0.05
    return payload


@router.post(
    "/predict",
    response_model=PredictResponse,
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "examples": {
                        "dyslexic_example": {
                            "summary": "High-risk (dyslexic-like) profile",
                            "value": build_example_payload("dyslexic"),
                        },
                        "non_dyslexic_example": {
                            "summary": "Low-risk (non-dyslexic-like) profile",
                            "value": build_example_payload("non_dyslexic"),
                        },
                    }
                }
            }
        }
    },
)
async def predict_dyslexia(request_body: PredictRequest, request: Request):
    predictor: DyslexiaPredictor | None = getattr(request.app.state, "predictor", None)
    if predictor is None or not predictor.is_ready():
        raise HTTPException(status_code=503, detail="Model is not loaded")

    payload = request_body.model_dump()
    is_valid, error_message = predictor.validate_payload(payload)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)

    try:
        result = predictor.predict(payload)
        return PredictResponse(
            session_id=request_body.session_id,
            probability=result.probability,
            threshold=result.threshold,
            prediction=result.prediction,
            confidence=result.confidence,
            model_version=predictor.model_version,
            timestamp=datetime.now(timezone.utc),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


@router.get("/predict/examples")
async def prediction_examples():
    return {
        "dyslexic_example": build_example_payload("dyslexic"),
        "non_dyslexic_example": build_example_payload("non_dyslexic"),
    }
