from fastapi import APIRouter

from app.config import settings
from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Simple health check - if this returns, the service is running."""
    return HealthResponse(status="ok", version=settings.APP_VERSION)
