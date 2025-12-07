"""
Integration tests - use real TensorFlow/Keras model.

Run with: REAL_TF=1 pytest tests/integration/ -v

These tests verify the full pipeline with actual model inference,
unlike unit tests which mock the ML components.
"""

import numpy as np
import pytest
from starlette.testclient import TestClient

from app.api import create_app
from app.config import settings
from app.schemas import GazePoint


class TestModelLoading:

    def test_model_loads_successfully(self, real_model_service):
        assert real_model_service.model is not None
        assert real_model_service.is_loaded()

    def test_model_architecture_has_three_inputs(self, real_model_service):
        """Model expects syllables, meaningful, and pseudo task inputs."""
        model = real_model_service.model
        assert len(model.inputs) == 3


class TestFeatureEngineering:

    def test_scaler_loads(self, real_feature_engineer):
        assert real_feature_engineer.scaler is not None

    def test_output_shape(self, real_feature_engineer, sample_gaze_points):
        result = real_feature_engineer.process_gaze_points(
            sample_gaze_points, screen_width=1920, screen_height=1080
        )
        assert result.shape == (100, 20, 5)

    def test_output_contains_no_nan_or_inf(
        self, real_feature_engineer, sample_gaze_points
    ):
        result = real_feature_engineer.process_gaze_points(
            sample_gaze_points, screen_width=1920, screen_height=1080
        )
        assert not np.isnan(result).any()
        assert not np.isinf(result).any()


class TestPrediction:

    def test_prediction_output_range(self, real_model_service):
        np.random.seed(42)
        dummy = np.random.randn(
            settings.MAX_SEQUENCES, settings.SEQUENCE_LENGTH, 5
        ).astype(np.float32)

        prob, conf, n = real_model_service.predict(dummy, dummy, dummy)

        assert 0.0 <= prob <= 1.0
        assert 0.0 <= conf <= 1.0
        assert n == settings.MAX_SEQUENCES * 3

    def test_prediction_is_deterministic(self, real_model_service):
        """Same input should always produce same output."""
        np.random.seed(42)
        dummy = np.random.randn(
            settings.MAX_SEQUENCES, settings.SEQUENCE_LENGTH, 5
        ).astype(np.float32)

        result1 = real_model_service.predict(dummy, dummy, dummy)
        result2 = real_model_service.predict(dummy, dummy, dummy)

        assert result1[0] == result2[0]


