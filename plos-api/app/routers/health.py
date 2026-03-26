from fastapi import APIRouter, Request

from app.models import HealthResponse, SchemaResponse
from app.predictor import DyslexiaPredictor

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    predictor: DyslexiaPredictor | None = getattr(request.app.state, "predictor", None)
    if predictor is None or not predictor.is_ready():
        return HealthResponse(
            status="error",
            model_version="unknown",
            features_count=0,
            threshold=0.0,
            message="Model is not loaded",
        )

    return HealthResponse(
        status="healthy",
        model_version=predictor.model_version,
        features_count=len(predictor.feature_names),
        threshold=predictor.threshold,
        message="Model loaded and ready",
    )


@router.get("/schema", response_model=SchemaResponse)
async def schema(request: Request):
    predictor: DyslexiaPredictor | None = getattr(request.app.state, "predictor", None)
    if predictor is None or not predictor.is_ready():
        return SchemaResponse(
            features=[],
            demographic_features=[],
            performance_features=[],
            questions=[],
            measures=[],
        )

    demographic = ["Gender", "Nativelang", "Otherlang", "Age"]
    features = predictor.feature_names
    performance = [feature for feature in features if feature not in demographic]

    questions: set[int] = set()
    measures = ["Clicks", "Hits", "Misses", "Score", "Accuracy", "Missrate"]
    for feature in performance:
        for prefix in measures:
            if feature.startswith(prefix):
                suffix = feature[len(prefix) :]
                if suffix.isdigit():
                    questions.add(int(suffix))
                break

    return SchemaResponse(
        features=features,
        demographic_features=demographic,
        performance_features=performance,
        questions=sorted(questions),
        measures=measures,
    )
