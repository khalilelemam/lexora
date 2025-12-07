import os
import sys
from unittest.mock import MagicMock

import numpy as np
import pytest

# Mock TensorFlow/Keras for faster unit tests.
# Loading TensorFlow adds ~3-5 seconds overhead. Since unit tests mock the model
# anyway, we skip loading TensorFlow entirely.
# Set REAL_TF=1 for integration tests that need actual model inference.
if os.environ.get("REAL_TF") != "1":
    sys.modules["tensorflow"] = MagicMock()
    sys.modules["tensorflow.python"] = MagicMock()
    sys.modules["keras"] = MagicMock()
    sys.modules["keras.models"] = MagicMock()

from app.schemas import GazePoint, GazeSequence, PredictionRequest


def create_gaze_points(
    count: int = 50,
    start_timestamp: int = 1000000,
    reading_pattern: bool = False,
) -> list[GazePoint]:
    """
    Generate synthetic gaze points for testing.

    Args:
        count: Number of gaze points to generate
        start_timestamp: Starting timestamp in microseconds
        reading_pattern: If True, generates left-to-right reading pattern with
                        occasional regressions. If False, generates simple
                        linear progression.

    Timestamps are always monotonically increasing with durations 150-350ms.
    """
    points = []
    current_time = start_timestamp
    x, y = 0.1, 0.3

    for i in range(count):
        if reading_pattern:
            # Simulate reading: mostly left-to-right with line breaks
            if i > 0 and np.random.random() < 0.1:  # 10% regression
                x = max(0.05, x - np.random.uniform(0.02, 0.08))
            elif x > 0.85:  # Line break
                x = 0.1 + np.random.uniform(0, 0.05)
                y = min(0.9, y + np.random.uniform(0.08, 0.12))
            else:  # Normal forward saccade
                x += np.random.uniform(0.02, 0.06)

            y_jitter = np.random.uniform(-0.005, 0.005)
            y = np.clip(y + y_jitter, 0.1, 0.9)
        else:
            # Simple linear progression for basic tests
            x = 0.1 + (i * 0.008) % 0.8
            y = 0.3 + (i * 0.003) % 0.4

        points.append(
            GazePoint(
                fixation_x=np.clip(x, 0.0, 1.0),
                fixation_y=np.clip(y, 0.0, 1.0),
                timestamp=current_time,
            )
        )

        # Duration 150-350ms in microseconds (valid range for fixation filtering)
        duration_us = int(np.random.uniform(150, 350) * 1000)
        current_time += duration_us

    return points


@pytest.fixture
def gaze_points_50() -> list[GazePoint]:
    """50 gaze points with realistic reading pattern."""
    np.random.seed(42)
    return create_gaze_points(50, reading_pattern=True)


@pytest.fixture
def gaze_points_100() -> list[GazePoint]:
    """100 gaze points with realistic reading pattern."""
    np.random.seed(42)
    return create_gaze_points(100, reading_pattern=True)


@pytest.fixture
def gaze_sequence(gaze_points_50) -> GazeSequence:
    return GazeSequence(gaze_points=gaze_points_50)


@pytest.fixture
def prediction_request(gaze_sequence) -> PredictionRequest:
    return PredictionRequest(
        syllables_task=gaze_sequence,
        meaningful_task=gaze_sequence,
        pseudo_task=gaze_sequence,
        screen_width=1920,
        screen_height=1080,
    )


# Descriptive aliases for schema validation tests
@pytest.fixture
def valid_gaze_points(gaze_points_50) -> list[GazePoint]:
    return gaze_points_50


@pytest.fixture
def valid_gaze_sequence(gaze_sequence) -> GazeSequence:
    return gaze_sequence


@pytest.fixture
def valid_prediction_request(prediction_request) -> PredictionRequest:
    return prediction_request