class TestFullPipeline:
    """End-to-end tests through the complete prediction pipeline."""

    def test_full_prediction_flow(
        self, real_model_service, real_feature_engineer, sample_gaze_points
    ):
        syllables = real_feature_engineer.process_gaze_points(
            sample_gaze_points, 1920, 1080
        )
        meaningful = real_feature_engineer.process_gaze_points(
            sample_gaze_points, 1920, 1080
        )
        pseudo = real_feature_engineer.process_gaze_points(
            sample_gaze_points, 1920, 1080
        )

        prob, conf, n = real_model_service.predict(syllables, meaningful, pseudo)

        assert 0.0 <= prob <= 1.0
        assert 0.0 <= conf <= 1.0
        assert n == 300

        risk = real_model_service.get_risk_level(prob)
        assert risk in ["low", "medium", "high"]

    def test_reading_pattern_produces_valid_prediction(
        self, real_model_service, real_feature_engineer, reading_pattern_gaze_points
    ):
        """
        Test with gaze points that simulate realistic reading behavior:
        left-to-right progression with regressions and line breaks.
        """
        sequences = real_feature_engineer.process_gaze_points(
            reading_pattern_gaze_points, 1680, 1050  # ETDD70 screen size
        )

        prob, conf, n = real_model_service.predict(sequences, sequences, sequences)

        assert 0.0 <= prob <= 1.0
        assert 0.0 <= conf <= 1.0

    def test_model_output_regression(self, real_model_service, real_feature_engineer):
        """
        Regression test with deterministic input to detect model changes.

        This test uses a fixed random seed to generate reproducible gaze data
        matching ETDD70 characteristics. If this test fails after a model update,
        the expected value should be reviewed and updated intentionally.

        ETDD70 characteristics:
        - Screen: 1680x1050
        - Fixation duration: 80-1000ms (filtered)
        - Features: [duration, x_norm, y_norm, amplitude_norm, velocity]
        """
        # Deterministic gaze data simulating a reading session
        np.random.seed(12345)
        points = []
        x, y = 0.15, 0.30
        current_time = 1000000

        for i in range(150):
            # Reading pattern: forward saccades with occasional regressions
            if np.random.random() < 0.08:  # 8% regression (dyslexia indicator)
                x = max(0.05, x - np.random.uniform(0.05, 0.12))
            elif x > 0.85:  # Line break
                x = 0.10 + np.random.uniform(0, 0.05)
                y = min(0.85, y + np.random.uniform(0.08, 0.12))
            else:  # Forward saccade
                x += np.random.uniform(0.03, 0.07)

            # Small vertical jitter
            y = np.clip(y + np.random.uniform(-0.008, 0.008), 0.1, 0.9)

            points.append(
                GazePoint(
                    fixation_x=np.clip(x, 0.0, 1.0),
                    fixation_y=y,
                    timestamp=current_time,
                )
            )
            # Fixation duration 150-350ms (within valid 80-1000ms range)
            current_time += int(np.random.uniform(150, 350) * 1000)

        # Process through feature engineering
        sequences = real_feature_engineer.process_gaze_points(points, 1680, 1050)

        # Run prediction
        prob, conf, n = real_model_service.predict(sequences, sequences, sequences)

        # Regression assertion - update this value if model is intentionally changed
        # Current model output for this deterministic input:
        expected_prob = 0.034  # Low probability = non-dyslexic reading pattern
        tolerance = 0.01

        assert abs(prob - expected_prob) < tolerance, (
            f"Model output changed! Expected ~{expected_prob}, got {prob}. "
            f"If this is intentional (model update), update expected_prob."
        )


class TestAPIEndpoint:

    @pytest.fixture
    def client(self):
        app = create_app()
        with TestClient(app) as client:
            yield client

    def test_health_endpoint(self, client):
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["modelsLoaded"] is True

    def test_predict_endpoint_returns_valid_response(self, client, sample_gaze_points):
        request_data = {
            "syllables_task": {"gaze_points": _points_to_dict(sample_gaze_points)},
            "meaningful_task": {"gaze_points": _points_to_dict(sample_gaze_points)},
            "pseudo_task": {"gaze_points": _points_to_dict(sample_gaze_points)},
            "screen_width": 1920,
            "screen_height": 1080,
        }

        response = client.post("/predict", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert "dyslexiaProbability" in data
        assert "riskLevel" in data
        assert "confidence" in data
        assert 0.0 <= data["dyslexiaProbability"] <= 1.0
        assert data["riskLevel"] in ["low", "medium", "high"]

    def test_predict_endpoint_with_camel_case_input(self, client, sample_gaze_points):
        """API should accept camelCase field names."""
        request_data = {
            "syllablesTask": {"gaze_points": _points_to_dict(sample_gaze_points)},
            "meaningfulTask": {"gaze_points": _points_to_dict(sample_gaze_points)},
            "pseudoTask": {"gaze_points": _points_to_dict(sample_gaze_points)},
            "screenWidth": 1920,
            "screenHeight": 1080,
        }

        response = client.post("/predict", json=request_data)

        assert response.status_code == 200


def _points_to_dict(points):
    """Helper to convert GazePoint objects to dicts for API requests."""
    return [
        {
            "fixation_x": p.fixation_x,
            "fixation_y": p.fixation_y,
            "timestamp": p.timestamp,
        }
        for p in points
    ]
