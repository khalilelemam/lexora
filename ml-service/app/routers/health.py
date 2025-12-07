from fastapi import APIRouter, Request

from app.config import settings
from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    """Health check endpoint for monitoring and load balancers."""
    try:
        models_loaded = request.app.state.model_service.is_loaded()
        return HealthResponse(
            status="healthy" if models_loaded else "unhealthy",
            version=settings.APP_VERSION,
            models_loaded=models_loaded,
        )
    except Exception:
        return HealthResponse(
            status="unhealthy",
            version=settings.APP_VERSION,
            models_loaded=False,
        )
