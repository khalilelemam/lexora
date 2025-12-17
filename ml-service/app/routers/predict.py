import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.schemas import PredictionRequest, PredictionResponse, PredictionMetadata
from app.schemas.webcam import WebcamPredictionRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["prediction"])


@router.post("/eye-tracker/predict", response_model=PredictionResponse)
async def predict_eye_tracker(request: PredictionRequest, http_request: Request):
    try:
        features = http_request.app.state.eye_tracker_features
        prediction = http_request.app.state.eye_tracker_prediction

        syllables_sequences = features.process_gaze_points(
            request.syllables_task.gaze_points,
            request.screen_width,
            request.screen_height,
        )
        meaningful_sequences = features.process_gaze_points(
            request.meaningful_task.gaze_points,
            request.screen_width,
            request.screen_height,
        )
        pseudo_sequences = features.process_gaze_points(
            request.pseudo_task.gaze_points,
            request.screen_width,
            request.screen_height,
        )

        result = prediction.predict(
            syllables_sequences, meaningful_sequences, pseudo_sequences
        )

        return PredictionResponse(
            dyslexia_probability=result["dyslexia_probability"],
            risk_level=result["risk_level"],
            confidence=result["confidence"],
            metadata=PredictionMetadata(
                sequences_analyzed=result["sequences_analyzed"],
                total_fixations=(
                    len(request.syllables_task.gaze_points)
                    + len(request.meaningful_task.gaze_points)
                    + len(request.pseudo_task.gaze_points)
                ),
            ),
        )
    except ValueError as e:
        logger.warning(f"Validation error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during prediction",
        )


@router.post("/webcam/predict", response_model=PredictionResponse)
async def predict_webcam(request: WebcamPredictionRequest, http_request: Request):
    try:
        features = http_request.app.state.webcam_features
        prediction = http_request.app.state.webcam_prediction

        sequences = features.process(
            request.gaze_data, request.screen_width, request.screen_height
        )

        result = prediction.predict(sequences)

        return PredictionResponse(
            dyslexia_probability=result["dyslexia_probability"],
            risk_level=result["risk_level"],
            confidence=1.0,
            metadata=PredictionMetadata(
                sequences_analyzed=82,
                total_fixations=len(request.gaze_data),
            ),
        )
    except ValueError as e:
        logger.warning(f"Validation error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during prediction",
        )
