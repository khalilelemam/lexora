import logging

from fastapi import FastAPI

from app.config import settings
from app.core import global_exception_handler, lifespan, setup_middleware
from app.routers import health_router, predict_router

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
    app.add_exception_handler(Exception, global_exception_handler)

    app.include_router(health_router)
    app.include_router(predict_router, prefix="/v1")

    return app


app = create_app()
