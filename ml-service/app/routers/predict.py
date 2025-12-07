import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.config import settings
from app.schemas import (
    PredictionRequest,
    PredictionResponse,
    PredictionMetadata,
)
from app.services import FeatureEngineer, ModelService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["prediction"])


def predict_dyslexia_risk(
    request: PredictionRequest,
    feature_engineer: FeatureEngineer,
    model_service: ModelService,
) -> PredictionResponse:
    syllables_sequences = feature_engineer.process_gaze_points(
        request.syllables_task.gaze_points,
        request.screen_width,
        request.screen_height,
    )
    meaningful_sequences = feature_engineer.process_gaze_points(
        request.meaningful_task.gaze_points,
        request.screen_width,
        request.screen_height,
    )
    pseudo_sequences = feature_engineer.process_gaze_points(
        request.pseudo_task.gaze_points,
        request.screen_width,
        request.screen_height,
    )

    probability, confidence, n_sequences = model_service.predict(
        syllables_sequences, meaningful_sequences, pseudo_sequences
    )

    risk_level = model_service.get_risk_level(probability)

    return PredictionResponse(
        dyslexia_probability=probability,
        risk_level=risk_level,
        confidence=confidence,
        metadata=PredictionMetadata(
            model_version=settings.APP_VERSION,
            sequences_analyzed=n_sequences,
            total_fixations=(
                len(request.syllables_task.gaze_points)
                + len(request.meaningful_task.gaze_points)
                + len(request.pseudo_task.gaze_points)
            ),
        ),
    )


@router.post(
    "/predict", response_model=PredictionResponse, status_code=status.HTTP_200_OK
)
async def predict_dyslexia(request: PredictionRequest, http_request: Request):
    try:
        return predict_dyslexia_risk(
            request=request,
            feature_engineer=http_request.app.state.feature_engineer,
            model_service=http_request.app.state.model_service,
        )
    except ValueError as e:
        logger.warning(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during prediction",
        )
