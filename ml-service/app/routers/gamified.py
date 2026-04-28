import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, status

from app.schemas.gamified import GamifiedPredictRequest, GamifiedPredictResponse
from app.services.gamified.predictor import GamifiedPredictor

logger = logging.getLogger(__name__)

router = APIRouter(tags=["gamified"])

def _bad_request(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"code": "BAD_REQUEST", "message": message},
    )

def _internal_error(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "code": "INTERNAL_ERROR",
            "message": message,
        },
    )

@router.post(
    "/gamified/predict",
    response_model=GamifiedPredictResponse,
)
async def predict_gamified(request_body: GamifiedPredictRequest, request: Request):
    predictor: GamifiedPredictor | None = getattr(request.app.state, "gamified_predictor", None)
    
    if predictor is None or not predictor.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gamified predictor is not loaded or ready.",
        )

    payload = request_body.model_dump()
    is_valid, error_message = predictor.validate_payload(payload)
    if not is_valid:
        raise _bad_request(error_message)

    try:
        result = predictor.predict(payload)
        return GamifiedPredictResponse(
            session_id=request_body.session_id,
            probability=result.probability,
            threshold=result.threshold,
            prediction=result.prediction,
            confidence=result.confidence,
            age_group=result.age_group,
            model_version=result.model_version,
            timestamp=datetime.now(timezone.utc),
        )
    except Exception as exc:
        logger.error(f"Gamified prediction failed: {exc}", exc_info=True)
        raise _internal_error(f"Prediction failed: {exc}")
