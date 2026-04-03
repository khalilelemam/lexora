from .health import router as health_router
from .predict import router as predict_router
from .debug import router as debug_router

__all__ = ["health_router", "predict_router", "debug_router"]
