import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.core import (
    global_exception_handler,
    lifespan,
    setup_middleware,
    validation_exception_handler,
)
from app.routers import health_router, predict_router, debug_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="ML service for dyslexia risk prediction from eye-tracking and webcam data",
        lifespan=lifespan,
    )

    setup_middleware(app)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)

    app.include_router(health_router)
    app.include_router(predict_router, prefix="/v1")
    app.include_router(debug_router)

    return app


app = create_app()
