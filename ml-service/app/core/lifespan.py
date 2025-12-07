import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings, validate_model_files
from app.services import FeatureEngineer, get_model_service

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, cleanup on shutdown."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    validate_model_files()
    app.state.model_service = get_model_service()
    app.state.feature_engineer = FeatureEngineer()

    logger.info(f"Service ready on http://{settings.HOST}:{settings.PORT}")

    yield
