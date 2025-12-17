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
from tests.fixtures.loader import load_case, load_case_all_tasks


class TestModelLoading:

    def test_model_loads_successfully(self, real_eye_tracker_prediction):
        assert real_eye_tracker_prediction.model is not None
        assert real_eye_tracker_prediction.is_loaded()

    def test_model_architecture_has_three_inputs(self, real_eye_tracker_prediction):
        """Model expects syllables, meaningful, and pseudo task inputs."""
        model = real_eye_tracker_prediction.model
        assert len(model.inputs) == 3


class TestFeatureEngineering:

    def test_scaler_loads(self, real_eye_tracker_features):
        assert real_eye_tracker_features.scaler is not None

    def test_output_shape(self, real_eye_tracker_features):
        points = load_case("tn-1209", "meaningful-text")
        result = real_eye_tracker_features.process_gaze_points(
            points, screen_width=1680, screen_height=1050
        )
        assert result.shape == (100, 20, 5)

    def test_output_contains_no_nan_or_inf(self, real_eye_tracker_features):
        points = load_case("tn-1209", "meaningful-text")
        result = real_eye_tracker_features.process_gaze_points(
            points, screen_width=1680, screen_height=1050
        )
        assert not np.isnan(result).any()
        assert not np.isinf(result).any()


class TestPrediction:

    def test_prediction_output_range(self, real_eye_tracker_prediction):
        np.random.seed(42)
        dummy = np.random.randn(
            settings.EYE_TRACKER_MAX_SEQUENCES, settings.EYE_TRACKER_SEQUENCE_LENGTH, 5
        ).astype(np.float32)

        result = real_eye_tracker_prediction.predict(dummy, dummy, dummy)

        assert 0.0 <= result["dyslexia_probability"] <= 1.0
        assert 0.0 <= result["confidence"] <= 1.0
        assert result["sequences_analyzed"] == settings.EYE_TRACKER_MAX_SEQUENCES * 3

    def test_prediction_is_deterministic(self, real_eye_tracker_prediction):
        """Same input should always produce same output."""
        np.random.seed(42)
        dummy = np.random.randn(
            settings.EYE_TRACKER_MAX_SEQUENCES, settings.EYE_TRACKER_SEQUENCE_LENGTH, 5
        ).astype(np.float32)

        result1 = real_eye_tracker_prediction.predict(dummy, dummy, dummy)
        result2 = real_eye_tracker_prediction.predict(dummy, dummy, dummy)

        assert result1["dyslexia_probability"] == result2["dyslexia_probability"]


class TestFullPipeline:
    """End-to-end tests with real ETDD70 dataset cases."""

    def test_true_positive_dyslexic_classification(
        self, real_eye_tracker_prediction, real_eye_tracker_features
    ):
        """TP-1174: Dyslexic participant should be classified as high risk."""
        tasks = load_case_all_tasks("tp-1174")

        syl = real_eye_tracker_features.process_gaze_points(
            tasks["syllables"], 1680, 1050
        )
        mean = real_eye_tracker_features.process_gaze_points(
            tasks["meaningful"], 1680, 1050
        )
        pseudo = real_eye_tracker_features.process_gaze_points(
            tasks["pseudo"], 1680, 1050
        )

        result = real_eye_tracker_prediction.predict(syl, mean, pseudo)
        prob = result["dyslexia_probability"]
        risk = result["risk_level"]

        assert 0.0 <= prob <= 1.0
        assert 0.0 <= result["confidence"] <= 1.0
        assert (
            risk == "high"
        ), f"Expected high risk for dyslexic case, got {risk} (prob={prob})"
        assert prob > 0.66, f"Dyslexic probability should be >0.66, got {prob}"

    def test_true_negative_non_dyslexic_classification(
        self, real_eye_tracker_prediction, real_eye_tracker_features
    ):
        """TN-1209: Non-dyslexic participant should be classified as low risk."""
        tasks = load_case_all_tasks("tn-1209")

        syl = real_eye_tracker_features.process_gaze_points(
            tasks["syllables"], 1680, 1050
        )
        mean = real_eye_tracker_features.process_gaze_points(
            tasks["meaningful"], 1680, 1050
        )
        pseudo = real_eye_tracker_features.process_gaze_points(
            tasks["pseudo"], 1680, 1050
        )

        result = real_eye_tracker_prediction.predict(syl, mean, pseudo)
        prob = result["dyslexia_probability"]
        risk = result["risk_level"]

        assert 0.0 <= prob <= 1.0
        assert 0.0 <= result["confidence"] <= 1.0
        assert (
            risk == "low"
        ), f"Expected low risk for non-dyslexic case, got {risk} (prob={prob})"
        assert prob < 0.33, f"Non-dyslexic probability should be <0.33, got {prob}"

    def test_false_positive_edge_case(
        self, real_eye_tracker_prediction, real_eye_tracker_features
    ):
        """FP-1065: Non-dyslexic misclassified as high risk (edge case)."""
        tasks = load_case_all_tasks("fp-1065")

        syl = real_eye_tracker_features.process_gaze_points(
            tasks["syllables"], 1680, 1050
        )
        mean = real_eye_tracker_features.process_gaze_points(
            tasks["meaningful"], 1680, 1050
        )
        pseudo = real_eye_tracker_features.process_gaze_points(
            tasks["pseudo"], 1680, 1050
        )

        result = real_eye_tracker_prediction.predict(syl, mean, pseudo)
        prob = result["dyslexia_probability"]

        assert 0.0 <= prob <= 1.0
        assert 0.0 <= result["confidence"] <= 1.0
        assert prob > 0.66, f"FP case should have high probability, got {prob}"


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
        assert data["status"] == "ok"
        assert "version" in data

    def test_predict_eye_tracker_endpoint_with_dyslexic_case(self, client):
        """API should classify TP-1174 as high risk."""
        tasks = load_case_all_tasks("tp-1174")
        request_data = {
            "syllablesTask": {"gaze_points": _points_to_dict(tasks["syllables"])},
            "meaningfulTask": {"gaze_points": _points_to_dict(tasks["meaningful"])},
            "pseudoTask": {"gaze_points": _points_to_dict(tasks["pseudo"])},
            "screenWidth": 1680,
            "screenHeight": 1050,
        }

        response = client.post("/v1/eye-tracker/predict", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["riskLevel"] == "high"
        assert data["dyslexiaProbability"] > 0.66
        assert "confidence" in data
        assert "metadata" in data

    def test_predict_eye_tracker_endpoint_with_non_dyslexic_case(self, client):
        """API should classify TN-1209 as low risk."""
        tasks = load_case_all_tasks("tn-1209")
        request_data = {
            "syllablesTask": {"gaze_points": _points_to_dict(tasks["syllables"])},
            "meaningfulTask": {"gaze_points": _points_to_dict(tasks["meaningful"])},
            "pseudoTask": {"gaze_points": _points_to_dict(tasks["pseudo"])},
            "screenWidth": 1680,
            "screenHeight": 1050,
        }

        response = client.post("/v1/eye-tracker/predict", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["riskLevel"] == "low"
        assert data["dyslexiaProbability"] < 0.33


def _points_to_dict(points):
    return [
        {
            "fixation_x": p.fixation_x,
            "fixation_y": p.fixation_y,
            "timestamp": p.timestamp,
        }
        for p in points
    ]
