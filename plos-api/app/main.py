import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.predictor import DyslexiaPredictor
from app.routers.health import router as health_router
from app.routers.predict import router as predict_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_path = os.getenv("MODEL_PATH", "./model/plos-model.joblib")
    try:
        app.state.predictor = DyslexiaPredictor(model_path)
        logger.info("FastAPI ready")
    except Exception as exc:
        logger.exception("Unable to initialize predictor: %s", exc)
        app.state.predictor = None

    yield


app = FastAPI(
    title="Dyslexia Prediction API",
    version="1.0.0",
    description="Prediction service for the PLOS dyslexia model",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(predict_router)


@app.get("/")
async def root():
    return {
        "service": "dyslexia-predictor",
        "version": "1.0.0",
        "health": "/api/v1/health",
        "docs": "/docs",
    }
