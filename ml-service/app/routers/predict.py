import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.config import settings
from app.schemas import (
    EyeTrackerFeatureRow,
    EyeTrackerFeatures,
    ErrorResponse,
    PredictionMetadata,
    PredictionRequest,
    PredictionResponse,
    WebcamFeatureRow,
    WebcamPredictionResponse,
)
from app.schemas.webcam import WebcamPredictionRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["prediction"])


def _bad_request(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"code": "BAD_REQUEST", "message": message},
    )


def _internal_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred during prediction.",
        },
    )


_ERROR_RESPONSES = {
    400: {
        "model": ErrorResponse,
        "description": "Invalid data or insufficient fixations",
    },
    422: {"model": ErrorResponse, "description": "Schema validation failed"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}


@router.post(
    "/eye-tracker/predict",
    response_model=PredictionResponse,
    responses=_ERROR_RESPONSES,
)
async def predict_eye_tracker(request: PredictionRequest, http_request: Request):
    try:
        features = http_request.app.state.eye_tracker_features
        prediction = http_request.app.state.eye_tracker_prediction

        syl_result = features.process_gaze_points(
            request.syllables_task.gaze_points,
            request.screen_width,
            request.screen_height,
            request.syllables_task.normalized_line_centers,
        )
        mean_result = features.process_gaze_points(
            request.meaningful_task.gaze_points,
            request.screen_width,
            request.screen_height,
            request.meaningful_task.normalized_line_centers,
        )
        pseudo_result = features.process_gaze_points(
            request.pseudo_task.gaze_points,
            request.screen_width,
            request.screen_height,
            request.pseudo_task.normalized_line_centers,
        )

        result = prediction.predict(
            syl_result.sequences, mean_result.sequences, pseudo_result.sequences
        )

        sequences_analyzed = (
            syl_result.sequences_analyzed
            + mean_result.sequences_analyzed
            + pseudo_result.sequences_analyzed
        )

        return PredictionResponse(
            dyslexia_probability=result["dyslexia_probability"],
            risk_level=result["risk_level"],
            confidence=result["confidence"],
            model_version=settings.APP_VERSION,
            metadata=PredictionMetadata(
                sequences_analyzed=sequences_analyzed,
                total_fixations=(
                    syl_result.valid_fixations
                    + mean_result.valid_fixations
                    + pseudo_result.valid_fixations
                ),
            ),
            features=EyeTrackerFeatures(
                syllables=[EyeTrackerFeatureRow(**f) for f in syl_result.features_data],
                meaningful=[
                    EyeTrackerFeatureRow(**f) for f in mean_result.features_data
                ],
                pseudo=[EyeTrackerFeatureRow(**f) for f in pseudo_result.features_data],
            ),
        )
    except ValueError as e:
        logger.warning(f"Validation error: {e}")
        raise _bad_request(str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise _internal_error()


@router.post(
    "/webcam/predict",
    response_model=WebcamPredictionResponse,
    responses=_ERROR_RESPONSES,
)
async def predict_webcam(request: WebcamPredictionRequest, http_request: Request):
    try:
        features = http_request.app.state.webcam_features
        prediction = http_request.app.state.webcam_prediction

        processing = features.process(
            request.gaze_data,
            request.screen_width,
            request.screen_height,
            request.normalized_line_centers,
        )

        result = prediction.predict(processing.sequences)

        return WebcamPredictionResponse(
            dyslexia_probability=result["dyslexia_probability"],
            risk_level=result["risk_level"],
            confidence=1.0,
            model_version=settings.APP_VERSION,
            metadata=PredictionMetadata(
                sequences_analyzed=processing.sequences_analyzed,
                total_fixations=processing.total_fixations,
            ),
            features=[WebcamFeatureRow(**f) for f in processing.features_data],
        )
    except ValueError as e:
        logger.warning(f"Validation error: {e}")
        raise _bad_request(str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise _internal_error()
