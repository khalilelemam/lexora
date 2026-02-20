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
    sys.modules["tensorflow.keras"] = MagicMock()
    sys.modules["tensorflow.keras.models"] = MagicMock()
    sys.modules["keras"] = MagicMock()
    sys.modules["keras.models"] = MagicMock()

from app.schemas import GazePoint, GazeSequence, PredictionRequest
from app.schemas.webcam import RawGazePoint


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


def create_raw_gaze_points(
    count: int = 100,
    start_timestamp: int = 1000,
    screen_width: int = 1920,
    screen_height: int = 1080,
) -> list[RawGazePoint]:
    """
    Generate synthetic raw gaze points for webcam testing.

    Args:
        count: Number of gaze points to generate
        start_timestamp: Starting timestamp in milliseconds
        screen_width: Screen width in pixels
        screen_height: Screen height in pixels

    Points are generated with ~16ms intervals (60fps) simulating webcam capture.
    Generates clear fixation-saccade patterns suitable for I-VT algorithm testing.

    For the model to work properly, we need sufficient fixations:
    - Each fixation must be >= 50ms (min 4 points at 16ms)
    - Model needs 20 + (n-1)*5 fixations for n sequences
    - For 82 sequences: 425 fixations needed
    - ~2000 raw points generates ~300+ fixations
    """
    points = []
    current_time = start_timestamp

    # Reading simulation: move across lines
    line_y_positions = [0.25, 0.35, 0.45, 0.55, 0.65, 0.75]
    current_line = 0
    x_progress = 0.15  # Start left side

    i = 0
    while i < count:
        # Current fixation position
        fixation_x = x_progress * screen_width
        fixation_y = (
            line_y_positions[current_line % len(line_y_positions)] * screen_height
        )

        # Generate 5-8 points per fixation (80-128ms at 16ms/point)
        # This ensures fixations pass the 50ms minimum threshold
        fixation_points = np.random.randint(5, 9)

        for _ in range(min(fixation_points, count - i)):
            # Add small jitter within fixation
            jitter_x = np.random.uniform(-2, 2)
            jitter_y = np.random.uniform(-2, 2)

            points.append(
                RawGazePoint(
                    x=np.clip(fixation_x + jitter_x, 0, screen_width),
                    y=np.clip(fixation_y + jitter_y, 0, screen_height),
                    timestamp=current_time,
                )
            )
            current_time += 16  # 16ms interval (60fps)
            i += 1

        # Saccade to next position
        x_progress += np.random.uniform(0.06, 0.12)  # 6-12% of screen width per saccade

        # End of line - move to next line
        if x_progress > 0.85:
            x_progress = 0.15 + np.random.uniform(-0.02, 0.02)
            current_line += 1

        # Occasional regression (10% chance)
        if np.random.random() < 0.1:
            x_progress = max(0.15, x_progress - np.random.uniform(0.05, 0.15))

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
def gaze_sequence(gaze_points_50: list[GazePoint]) -> GazeSequence:
    return GazeSequence(gaze_points=gaze_points_50)


@pytest.fixture
def prediction_request(gaze_sequence: GazeSequence) -> PredictionRequest:
    return PredictionRequest(
        syllables_task=gaze_sequence,
        meaningful_task=gaze_sequence,
        pseudo_task=gaze_sequence,
        screen_width=1920,
        screen_height=1080,
    )


# Descriptive aliases for schema validation tests
@pytest.fixture
def valid_gaze_points(gaze_points_50: list[GazePoint]) -> list[GazePoint]:
    return gaze_points_50


@pytest.fixture
def valid_gaze_sequence(gaze_sequence: GazeSequence) -> GazeSequence:
    return gaze_sequence


@pytest.fixture
def valid_prediction_request(
    prediction_request: PredictionRequest,
) -> PredictionRequest:
    return prediction_request
