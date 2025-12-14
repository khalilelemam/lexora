import os

os.environ["SKIP_MODEL_LOADING"] = "false"

import pytest


@pytest.fixture(scope="module")
def real_model_service():
    """Real ModelService with actual Keras model loaded."""
    from app.services.model_service import ModelService

    try:
        service = ModelService()
        yield service
    except Exception as e:
        pytest.skip(f"Could not load model: {e}")


@pytest.fixture(scope="module")
def real_feature_engineer():
    """Real FeatureEngineer with actual scaler loaded."""
    from app.services.feature_engineer import FeatureEngineer

    try:
        engineer = FeatureEngineer()
        yield engineer
    except Exception as e:
        pytest.skip(f"Could not load feature engineer: {e}")
