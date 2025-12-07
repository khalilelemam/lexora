import os

os.environ["SKIP_MODEL_LOADING"] = "false"

import numpy as np
import pytest

from app.schemas import GazePoint


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


@pytest.fixture
def sample_gaze_points():
    """Basic sample gaze points for integration tests."""
    points = []
    base_timestamp = 1000000

    for i in range(100):
        points.append(
            GazePoint(
                fixation_x=0.3 + (i * 0.005) % 0.4,
                fixation_y=0.45 + (i * 0.002) % 0.1,
                timestamp=base_timestamp + (i * 180000),
            )
        )
    return points


@pytest.fixture
def reading_pattern_gaze_points():
    """
    Gaze points simulating realistic reading behavior.

    Mimics patterns from ETDD70 dataset:
    - Left-to-right saccades
    - Occasional regressions (10%)
    - Line breaks when reaching right edge
    - Fixation durations 100-400ms
    """
    np.random.seed(42)
    points = []
    base_timestamp = 1000000
    x, y = 0.1, 0.3
    current_time = base_timestamp

    for i in range(150):
        # Fixation duration 100-400ms in microseconds
        duration = int(np.random.uniform(100, 400) * 1000)

        if np.random.random() < 0.1:  # 10% regression
            x = max(0.05, x - np.random.uniform(0.05, 0.15))
        elif x > 0.85:  # Line break
            x = 0.1 + np.random.uniform(0, 0.05)
            y = min(0.9, y + np.random.uniform(0.08, 0.12))
        else:  # Forward saccade
            x += np.random.uniform(0.02, 0.08)

        y_jitter = np.random.uniform(-0.01, 0.01)
        y = np.clip(y + y_jitter, 0.1, 0.9)

        points.append(
            GazePoint(
                fixation_x=np.clip(x, 0.0, 1.0),
                fixation_y=y,
                timestamp=current_time,
            )
        )
        current_time += duration

    return points
