import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings, validate_model_files
from app.services import (
    EyeTrackerFeatureProcessor,
    EyeTrackerPredictionService,
    WebcamFeatureProcessor,
    WebcamPredictionService,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    validate_model_files()

    app.state.eye_tracker_features = EyeTrackerFeatureProcessor()
    app.state.eye_tracker_prediction = EyeTrackerPredictionService()
    app.state.webcam_features = WebcamFeatureProcessor()
    app.state.webcam_prediction = WebcamPredictionService()

    logger.info(f"Service ready on http://{settings.HOST}:{settings.PORT}")

    yield
